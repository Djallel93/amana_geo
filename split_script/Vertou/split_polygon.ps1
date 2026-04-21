# PowerShell script to split polygon into South, North East, and North West
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
$southPts = Close-Polygon $latSplit.South
$northPts = $latSplit.North

$southArea = Get-PolygonArea $southPts
Write-Host "South portion created with area: $southArea"
Write-Host ""

# Step 2: Split north portion vertically by longitude (North West vs North East)
Write-Host "Step 2: Splitting north portion vertically at median longitude..."
$lonSplit = Split-AtLongitude $northPts $medianLon
$northWestPts = Close-Polygon $lonSplit.West
$northEastPts = Close-Polygon $lonSplit.East

$northWestArea = Get-PolygonArea $northWestPts
$northEastArea = Get-PolygonArea $northEastPts

Write-Host "North West portion created with area: $northWestArea"
Write-Host "North East portion created with area: $northEastArea"
Write-Host ""

# Calculate total area
$totalArea = $southArea + $northWestArea + $northEastArea

# Create output GeoJSON objects
$southPolygon = @{
    type = "Polygon"
    coordinates = @(,$southPts)
} | ConvertTo-Json -Depth 10 -Compress

$northWestPolygon = @{
    type = "Polygon"
    coordinates = @(,$northWestPts)
} | ConvertTo-Json -Depth 10 -Compress

$northEastPolygon = @{
    type = "Polygon"
    coordinates = @(,$northEastPts)
} | ConvertTo-Json -Depth 10 -Compress

# Save outputs
$southPolygon | Out-File "south_polygon.json" -Encoding UTF8
$northWestPolygon | Out-File "north_west_polygon.json" -Encoding UTF8
$northEastPolygon | Out-File "north_east_polygon.json" -Encoding UTF8

Write-Host "Polygons created successfully!"
Write-Host "- south_polygon.json (Southern area)"
Write-Host "- north_west_polygon.json (Northwestern area)"
Write-Host "- north_east_polygon.json (Northeastern area)"
Write-Host ""
Write-Host "Area distribution:"
Write-Host "  South: $southArea ($(($southArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  North West: $northWestArea ($(($northWestArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  North East: $northEastArea ($(($northEastArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  Total: $totalArea"
Write-Host ""
Write-Host "Point counts:"
Write-Host "  South: $($southPts.Count) points"
Write-Host "  North West: $($northWestPts.Count) points"
Write-Host "  North East: $($northEastPts.Count) points"