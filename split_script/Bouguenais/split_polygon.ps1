# PowerShell script to split polygon vertically into 3 roughly equal areas
# Save your input polygon as input.json in the same directory

$inputFile = "input.json"
$polygon = Get-Content $inputFile | ConvertFrom-Json

$coords = $polygon.coordinates[0]

# Calculate longitude terciles (33rd and 67th percentiles)
$lons = $coords | ForEach-Object { $_[0] }
$sortedLons = $lons | Sort-Object
$tercile1 = $sortedLons[[Math]::Floor($sortedLons.Count / 3)]
$tercile2 = $sortedLons[[Math]::Floor(2 * $sortedLons.Count / 3)]

Write-Host "First Tercile (33rd percentile) Longitude: $tercile1"
Write-Host "Second Tercile (67th percentile) Longitude: $tercile2"
Write-Host ""

# Function to calculate intersection point
function Get-Intersection {
    param($p1, $p2, $splitLon)
    
    if ($p2[0] -eq $p1[0]) { return $null }
    
    $t = ($splitLon - $p1[0]) / ($p2[0] - $p1[0])
    $intersectLat = $p1[1] + $t * ($p2[1] - $p1[1])
    
    return @($splitLon, $intersectLat)
}

# Function to split polygon at a given longitude
function Split-AtLongitude {
    param($inputCoords, $splitLon)
    
    $leftPts = @()
    $rightPts = @()
    
    for ($i = 0; $i -lt $inputCoords.Count; $i++) {
        $curr = $inputCoords[$i]
        $next = $inputCoords[($i + 1) % $inputCoords.Count]
        
        # Add current point to appropriate side(s)
        if ($curr[0] -le $splitLon) { 
            $leftPts += ,@($curr[0], $curr[1]) 
        }
        if ($curr[0] -ge $splitLon) { 
            $rightPts += ,@($curr[0], $curr[1]) 
        }
        
        # Check if edge crosses the split line
        if (($curr[0] -lt $splitLon -and $next[0] -gt $splitLon) -or 
            ($curr[0] -gt $splitLon -and $next[0] -lt $splitLon)) {
            $intersection = Get-Intersection $curr $next $splitLon
            if ($intersection) {
                $leftPts += ,$intersection
                $rightPts += ,$intersection
            }
        }
    }
    
    return @{
        Left = $leftPts
        Right = $rightPts
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

# Step 1: Split at first tercile (creates West and Rest)
Write-Host "Splitting at first tercile..."
$split1 = Split-AtLongitude $coords $tercile1
$westPts = Close-Polygon $split1.Left
$restPts = $split1.Right

# Step 2: Split the right portion at second tercile (creates Center and East)
Write-Host "Splitting at second tercile..."
$split2 = Split-AtLongitude $restPts $tercile2
$centerPts = Close-Polygon $split2.Left
$eastPts = Close-Polygon $split2.Right

# Create output GeoJSON objects
$westPolygon = @{
    type = "Polygon"
    coordinates = @(,$westPts)
} | ConvertTo-Json -Depth 10 -Compress

$centerPolygon = @{
    type = "Polygon"
    coordinates = @(,$centerPts)
} | ConvertTo-Json -Depth 10 -Compress

$eastPolygon = @{
    type = "Polygon"
    coordinates = @(,$eastPts)
} | ConvertTo-Json -Depth 10 -Compress

# Save outputs
$westPolygon | Out-File "west_polygon.json" -Encoding UTF8
$centerPolygon | Out-File "center_polygon.json" -Encoding UTF8
$eastPolygon | Out-File "east_polygon.json" -Encoding UTF8

Write-Host "`nPolygons created successfully!"
Write-Host "- west_polygon.json (West third)"
Write-Host "- center_polygon.json (Center third)"
Write-Host "- east_polygon.json (East third)"
Write-Host "`nPoint counts:"
Write-Host "  West: $($westPts.Count) points"
Write-Host "  Center: $($centerPts.Count) points"
Write-Host "  East: $($eastPts.Count) points"