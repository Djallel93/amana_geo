function handleGeocode(params) {
    const address = params.address;

    if (!address) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "address" manquant'
        );
    }

    const country = params.country || null;
    const result = geocodeAddress(address, country);

    return createJsonResponse(result);
}

function handleReverseGeocode(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);

    if (isNaN(lat) || isNaN(lng)) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres "lat" et "lng" requis'
        );
    }

    const result = reverseGeocode(lat, lng);

    return createJsonResponse(result);
}

function handleValidateAddress(params) {
    const address = params.address;

    if (!address) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "address" manquant'
        );
    }

    const isValid = validateAddress(address);

    return createJsonResponse({
        address: address,
        isValid: isValid
    });
}

function handleBatchGeocode(params) {
    const addresses = params.addresses;

    if (!Array.isArray(addresses)) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "addresses" (array) requis'
        );
    }

    const results = geocodeAddressesBatch(addresses);

    return createJsonResponse({
        total: addresses.length,
        results: results
    });
}