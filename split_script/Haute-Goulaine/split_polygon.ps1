# PowerShell script to split polygon vertically into 3 equal-area parts: Left, Center, Right
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$json = Get-Content $inputFile -Raw | ConvertFrom-Json

# Extract coordinates - handle both FeatureCollection and direct Polygon
if ($json.type -eq "FeatureCollection") {
    $coords = $json.features[0].geometry.coordinates[0]
}
elseif ($json.type -eq "Polygon") {
    $coords = $json.coordinates[0]
}
else {
    Write-Host "Error: Unsupported GeoJSON type"
    exit
}

# Calculate bounds
$lons = $coords | ForEach-Object { $_[0] }
$lats = $coords | ForEach-Object { $_[1] }
$minLon = ($lons | Measure-Object -Minimum).Minimum
$maxLon = ($lons | Measure-Object -Maximum).Maximum
$minLat = ($lats | Measure-Object -Minimum).Minimum
$maxLat = ($lats | Measure-Object -Maximum).Maximum
$lonRange = $maxLon - $minLon

Write-Host "Bounds: Lon [$minLon, $maxLon], Lat [$minLat, $maxLat]"

# Function to calculate polygon area (using Shoelace formula)
function Get-PolygonArea {
    param($points)
    
    if ($points.Count -lt 3) { return 0.0 }
    
    $area = 0.0
    for ($i = 0; $i -lt $points.Count - 1; $i++) {
        $area += $points[$i][0] * $points[$i + 1][1]
        $area -= $points[$i + 1][0] * $points[$i][1]
    }
    return [Math]::Abs($area) / 2.0
}

# Function to calculate intersection point with vertical line
function Get-Intersection {
    param($p1, $p2, $splitLon)
    
    $lon1 = $p1[0]
    $lon2 = $p2[0]
    
    if ([Math]::Abs($lon2 - $lon1) -lt 0.0000001) { return $null }
    
    $t = ($splitLon - $lon1) / ($lon2 - $lon1)
    
    if ($t -lt 0 -or $t -gt 1) { return $null }
    
    $lat = $p1[1] + $t * ($p2[1] - $p1[1])
    
    return @($splitLon, $lat)
}

# Function to split polygon by a longitude line
function Split-ByLongitude {
    param($coords, $splitLon)
    
    $westPts = @()
    $eastPts = @()
    
    for ($i = 0; $i -lt $coords.Count; $i++) {
        $curr = $coords[$i]
        $next = $coords[($i + 1) % $coords.Count]
        
        if ($curr[0] -le $splitLon) { $westPts += , @($curr[0], $curr[1]) }
        if ($curr[0] -ge $splitLon) { $eastPts += , @($curr[0], $curr[1]) }
        
        if (($curr[0] -lt $splitLon -and $next[0] -gt $splitLon) -or 
            ($curr[0] -gt $splitLon -and $next[0] -lt $splitLon)) {
            $intersection = Get-Intersection $curr $next $splitLon
            if ($intersection) {
                $westPts += , $intersection
                $eastPts += , $intersection
            }
        }
    }
    
    return @($westPts, $eastPts)
}

# Function to close polygon
function Close-Polygon {
    param($points)
    if ($points.Count -gt 0) {
        $first = $points[0]
        $last = $points[-1]
        if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
            return $points + , @($first[0], $first[1])
        }
    }
    return $points
}

# Calculate total area
$totalArea = Get-PolygonArea $coords
$targetArea = $totalArea / 3.0

Write-Host "Total area: $totalArea"
Write-Host "Target area per part: $targetArea"

# Step 1: Find first vertical split (left third)
Write-Host "`nStep 1: Finding first longitude split for left third..."
$lon1 = $minLon + $lonRange * 0.33
$bestLon1 = $lon1
$bestDiff1 = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLongitude $coords $lon1
    $leftArea = Get-PolygonArea (Close-Polygon $result[0])
    
    $diff = [Math]::Abs($leftArea - $targetArea)
    
    if ($diff -lt $bestDiff1) {
        $bestDiff1 = $diff
        $bestLon1 = $lon1
    }
    
    if ($leftArea -gt $targetArea) {
        $lon1 -= $lonRange * 0.01
    }
    else {
        $lon1 += $lonRange * 0.01
    }
}

$lon1 = $bestLon1
Write-Host "First split longitude: $lon1"

# Split into left and remainder
$splitResult1 = Split-ByLongitude $coords $lon1
$leftPts = Close-Polygon $splitResult1[0]
$remainderPts = $splitResult1[1]

$leftArea = Get-PolygonArea $leftPts
Write-Host "Left area: $leftArea ($(($leftArea/$totalArea*100).ToString('F2'))%)"

# Step 2: Find second vertical split (center third from remainder)
Write-Host "`nStep 2: Finding second longitude split for center third..."
$lon2 = $lon1 + $lonRange * 0.33
$bestLon2 = $lon2
$bestDiff2 = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLongitude $remainderPts $lon2
    $centerArea = Get-PolygonArea (Close-Polygon $result[0])
    
    $diff = [Math]::Abs($centerArea - $targetArea)
    
    if ($diff -lt $bestDiff2) {
        $bestDiff2 = $diff
        $bestLon2 = $lon2
    }
    
    if ($centerArea -gt $targetArea) {
        $lon2 -= $lonRange * 0.01
    }
    else {
        $lon2 += $lonRange * 0.01
    }
}

$lon2 = $bestLon2
Write-Host "Second split longitude: $lon2"

# Split remainder into center and right
$splitResult2 = Split-ByLongitude $remainderPts $lon2
$centerPts = Close-Polygon $splitResult2[0]
$rightPts = Close-Polygon $splitResult2[1]

$centerArea = Get-PolygonArea $centerPts
$rightArea = Get-PolygonArea $rightPts

# Summary
Write-Host "`n=== FINAL AREAS ==="
Write-Host "Left:   $leftArea ($(($leftArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Center: $centerArea ($(($centerArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Right:  $rightArea ($(($rightArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Total:  $($leftArea + $centerArea + $rightArea) (should be $totalArea)"

# Create compact JSON (single line, no spaces)
function ConvertTo-CompactJson {
    param($obj)
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    return $json
}

# Save outputs as compact JSON
$leftJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $leftPts)
}
$leftJson | Out-File "left_part.json" -Encoding UTF8 -NoNewline

$centerJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $centerPts)
}
$centerJson | Out-File "center_part.json" -Encoding UTF8 -NoNewline

$rightJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $rightPts)
}
$rightJson | Out-File "right_part.json" -Encoding UTF8 -NoNewline

Write-Host "`nAll 3 parts created successfully (compact format)!"
Write-Host "- left_part.json"
Write-Host "- center_part.json"
Write-Host "- right_part.json"