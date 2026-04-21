# PowerShell script to split polygon horizontally into 3 sub-polygons with equal areas
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

# Function to calculate intersection point (horizontal split by latitude)
function Get-Intersection {
    param($p1, $p2, $splitLat)
    
    if ($p2[1] -eq $p1[1]) { return $null }
    
    $t = ($splitLat - $p1[1]) / ($p2[1] - $p1[1])
    $intersectLon = $p1[0] + $t * ($p2[0] - $p1[0])
    
    return @($intersectLon, $splitLat)
}

# Function to split polygon at a given latitude (horizontal split)
function Split-AtLatitude {
    param($inputCoords, $splitLat)
    
    $southPts = @()
    $northPts = @()
    
    for ($i = 0; $i -lt $inputCoords.Count; $i++) {
        $curr = $inputCoords[$i]
        $next = $inputCoords[($i + 1) % $inputCoords.Count]
        
        # Add current point to appropriate side(s)
        if ($curr[1] -le $splitLat) { 
            $southPts += ,@($curr[0], $curr[1]) 
        }
        if ($curr[1] -ge $splitLat) { 
            $northPts += ,@($curr[0], $curr[1]) 
        }
        
        # Check if edge crosses the split line
        if (($curr[1] -lt $splitLat -and $next[1] -gt $splitLat) -or 
            ($curr[1] -gt $splitLat -and $next[1] -lt $splitLat)) {
            $intersection = Get-Intersection $curr $next $splitLat
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

# Function to find latitude that splits remaining area into target ratio
function Find-SplitLatitude {
    param($inputCoords, $targetArea, $minLat, $maxLat)
    
    $tolerance = 0.0001
    $maxIterations = 50
    $iteration = 0
    
    while ($iteration -lt $maxIterations) {
        $midLat = ($minLat + $maxLat) / 2.0
        
        $split = Split-AtLatitude $inputCoords $midLat
        $southClosed = Close-Polygon $split.South
        $southArea = Get-PolygonArea $southClosed
        
        $diff = $southArea - $targetArea
        
        if ([Math]::Abs($diff) -lt $tolerance) {
            return $midLat
        }
        
        if ($diff -gt 0) {
            $maxLat = $midLat
        } else {
            $minLat = $midLat
        }
        
        $iteration++
    }
    
    return ($minLat + $maxLat) / 2.0
}

# Calculate total area
$totalArea = Get-PolygonArea $coords
$targetAreaPerSection = $totalArea / 3.0

Write-Host "Total polygon area: $totalArea"
Write-Host "Target area per section: $targetAreaPerSection"
Write-Host ""

# Get latitude bounds
$lats = $coords | ForEach-Object { $_[1] }
$minLat = ($lats | Measure-Object -Minimum).Minimum
$maxLat = ($lats | Measure-Object -Maximum).Maximum

# Find first split latitude (1/3 of total area from bottom)
Write-Host "Finding first split latitude (for bottom third)..."
$splitLat1 = Find-SplitLatitude $coords $targetAreaPerSection $minLat $maxLat

$split1 = Split-AtLatitude $coords $splitLat1
$southPts = Close-Polygon $split1.South
$southArea = Get-PolygonArea $southPts
$remainingPts = $split1.North

Write-Host "First split at latitude: $splitLat1"
Write-Host "South area: $southArea"
Write-Host ""

# Find second split latitude (half of remaining area)
Write-Host "Finding second split latitude (for middle third)..."
$splitLat2 = Find-SplitLatitude $remainingPts $targetAreaPerSection $splitLat1 $maxLat

$split2 = Split-AtLatitude $remainingPts $splitLat2
$centerPts = Close-Polygon $split2.South
$northPts = Close-Polygon $split2.North

$centerArea = Get-PolygonArea $centerPts
$northArea = Get-PolygonArea $northPts

Write-Host "Second split at latitude: $splitLat2"
Write-Host "Center area: $centerArea"
Write-Host "North area: $northArea"
Write-Host ""

# Create output GeoJSON objects
$southPolygon = @{
    type = "Polygon"
    coordinates = @(,$southPts)
} | ConvertTo-Json -Depth 10 -Compress

$centerPolygon = @{
    type = "Polygon"
    coordinates = @(,$centerPts)
} | ConvertTo-Json -Depth 10 -Compress

$northPolygon = @{
    type = "Polygon"
    coordinates = @(,$northPts)
} | ConvertTo-Json -Depth 10 -Compress

# Save outputs
$southPolygon | Out-File "south_polygon.json" -Encoding UTF8
$centerPolygon | Out-File "center_polygon.json" -Encoding UTF8
$northPolygon | Out-File "north_polygon.json" -Encoding UTF8

Write-Host "Polygons created successfully!"
Write-Host "- south_polygon.json"
Write-Host "- center_polygon.json"
Write-Host "- north_polygon.json"
Write-Host ""
Write-Host "Area distribution:"
Write-Host "  South: $southArea ($(($southArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  Center: $centerArea ($(($centerArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  North: $northArea ($(($northArea / $totalArea * 100).ToString('F2'))%)"