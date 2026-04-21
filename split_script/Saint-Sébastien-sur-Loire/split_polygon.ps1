# PowerShell script to split polygon vertically into 3 sub-polygons with equal areas
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
        
        if ($curr[0] -le $splitLon) { 
            $leftPts += ,@($curr[0], $curr[1]) 
        }
        if ($curr[0] -ge $splitLon) { 
            $rightPts += ,@($curr[0], $curr[1]) 
        }
        
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

# Function to find longitude that splits remaining area into target ratio
function Find-SplitLongitude {
    param($inputCoords, $targetArea, $minLon, $maxLon)
    
    $tolerance = 0.0001
    $maxIterations = 50
    $iteration = 0
    
    while ($iteration -lt $maxIterations) {
        $midLon = ($minLon + $maxLon) / 2.0
        
        $split = Split-AtLongitude $inputCoords $midLon
        $leftClosed = Close-Polygon $split.Left
        $leftArea = Get-PolygonArea $leftClosed
        
        $diff = $leftArea - $targetArea
        
        if ([Math]::Abs($diff) -lt $tolerance) {
            return $midLon
        }
        
        if ($diff -gt 0) {
            $maxLon = $midLon
        } else {
            $minLon = $midLon
        }
        
        $iteration++
    }
    
    return ($minLon + $maxLon) / 2.0
}

# Calculate total area
$totalArea = Get-PolygonArea $coords
$targetAreaPerSection = $totalArea / 3.0

Write-Host "Total polygon area: $totalArea"
Write-Host "Target area per section: $targetAreaPerSection"
Write-Host ""

# Get longitude bounds
$lons = $coords | ForEach-Object { $_[0] }
$minLon = ($lons | Measure-Object -Minimum).Minimum
$maxLon = ($lons | Measure-Object -Maximum).Maximum

# Find first split longitude (1/3 of total area)
Write-Host "Finding first split longitude..."
$splitLon1 = Find-SplitLongitude $coords $targetAreaPerSection $minLon $maxLon

$split1 = Split-AtLongitude $coords $splitLon1
$westPts = Close-Polygon $split1.Left
$westArea = Get-PolygonArea $westPts
$remainingPts = $split1.Right

Write-Host "First split at longitude: $splitLon1"
Write-Host "West area: $westArea"
Write-Host ""

# Find second split longitude (half of remaining area)
Write-Host "Finding second split longitude..."
$splitLon2 = Find-SplitLongitude $remainingPts $targetAreaPerSection $splitLon1 $maxLon

$split2 = Split-AtLongitude $remainingPts $splitLon2
$centerPts = Close-Polygon $split2.Left
$eastPts = Close-Polygon $split2.Right

$centerArea = Get-PolygonArea $centerPts
$eastArea = Get-PolygonArea $eastPts

Write-Host "Second split at longitude: $splitLon2"
Write-Host "Center area: $centerArea"
Write-Host "East area: $eastArea"
Write-Host ""

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

Write-Host "Polygons created successfully!"
Write-Host "- west_polygon.json"
Write-Host "- center_polygon.json"
Write-Host "- east_polygon.json"
Write-Host ""
Write-Host "Area distribution:"
Write-Host "  West: $westArea ($(($westArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  Center: $centerArea ($(($centerArea / $totalArea * 100).ToString('F2'))%)"
Write-Host "  East: $eastArea ($(($eastArea / $totalArea * 100).ToString('F2'))%)"