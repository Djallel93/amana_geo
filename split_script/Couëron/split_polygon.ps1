# PowerShell script to split polygon into West (1/3), North East (1/3), and South East (1/3)
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$polygon = Get-Content $inputFile | ConvertFrom-Json

$coords = $polygon.coordinates[0]

# Calculate longitude and latitude ranges
$lons = $coords | ForEach-Object { $_[0] }
$lats = $coords | ForEach-Object { $_[1] }
$minLon = ($lons | Measure-Object -Minimum).Minimum
$maxLon = ($lons | Measure-Object -Maximum).Maximum
$sortedLats = $lats | Sort-Object
$medianLat = $sortedLats[[Math]::Floor($sortedLats.Count / 2)]

# Split longitude at 1/3 point (West gets 1/3, East gets 2/3)
$splitLon = $minLon + ($maxLon - $minLon) * 0.33

Write-Host "Split Longitude (1/3 point): $splitLon"
Write-Host "Median Latitude: $medianLat"

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

# Step 1: Split by longitude at 1/3 point (West vs East)
$westPts = @()
$eastPts = @()

for ($i = 0; $i -lt $coords.Count; $i++) {
    $curr = $coords[$i]
    $next = $coords[($i + 1) % $coords.Count]
    
    if ($curr[0] -le $splitLon) { $westPts += , @($curr[0], $curr[1]) }
    if ($curr[0] -ge $splitLon) { $eastPts += , @($curr[0], $curr[1]) }
    
    # Check if edge crosses split longitude
    if (($curr[0] -lt $splitLon -and $next[0] -gt $splitLon) -or 
        ($curr[0] -gt $splitLon -and $next[0] -lt $splitLon)) {
        $intersection = Get-Intersection $curr $next $splitLon 'lon'
        $westPts += , $intersection
        $eastPts += , $intersection
    }
}

# Close west polygon
if ($westPts.Count -gt 0) {
    $first = $westPts[0]
    $last = $westPts[-1]
    if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
        $westPts += , @($first[0], $first[1])
    }
}

# Step 2: Split east portion by median latitude (South East vs North East)
$southEastPts = @()
$northEastPts = @()

for ($i = 0; $i -lt $eastPts.Count; $i++) {
    $curr = $eastPts[$i]
    $next = $eastPts[($i + 1) % $eastPts.Count]
    
    if ($curr[1] -le $medianLat) { $southEastPts += , @($curr[0], $curr[1]) }
    if ($curr[1] -ge $medianLat) { $northEastPts += , @($curr[0], $curr[1]) }
    
    # Check if edge crosses median latitude
    if (($curr[1] -lt $medianLat -and $next[1] -gt $medianLat) -or 
        ($curr[1] -gt $medianLat -and $next[1] -lt $medianLat)) {
        $intersection = Get-Intersection $curr $next $medianLat 'lat'
        $southEastPts += , $intersection
        $northEastPts += , $intersection
    }
}

# Close south east polygon
if ($southEastPts.Count -gt 0) {
    $first = $southEastPts[0]
    $last = $southEastPts[-1]
    if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
        $southEastPts += , @($first[0], $first[1])
    }
}

# Close north east polygon
if ($northEastPts.Count -gt 0) {
    $first = $northEastPts[0]
    $last = $northEastPts[-1]
    if ($first[0] -ne $last[0] -or $first[1] -ne $last[1]) {
        $northEastPts += , @($first[0], $first[1])
    }
}

# Create output GeoJSON objects
$westPolygon = @{
    type        = "Polygon"
    coordinates = @(, $westPts)
} | ConvertTo-Json -Depth 10

$southEastPolygon = @{
    type        = "Polygon"
    coordinates = @(, $southEastPts)
} | ConvertTo-Json -Depth 10

$northEastPolygon = @{
    type        = "Polygon"
    coordinates = @(, $northEastPts)
} | ConvertTo-Json -Depth 10

# Save outputs
$westPolygon | Out-File "west_polygon.json" -Encoding UTF8
$southEastPolygon | Out-File "south_east_polygon.json" -Encoding UTF8
$northEastPolygon | Out-File "north_east_polygon.json" -Encoding UTF8

Write-Host "`nPolygons created successfully!"
Write-Host "- west_polygon.json (~1/3 of area)"
Write-Host "- south_east_polygon.json (~1/3 of area)"
Write-Host "- north_east_polygon.json (~1/3 of area)"