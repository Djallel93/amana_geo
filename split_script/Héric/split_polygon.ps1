# PowerShell script to split polygon into 4 equal-area parts: Center-North, Center-South, East, West
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$polygon = Get-Content $inputFile | ConvertFrom-Json

$coords = $polygon.coordinates[0]

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
$targetArea = $totalArea / 4.0

Write-Host "Total area: $totalArea"
Write-Host "Target area per district: $targetArea"

# Step 1: Find longitude split for East/West that creates two halves
Write-Host "`nStep 1: Finding longitude split for East vs Center..."
$lonSplit = $minLon + $lonRange * 0.5
$bestLonSplit = $lonSplit
$bestDiff = [double]::MaxValue

for ($i = 0; $i -lt 20; $i++) {
    $result = Split-ByLongitude $coords $lonSplit
    $westArea = Get-PolygonArea (Close-Polygon $result[0])
    $eastArea = Get-PolygonArea (Close-Polygon $result[1])
    
    $diff = [Math]::Abs($westArea - $eastArea)
    
    if ($diff -lt $bestDiff) {
        $bestDiff = $diff
        $bestLonSplit = $lonSplit
    }
    
    # Adjust split based on which side is larger
    if ($westArea -gt $eastArea) {
        $lonSplit -= $lonRange * 0.05
    }
    else {
        $lonSplit += $lonRange * 0.05
    }
}

$lonSplit = $bestLonSplit
Write-Host "Best longitude split: $lonSplit"

# Split into East and Center-West
$splitResult = Split-ByLongitude $coords $lonSplit
$centerWestPts = Close-Polygon $splitResult[0]
$eastPts = Close-Polygon $splitResult[1]

$centerWestArea = Get-PolygonArea $centerWestPts
$eastArea = Get-PolygonArea $eastPts

Write-Host "Center-West area: $centerWestArea"
Write-Host "East area: $eastArea"

# Step 2: Find the longitude split for West from Center-West
Write-Host "`nStep 2: Finding longitude split for West vs Center..."
$westLonSplit = $minLon + ($lonSplit - $minLon) * 0.5
$bestWestLonSplit = $westLonSplit
$bestDiff = [double]::MaxValue

for ($i = 0; $i -lt 20; $i++) {
    $result = Split-ByLongitude $centerWestPts $westLonSplit
    $westArea = Get-PolygonArea (Close-Polygon $result[0])
    $centerArea = Get-PolygonArea (Close-Polygon $result[1])
    
    $diff = [Math]::Abs($westArea - $centerArea)
    
    if ($diff -lt $bestDiff) {
        $bestDiff = $diff
        $bestWestLonSplit = $westLonSplit
    }
    
    if ($westArea -gt $centerArea) {
        $westLonSplit -= ($lonSplit - $minLon) * 0.05
    }
    else {
        $westLonSplit += ($lonSplit - $minLon) * 0.05
    }
}

$westLonSplit = $bestWestLonSplit
Write-Host "Best west longitude split: $westLonSplit"

# Split Center-West into West and Center
$splitResult = Split-ByLongitude $centerWestPts $westLonSplit
$westPts = Close-Polygon $splitResult[0]
$centerPts = Close-Polygon $splitResult[1]

$westArea = Get-PolygonArea $westPts
$centerArea = Get-PolygonArea $centerPts

Write-Host "West area: $westArea"
Write-Host "Center area: $centerArea"

# Step 3: Split Center into Center-North and Center-South
Write-Host "`nStep 3: Finding latitude split for Center-North vs Center-South..."
$latSplit = $minLat + $latRange * 0.5
$bestLatSplit = $latSplit
$bestDiff = [double]::MaxValue

for ($i = 0; $i -lt 20; $i++) {
    $result = Split-ByLatitude $centerPts $latSplit
    $southArea = Get-PolygonArea (Close-Polygon $result[0])
    $northArea = Get-PolygonArea (Close-Polygon $result[1])
    
    $diff = [Math]::Abs($southArea - $northArea)
    
    if ($diff -lt $bestDiff) {
        $bestDiff = $diff
        $bestLatSplit = $latSplit
    }
    
    if ($southArea -gt $northArea) {
        $latSplit += $latRange * 0.05
    }
    else {
        $latSplit -= $latRange * 0.05
    }
}

$latSplit = $bestLatSplit
Write-Host "Best latitude split: $latSplit"

# Split Center into Center-North and Center-South
$splitResult = Split-ByLatitude $centerPts $latSplit
$centerSouthPts = Close-Polygon $splitResult[0]
$centerNorthPts = Close-Polygon $splitResult[1]

$centerSouthArea = Get-PolygonArea $centerSouthPts
$centerNorthArea = Get-PolygonArea $centerNorthPts

Write-Host "Center-South area: $centerSouthArea"
Write-Host "Center-North area: $centerNorthArea"

# Summary
Write-Host "`n=== FINAL AREAS ==="
Write-Host "West:         $westArea ($(($westArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Center-North: $centerNorthArea ($(($centerNorthArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Center-South: $centerSouthArea ($(($centerSouthArea/$totalArea*100).ToString('F2'))%)"
Write-Host "East:         $eastArea ($(($eastArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Total:        $($westArea + $centerNorthArea + $centerSouthArea + $eastArea)"

# Save outputs
@{
    type        = "Polygon"
    coordinates = @(, $westPts)
} | ConvertTo-Json -Depth 10 | Out-File "west_district.json" -Encoding UTF8

@{
    type        = "Polygon"
    coordinates = @(, $centerNorthPts)
} | ConvertTo-Json -Depth 10 | Out-File "center_north_district.json" -Encoding UTF8

@{
    type        = "Polygon"
    coordinates = @(, $centerSouthPts)
} | ConvertTo-Json -Depth 10 | Out-File "center_south_district.json" -Encoding UTF8

@{
    type        = "Polygon"
    coordinates = @(, $eastPts)
} | ConvertTo-Json -Depth 10 | Out-File "east_district.json" -Encoding UTF8

Write-Host "`nAll 4 districts created successfully!"
Write-Host "- west_district.json"
Write-Host "- center_north_district.json"
Write-Host "- center_south_district.json"
Write-Host "- east_district.json"