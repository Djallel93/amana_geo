function handleCalculateDistance(params) {
    const lat1 = parseFloat(params.lat1);
    const lng1 = parseFloat(params.lng1);
    const lat2 = parseFloat(params.lat2);
    const lng2 = parseFloat(params.lng2);

    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres "lat1", "lng1", "lat2", "lng2" requis'
        );
    }

    const distance = calculateDistance(lat1, lng1, lat2, lng2);

    return createJsonResponse({
        distance: distance,
        unit: 'km',
        from: { latitude: lat1, longitude: lng1 },
        to: { latitude: lat2, longitude: lng2 }
    });
}

function handleCalculateDistances(params) {
    const originLat = parseFloat(params.originLat || params.lat);
    const originLng = parseFloat(params.originLng || params.lng);
    const destinations = params.destinations;

    if (isNaN(originLat) || isNaN(originLng)) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres "originLat" et "originLng" requis'
        );
    }

    if (!Array.isArray(destinations)) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "destinations" (array) requis'
        );
    }

    const results = calculateDistances(originLat, originLng, destinations);

    return createJsonResponse({
        origin: { latitude: originLat, longitude: originLng },
        count: results.length,
        results: results
    });
}