# PowerShell script to split polygon into 3 equal-area parts: East, North-West, South-West
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$json = Get-Content $inputFile -Raw | ConvertFrom-Json

# Extract coordinates from the FeatureCollection
$coords = $json.features[0].geometry.coordinates[0]

# Calculate bounds
$lons = $coords | ForEach-Object { $_[0] }
$lats = $coords | ForEach-Object { $_[1] }
$minLon = ($lons | Measure-Object -Minimum).Minimum
$maxLon = ($lons | Measure-Object -Maximum).Maximum
$minLat = ($lats | Measure-Object -Minimum).Minimum
$maxLat = ($lats | Measure-Object -Maximum).Maximum
$lonRange = $maxLon - $minLon
$latRange = $maxLat - $minLat

Write-Host "Bounds: Lon [$minLon, $maxLon], Lat [$minLat, $maxLat]"

# Function to calculate polygon area (using Shoelace formula)
function Get-PolygonArea {
    param($points)
    
    $area = 0.0
    for ($i = 0; $i -lt $points.Count - 1; $i++) {
        $area += $points[$i][0] * $points[$i + 1][1]
        $area -= $points[$i + 1][0] * $points[$i][1]
    }
    return [Math]::Abs($area) / 2.0
}

# Function to calculate intersection point
function Get-Intersection {
    param($p1, $p2, $splitValue, $axis)
    
    $idx = if ($axis -eq 'lat') { 1 } else { 0 }
    $otherIdx = if ($axis -eq 'lat') { 0 } else { 1 }
    
    if ([Math]::Abs($p2[$idx] - $p1[$idx]) -lt 0.0000001) { return $null }
    
    $t = ($splitValue - $p1[$idx]) / ($p2[$idx] - $p1[$idx])
    
    $result = @(0, 0)
    $result[$idx] = $splitValue
    $result[$otherIdx] = $p1[$otherIdx] + $t * ($p2[$otherIdx] - $p1[$otherIdx])
    
    return $result
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
            $intersection = Get-Intersection $curr $next $splitLon 'lon'
            if ($intersection) {
                $westPts += , $intersection
                $eastPts += , $intersection
            }
        }
    }
    
    return @($westPts, $eastPts)
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
            $intersection = Get-Intersection $curr $next $splitLat 'lat'
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
Write-Host "Target area per district: $targetArea"

# Step 1: Split by longitude into East and West
Write-Host "`nStep 1: Finding longitude split for East vs West..."
$lonSplit = $minLon + $lonRange * 0.5
$bestLonSplit = $lonSplit
$bestDiff = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLongitude $coords $lonSplit
    $westArea = Get-PolygonArea (Close-Polygon $result[0])
    $eastArea = Get-PolygonArea (Close-Polygon $result[1])
    
    # East should be ~1/3, West should be ~2/3
    $diff = [Math]::Abs($eastArea - $targetArea)
    
    if ($diff -lt $bestDiff) {
        $bestDiff = $diff
        $bestLonSplit = $lonSplit
    }
    
    if ($eastArea -gt $targetArea) {
        $lonSplit -= $lonRange * 0.02
    }
    else {
        $lonSplit += $lonRange * 0.02
    }
}

$lonSplit = $bestLonSplit
Write-Host "Best longitude split: $lonSplit"

# Split into East and West
$splitResult = Split-ByLongitude $coords $lonSplit
$westPts = $splitResult[0]
$eastPts = Close-Polygon $splitResult[1]

$eastArea = Get-PolygonArea $eastPts
Write-Host "East area: $eastArea ($(($eastArea/$totalArea*100).ToString('F2'))%)"

# Step 2: Split West into North-West and South-West
Write-Host "`nStep 2: Finding latitude split for North-West vs South-West..."
$latSplit = $minLat + $latRange * 0.5
$bestLatSplit = $latSplit
$bestDiff = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLatitude $westPts $latSplit
    $southWestArea = Get-PolygonArea (Close-Polygon $result[0])
    $northWestArea = Get-PolygonArea (Close-Polygon $result[1])
    
    # Both should be ~1/3 of total
    $diff = [Math]::Abs($southWestArea - $targetArea) + [Math]::Abs($northWestArea - $targetArea)
    
    if ($diff -lt $bestDiff) {
        $bestDiff = $diff
        $bestLatSplit = $latSplit
    }
    
    if ($southWestArea -gt $targetArea) {
        $latSplit += $latRange * 0.02
    }
    else {
        $latSplit -= $latRange * 0.02
    }
}

$latSplit = $bestLatSplit
Write-Host "Best latitude split: $latSplit"

# Split West into North-West and South-West
$splitResult = Split-ByLatitude $westPts $latSplit
$southWestPts = Close-Polygon $splitResult[0]
$northWestPts = Close-Polygon $splitResult[1]

$southWestArea = Get-PolygonArea $southWestPts
$northWestArea = Get-PolygonArea $northWestPts

# Summary
Write-Host "`n=== FINAL AREAS ==="
Write-Host "East:       $eastArea ($(($eastArea/$totalArea*100).ToString('F2'))%)"
Write-Host "North-West: $northWestArea ($(($northWestArea/$totalArea*100).ToString('F2'))%)"
Write-Host "South-West: $southWestArea ($(($southWestArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Total:      $($eastArea + $northWestArea + $southWestArea) (should be $totalArea)"

# Create compact JSON (single line, no spaces)
function ConvertTo-CompactJson {
    param($obj)
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    return $json
}

# Save outputs as compact JSON
$eastJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $eastPts)
}
$eastJson | Out-File "east_district.json" -Encoding UTF8 -NoNewline

$northWestJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $northWestPts)
}
$northWestJson | Out-File "northwest_district.json" -Encoding UTF8 -NoNewline

$southWestJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $southWestPts)
}
$southWestJson | Out-File "southwest_district.json" -Encoding UTF8 -NoNewline

Write-Host "`nAll 3 districts created successfully (compact format)!"
Write-Host "- east_district.json"
Write-Host "- northwest_district.json"
Write-Host "- southwest_district.json"