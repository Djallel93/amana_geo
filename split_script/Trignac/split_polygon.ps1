# PowerShell script to split polygon into 2 parts: North-East and South-West (vertical split)
# Diagonal runs from North-West to South-East
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
    param($p1, $p2, $splitLon, $splitLat)
    
    # Check if edge crosses the diagonal line: lat = m * lon + b
    # where m is the negative slope from NW corner to SE corner
    $m = -$latRange / $lonRange
    $b = $maxLat - $m * $minLon
    
    # Line equation: lat = m * lon + b
    # Edge from p1 to p2
    $lon1 = $p1[0]
    $lat1 = $p1[1]
    $lon2 = $p2[0]
    $lat2 = $p2[1]
    
    # Check if edge is vertical
    if ([Math]::Abs($lon2 - $lon1) -lt 0.0000001) {
        $intersectLon = $lon1
        $intersectLat = $m * $intersectLon + $b
        
        # Check if intersection is within edge bounds
        $minEdgeLat = [Math]::Min($lat1, $lat2)
        $maxEdgeLat = [Math]::Max($lat1, $lat2)
        
        if ($intersectLat -ge $minEdgeLat -and $intersectLat -le $maxEdgeLat) {
            return @($intersectLon, $intersectLat)
        }
        return $null
    }
    
    # Edge slope
    $mEdge = ($lat2 - $lat1) / ($lon2 - $lon1)
    $bEdge = $lat1 - $mEdge * $lon1
    
    # Intersection: m * lon + b = mEdge * lon + bEdge
    if ([Math]::Abs($m - $mEdge) -lt 0.0000001) {
        return $null  # Parallel lines
    }
    
    $intersectLon = ($bEdge - $b) / ($m - $mEdge)
    $intersectLat = $m * $intersectLon + $b
    
    # Check if intersection is within edge bounds
    $minEdgeLon = [Math]::Min($lon1, $lon2)
    $maxEdgeLon = [Math]::Max($lon1, $lon2)
    $minEdgeLat = [Math]::Min($lat1, $lat2)
    $maxEdgeLat = [Math]::Max($lat1, $lat2)
    
    if ($intersectLon -ge $minEdgeLon -and $intersectLon -le $maxEdgeLon -and
        $intersectLat -ge $minEdgeLat -and $intersectLat -le $maxEdgeLat) {
        return @($intersectLon, $intersectLat)
    }
    
    return $null
}

# Function to determine which side of diagonal a point is on
function Get-PointSide {
    param($point, $m, $b)
    
    $lon = $point[0]
    $lat = $point[1]
    
    # Line equation: lat = m * lon + b (negative slope from NW to SE)
    # If point is above line: lat > m * lon + b (North-East)
    # If point is below line: lat < m * lon + b (South-West)
    
    $lineValue = $m * $lon + $b
    
    if ($lat -gt $lineValue) {
        return "NE"
    } else {
        return "SW"
    }
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
$targetArea = $totalArea / 2.0

Write-Host "Total area: $totalArea"
Write-Host "Target area per district: $targetArea"

# Diagonal from NW to SE for vertical split
# Negative slope for NW to SE diagonal
$m = -$latRange / $lonRange
$b = $maxLat - $m * $minLon

Write-Host "`nSplitting by diagonal from NW to SE (vertical split)..."
Write-Host "Diagonal slope: $m, intercept: $b"

# Split polygon by diagonal
$nePts = @()
$swPts = @()

for ($i = 0; $i -lt $coords.Count; $i++) {
    $curr = $coords[$i]
    $next = $coords[($i + 1) % $coords.Count]
    
    $currSide = Get-PointSide $curr $m $b
    $nextSide = Get-PointSide $next $m $b
    
    # Add current point to appropriate polygon
    if ($currSide -eq "NE") {
        $nePts += , @($curr[0], $curr[1])
    } else {
        $swPts += , @($curr[0], $curr[1])
    }
    
    # Check if edge crosses the diagonal
    if ($currSide -ne $nextSide) {
        $intersection = Get-Intersection $curr $next $m $b
        if ($intersection) {
            $nePts += , $intersection
            $swPts += , $intersection
        }
    }
}

# Close polygons
$nePts = Close-Polygon $nePts
$swPts = Close-Polygon $swPts

# Calculate areas
$neArea = Get-PolygonArea $nePts
$swArea = Get-PolygonArea $swPts

# Summary
Write-Host "`n=== FINAL AREAS ==="
Write-Host "North-East: $neArea ($(($neArea/$totalArea*100).ToString('F2'))%)"
Write-Host "South-West: $swArea ($(($swArea/$totalArea*100).ToString('F2'))%)"
Write-Host "Total:      $($neArea + $swArea) (should be $totalArea)"

# Create compact JSON (single line, no spaces)
function ConvertTo-CompactJson {
    param($obj)
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    return $json
}

# Save outputs as compact JSON
$neJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $nePts)
}
$neJson | Out-File "northeast_district.json" -Encoding UTF8 -NoNewline

$swJson = ConvertTo-CompactJson @{
    type        = "Polygon"
    coordinates = @(, $swPts)
}
$swJson | Out-File "southwest_district.json" -Encoding UTF8 -NoNewline

Write-Host "`nBoth districts created successfully (compact format)!"
Write-Host "- northeast_district.json"
Write-Host "- southwest_district.json"