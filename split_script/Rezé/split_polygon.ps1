# PowerShell script to split polygon into 3 equal-area parts: North, Center, South
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$polygon = Get-Content $inputFile | ConvertFrom-Json

$coords = $polygon.coordinates[0]

# Calculate bounds
$lats = $coords | ForEach-Object { $_[1] }
$minLat = ($lats | Measure-Object -Minimum).Minimum
$maxLat = ($lats | Measure-Object -Maximum).Maximum
$latRange = $maxLat - $minLat

Write-Host "Bounds: Lat [$minLat, $maxLat]"

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

# Step 1: Find first latitude split (South vs Center+North)
Write-Host "`nStep 1: Finding first latitude split (South boundary)..."
$southLat = $minLat + $latRange * 0.33
$bestSouthLat = $southLat
$bestDiff = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLatitude $coords $southLat
    $southArea = Get-PolygonArea (Close-Polygon $result[0])
    
    $diff = [Math]::Abs($southArea - $targetArea)
    
    if ($diff -lt $bestDiff) {
        $bestDiff = $diff
        $bestSouthLat = $southLat
    }
    
    # Adjust split based on which side is larger
    if ($southArea -gt $targetArea) {
        $southLat -= $latRange * 0.02
    }
    else {
        $southLat += $latRange * 0.02
    }
}

$southLat = $bestSouthLat
Write-Host "Best south latitude split: $southLat"

# Split into South and Center+North
$splitResult = Split-ByLatitude $coords $southLat
$southPts = Close-Polygon $splitResult[0]
$centerNorthPts = $splitResult[1]

$southArea = Get-PolygonArea $southPts
Write-Host "South area: $southArea ($(($southArea/$totalArea*100).ToString('F2'))%)"

# Step 2: Find second latitude split (Center vs North)
Write-Host "`nStep 2: Finding second latitude split (North boundary)..."
$northLat = $southLat + $latRange * 0.33
$bestNorthLat = $northLat
$bestDiff = [double]::MaxValue

for ($i = 0; $i -lt 30; $i++) {
    $result = Split-ByLatitude $centerNorthPts $northLat
    $centerArea = Get-PolygonArea (Close-Polygon $result[0])
    $northArea = Get-PolygonArea (Close-Polygon $result[1])
    
    # We want center and north to be roughly equal (each ~1/3 of total)
    $diff = [Math]::Abs($centerArea - $targetArea) + [Math]::Abs($northArea - $targetArea)
    
    if ($diff -lt $bestDiff) {
        $bestDiff = $diff
        $bestNorthLat = $northLat
    }
    
    # Adjust split based on which side needs adjustment
    if ($centerArea -gt $targetArea) {
        $northLat -= $latRange * 0.02
    }
    else {
        $northLat += $latRange * 0.02
    }
}

$northLat = $bestNorthLat
Write-Host "Best north latitude split: $northLat"

# Split Center+North into Center and North
$splitResult = Split-ByLatitude $centerNorthPts $northLat
$centerPts = Close-Polygon $splitResult[0]
$northPts = Close-Polygon $splitResult[1]

$centerArea = Get-PolygonArea $centerPts
$northArea = Get-PolygonArea $northPts

# Summary
Write-Host "`n=== FINAL AREAS ==="
Write-Host "South:  $southArea ($(($southArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Center: $centerArea ($(($centerArea/$totalArea*100).ToString('F2'))%)"
Write-Host "North:  $northArea ($(($northArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Total:  $($southArea + $centerArea + $northArea) (should be $totalArea)"

# Save outputs
@{
    type        = "Polygon"
    coordinates = @(, $southPts)
} | ConvertTo-Json -Depth 10 | Out-File "south_district.json" -Encoding UTF8

@{
    type        = "Polygon"
    coordinates = @(, $centerPts)
} | ConvertTo-Json -Depth 10 | Out-File "center_district.json" -Encoding UTF8

@{
    type        = "Polygon"
    coordinates = @(, $northPts)
} | ConvertTo-Json -Depth 10 | Out-File "north_district.json" -Encoding UTF8

Write-Host "`nAll 3 districts created successfully!"
Write-Host "- south_district.json"
Write-Host "- center_district.json"
Write-Host "- north_district.json"