# PowerShell script to split polygon into North, South East, and South West
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$polygon = Get-Content $inputFile | ConvertFrom-Json

$coords = $polygon.coordinates[0]

# Function to calculate polygon area using Shoelace formula
function Get-PolygonArea {
    param($points)
    
    $area = 0.0
    $n = $points.Count
    
    for ($i = 0; $i -lt $n - 1; $i++) {
        $area += $points[$i][0] * $points[$i + 1][1]
        $area -= $points[$i + 1][0] * $points[$i][1]
    }
    
    return [Math]::Abs($area) / 2.0
}

# Function to calculate intersection point for horizontal split (by latitude)
function Get-LatIntersection {
    param($p1, $p2, $splitLat)
    
    if ($p2[1] -eq $p1[1]) { return $null }
    
    $t = ($splitLat - $p1[1]) / ($p2[1] - $p1[1])
    $intersectLon = $p1[0] + $t * ($p2[0] - $p1[0])
    
    return @($intersectLon, $splitLat)
}

# Function to calculate intersection point for vertical split (by longitude)
function Get-LonIntersection {
    param($p1, $p2, $splitLon)
    
    if ($p2[0] -eq $p1[0]) { return $null }
    
    $t = ($splitLon - $p1[0]) / ($p2[0] - $p1[0])
    $intersectLat = $p1[1] + $t * ($p2[1] - $p1[1])
    
    return @($splitLon, $intersectLat)
}

# Function to split polygon at a given latitude
function Split-AtLatitude {
    param($inputCoords, $splitLat)
    
    $southPts = @()
    $northPts = @()
    
    for ($i = 0; $i -lt $inputCoords.Count; $i++) {
        $curr = $inputCoords[$i]
        $next = $inputCoords[($i + 1) % $inputCoords.Count]
        
        if ($curr[1] -le $splitLat) { 
            $southPts += ,@($curr[0], $curr[1]) 
        }
        if ($curr[1] -ge $splitLat) { 
            $northPts += ,@($curr[0], $curr[1]) 
        }
        
        if (($curr[1] -lt $splitLat -and $next[1] -gt $splitLat) -or 
            ($curr[1] -gt $splitLat -and $next[1] -lt $splitLat)) {
            $intersection = Get-LatIntersection $curr $next $splitLat
            if ($intersection) {
                $southPts += ,$intersection
                $northPts += ,$intersection
            }
        }
    }
    
    return @{
        South = $southPts
        North = $northPts
    }
}

# Function to split polygon at a given longitude
function Split-AtLongitude {
    param($inputCoords, $splitLon)
    
    $westPts = @()
    $eastPts = @()
    
    for ($i = 0; $i -lt $inputCoords.Count; $i++) {
        $curr = $inputCoords[$i]
        $next = $inputCoords[($i + 1) % $inputCoords.Count]
        
        if ($curr[0] -le $splitLon) { 
            $westPts += ,@($curr[0], $curr[1]) 
        }
        if ($curr[0] -ge $splitLon) { 
            $eastPts += ,@($curr[0], $curr[1]) 
        }
        
        if (($curr[0] -lt $splitLon -and $next[0] -gt $splitLon) -or 
            ($curr[0] -gt $splitLon -and $next[0] -lt $splitLon)) {
            $intersection = Get-LonIntersection $curr $next $splitLon
            if ($intersection) {
                $westPts += ,$intersection
                $eastPts += ,$intersection
            }
        }
    }
    
    return @{
        West = $westPts
        East = $eastPts
    }
}

# Function to close polygon
function Close-Polygon {
    param($points)
    
    if ($points.Count -gt 0) {
        $first = $points[0]
        $last = $points[-1]
        if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
            $points += ,@($first[0], $first[1])
        }
    }
    return $points
}

# Calculate median latitude and longitude
$lats = $coords | ForEach-Object { $_[1] }
$lons = $coords | ForEach-Object { $_[0] }
$sortedLats = $lats | Sort-Object
$sortedLons = $lons | Sort-Object
$medianLat = $sortedLats[[Math]::Floor($sortedLats.Count / 2)]
$medianLon = $sortedLons[[Math]::Floor($sortedLons.Count / 2)]

Write-Host "Median Latitude: $medianLat"
Write-Host "Median Longitude: $medianLon"
Write-Host ""

# Step 1: Split horizontally by latitude (South vs North)
Write-Host "Step 1: Splitting horizontally at median latitude..."
$latSplit = Split-AtLatitude $coords $medianLat
$southPts = $latSplit.South
$northPts = Close-Polygon $latSplit.North

$northArea = Get-PolygonArea $northPts
Write-Host "North portion created with area: $northArea"
Write-Host ""

# Step 2: Split south portion vertically by longitude (South West vs South East)
Write-Host "Step 2: Splitting south portion vertically at median longitude..."
$lonSplit = Split-AtLongitude $southPts $medianLon
$southWestPts = Close-Polygon $lonSplit.West
$southEastPts = Close-Polygon $lonSplit.East

$southWestArea = Get-PolygonArea $southWestPts
$southEastArea = Get-PolygonArea $southEastPts

Write-Host "South West portion created with area: $southWestArea"
Write-Host "South East portion created with area: $southEastArea"
Write-Host ""

# Calculate total area
$totalArea = $northArea + $southWestArea + $southEastArea

# Create output GeoJSON objects
$northPolygon = @{
    type = "Polygon"
    coordinates = @(,$northPts)
} | ConvertTo-Json -Depth 10 -Compress

$southWestPolygon = @{
    type = "Polygon"
    coordinates = @(,$southWestPts)
} | ConvertTo-Json -Depth 10 -Compress

$southEastPolygon = @{
    type = "Polygon"
    coordinates = @(,$southEastPts)
} | ConvertTo-Json -Depth 10 -Compress

# Save outputs
$northPolygon | Out-File "north_polygon.json" -Encoding UTF8
$southWestPolygon | Out-File "south_west_polygon.json" -Encoding UTF8
$southEastPolygon | Out-File "south_east_polygon.json" -Encoding UTF8

Write-Host "Polygons created successfully!"
Write-Host "- north_polygon.json (Northern area)"
Write-Host "- south_west_polygon.json (Southwestern area)"
Write-Host "- south_east_polygon.json (Southeastern area)"
Write-Host ""
Write-Host "Area distribution:"
Write-Host "  North: $northArea ($(($northArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  South West: $southWestArea ($(($southWestArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  South East: $southEastArea ($(($southEastArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  Total: $totalArea"
Write-Host ""
Write-Host "Point counts:"
Write-Host "  North: $($northPts.Count) points"
Write-Host "  South West: $($southWestPts.Count) points"
Write-Host "  South East: $($southEastPts.Count) points"