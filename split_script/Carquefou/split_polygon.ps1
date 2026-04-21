# PowerShell script to split polygon into South, North East, and North West
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$polygon = Get-Content $inputFile | ConvertFrom-Json

$coords = $polygon.coordinates[0]

# Calculate median latitude and longitude
$lats = $coords | ForEach-Object { $_[1] }
$lons = $coords | ForEach-Object { $_[0] }
$sortedLats = $lats | Sort-Object
$sortedLons = $lons | Sort-Object
$medianLat = $sortedLats[[Math]::Floor($sortedLats.Count / 2)]
$medianLon = $sortedLons[[Math]::Floor($sortedLons.Count / 2)]

Write-Host "Median Latitude: $medianLat"
Write-Host "Median Longitude: $medianLon"

# Function to calculate intersection point
function Get-Intersection {
    param($p1, $p2, $splitValue, $axis)
    
    $idx = if ($axis -eq 'lat') { 1 } else { 0 }
    $otherIdx = if ($axis -eq 'lat') { 0 } else { 1 }
    
    $t = ($splitValue - $p1[$idx]) / ($p2[$idx] - $p1[$idx])
    $result = @(0, 0)
    $result[$idx] = $splitValue
    $result[$otherIdx] = $p1[$otherIdx] + $t * ($p2[$otherIdx] - $p1[$otherIdx])
    
    return $result
}

# Step 1: Split by latitude (South vs North)
$southPts = @()
$northPts = @()

for ($i = 0; $i -lt $coords.Count; $i++) {
    $curr = $coords[$i]
    $next = $coords[($i + 1) % $coords.Count]
    
    if ($curr[1] -le $medianLat) { $southPts += ,@($curr[0], $curr[1]) }
    if ($curr[1] -ge $medianLat) { $northPts += ,@($curr[0], $curr[1]) }
    
    # Check if edge crosses median latitude
    if (($curr[1] -lt $medianLat -and $next[1] -gt $medianLat) -or 
        ($curr[1] -gt $medianLat -and $next[1] -lt $medianLat)) {
        $intersection = Get-Intersection $curr $next $medianLat 'lat'
        $southPts += ,$intersection
        $northPts += ,$intersection
    }
}

# Close south polygon
if ($southPts.Count -gt 0) {
    $first = $southPts[0]
    $last = $southPts[-1]
    if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
        $southPts += ,@($first[0], $first[1])
    }
}

# Step 2: Split north portion by longitude (North West vs North East)
$northWestPts = @()
$northEastPts = @()

for ($i = 0; $i -lt $northPts.Count; $i++) {
    $curr = $northPts[$i]
    $next = $northPts[($i + 1) % $northPts.Count]
    
    if ($curr[0] -le $medianLon) { $northWestPts += ,@($curr[0], $curr[1]) }
    if ($curr[0] -ge $medianLon) { $northEastPts += ,@($curr[0], $curr[1]) }
    
    # Check if edge crosses median longitude
    if (($curr[0] -lt $medianLon -and $next[0] -gt $medianLon) -or 
        ($curr[0] -gt $medianLon -and $next[0] -lt $medianLon)) {
        $intersection = Get-Intersection $curr $next $medianLon 'lon'
        $northWestPts += ,$intersection
        $northEastPts += ,$intersection
    }
}

# Close north west polygon
if ($northWestPts.Count -gt 0) {
    $first = $northWestPts[0]
    $last = $northWestPts[-1]
    if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
        $northWestPts += ,@($first[0], $first[1])
    }
}

# Close north east polygon
if ($northEastPts.Count -gt 0) {
    $first = $northEastPts[0]
    $last = $northEastPts[-1]
    if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
        $northEastPts += ,@($first[0], $first[1])
    }
}

# Create output GeoJSON objects
$southPolygon = @{
    type = "Polygon"
    coordinates = @(,$southPts)
} | ConvertTo-Json -Depth 10

$northWestPolygon = @{
    type = "Polygon"
    coordinates = @(,$northWestPts)
} | ConvertTo-Json -Depth 10

$northEastPolygon = @{
    type = "Polygon"
    coordinates = @(,$northEastPts)
} | ConvertTo-Json -Depth 10

# Save outputs
$southPolygon | Out-File "south_polygon.json" -Encoding UTF8
$northWestPolygon | Out-File "north_west_polygon.json" -Encoding UTF8
$northEastPolygon | Out-File "north_east_polygon.json" -Encoding UTF8

Write-Host "`nPolygons created successfully!"
Write-Host "- south_polygon.json"
Write-Host "- north_west_polygon.json"
Write-Host "- north_east_polygon.json"