# PowerShell script to split polygon horizontally into 3 equal-area parts: Top, Middle, Bottom
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
$latRange = $maxLat - $minLat

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

# Function to calculate intersection point with horizontal line
function Get-Intersection {
    param($p1, $p2, $splitLat)
    
    $lat1 = $p1[1]
    $lat2 = $p2[1]
    
    if ([Math]::Abs($lat2 - $lat1) -lt 0.0000001) { return $null }
    
    $t = ($splitLat - $lat1) / ($lat2 - $lat1)
    
    if ($t -lt 0 -or $t -gt 1) { return $null }
    
    $lon = $p1[0] + $t * ($p2[0] - $p1[0])
    
    return @($lon, $splitLat)
}

# Function to split polygon by a latitude line
function Split-ByLatitude {
    param($coords, $splitLat)
    
    $southPts = @()
    $northPts = @()
    
    for ($i = 0; $i -lt $coords.Count; $i++) {
        $curr = $coords[$i]
        $next = $coords[($i + 1) % $coords.Count]
        
        if ($curr[1] -le $splitLat) { $southPts += , @($curr[0], $curr[1]) }
        if ($curr[1] -ge $splitLat) { $northPts += , @($curr[0], $curr[1]) }
        
        if (($curr[1] -lt $splitLat -and $next[1] -gt $splitLat) -or 
            ($curr[1] -gt $splitLat -and $next[1] -lt $splitLat)) {
            $intersection = Get-Intersection $curr $next $splitLat
            if ($intersection) {
                $southPts += , $intersection
                $northPts += , $intersection
            }
        }
    }
    
    return @($southPts, $northPts)
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

# Step 1: Find first horizontal split (bottom third)
Write-Host "`nStep 1: Finding first latitude split for bottom third..."
$lat1 = $minLat + $latRange * 0.33
$bestLat1 = $lat1
$bestDiff1 = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLatitude $coords $lat1
    $bottomArea = Get-PolygonArea (Close-Polygon $result[0])
    
    $diff = [Math]::Abs($bottomArea - $targetArea)
    
    if ($diff -lt $bestDiff1) {
        $bestDiff1 = $diff
        $bestLat1 = $lat1
    }
    
    if ($bottomArea -gt $targetArea) {
        $lat1 -= $latRange * 0.01
    }
    else {
        $lat1 += $latRange * 0.01
    }
}

$lat1 = $bestLat1
Write-Host "First split latitude: $lat1"

# Split into bottom and upper
$splitResult1 = Split-ByLatitude $coords $lat1
$bottomPts = Close-Polygon $splitResult1[0]
$upperPts = $splitResult1[1]

$bottomArea = Get-PolygonArea $bottomPts
Write-Host "Bottom area: $bottomArea ($(($bottomArea/$totalArea*100).ToString('F2'))%)"

# Step 2: Find second horizontal split (middle third from upper part)
Write-Host "`nStep 2: Finding second latitude split for middle third..."
$lat2 = $lat1 + $latRange * 0.33
$bestLat2 = $lat2
$bestDiff2 = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLatitude $upperPts $lat2
    $middleArea = Get-PolygonArea (Close-Polygon $result[0])
    
    $diff = [Math]::Abs($middleArea - $targetArea)
    
    if ($diff -lt $bestDiff2) {
        $bestDiff2 = $diff
        $bestLat2 = $lat2
    }
    
    if ($middleArea -gt $targetArea) {
        $lat2 -= $latRange * 0.01
    }
    else {
        $lat2 += $latRange * 0.01
    }
}

$lat2 = $bestLat2
Write-Host "Second split latitude: $lat2"

# Split upper into middle and top
$splitResult2 = Split-ByLatitude $upperPts $lat2
$middlePts = Close-Polygon $splitResult2[0]
$topPts = Close-Polygon $splitResult2[1]

$middleArea = Get-PolygonArea $middlePts
$topArea = Get-PolygonArea $topPts

# Summary
Write-Host "`n=== FINAL AREAS ==="
Write-Host "Bottom: $bottomArea ($(($bottomArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Middle: $middleArea ($(($middleArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Top:    $topArea ($(($topArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Total:  $($bottomArea + $middleArea + $topArea) (should be $totalArea)"

# Create compact JSON (single line, no spaces)
function ConvertTo-CompactJson {
    param($obj)
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    return $json
}

# Save outputs as compact JSON
$bottomJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $bottomPts)
}
$bottomJson | Out-File "bottom_part.json" -Encoding UTF8 -NoNewline

$middleJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $middlePts)
}
$middleJson | Out-File "middle_part.json" -Encoding UTF8 -NoNewline

$topJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $topPts)
}
$topJson | Out-File "top_part.json" -Encoding UTF8 -NoNewline

Write-Host "`nAll 3 parts created successfully (compact format)!"
Write-Host "- bottom_part.json"
Write-Host "- middle_part.json"
Write-Host "- top_part.json"