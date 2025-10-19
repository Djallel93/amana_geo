function handleFindQuartier(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);
    const maxDistance = params.maxDistance ? parseFloat(params.maxDistance) : null;

    if (isNaN(lat) || isNaN(lng)) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres "lat" et "lng" requis'
        );
    }

    const result = findNearestQuartier(lat, lng, maxDistance);

    if (!result) {
        return createErrorResponse(
            CONFIG.ERRORS.NO_QUARTIER_FOUND,
            'Aucun quartier trouvé dans le rayon spécifié',
            404
        );
    }

    return createJsonResponse(result);
}

function handleGetQuartiers(params) {
    const idSecteur = params.idSecteur || params.id_secteur;

    let quartiers;

    if (idSecteur) {
        quartiers = getQuartiersBySecteur(idSecteur);
    } else {
        quartiers = getAllQuartiers();
    }

    return createJsonResponse({
        count: quartiers.length,
        quartiers: quartiers
    });
}

function handleGetQuartier(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    const quartier = getQuartierById(id);

    if (!quartier) {
        return createErrorResponse(
            CONFIG.ERRORS.QUARTIER_NOT_FOUND,
            `Quartier ${id} introuvable`,
            404
        );
    }

    return createJsonResponse(quartier);
}

function handleGeocodeQuartier(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    const result = geocodeQuartier(id);

    return createJsonResponse(result);
}

function handleQuartiersByVille(params) {
    const idVille = params.idVille || params.id_ville;

    if (!idVille) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "idVille" requis'
        );
    }

    const quartiers = getQuartiersByVille(idVille);

    return createJsonResponse({
        idVille: idVille,
        count: quartiers.length,
        quartiers: quartiers
    });
}

function handleQuartiersInRadius(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);
    const radius = parseFloat(params.radius || params.radiusKm || 10);

    if (isNaN(lat) || isNaN(lng)) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres "lat" et "lng" requis'
        );
    }

    const quartiers = findQuartiersInRadius(lat, lng, radius);

    return createJsonResponse({
        center: { latitude: lat, longitude: lng },
        radiusKm: radius,
        count: quartiers.length,
        quartiers: quartiers
    });
}

function handleCreateQuartier(params) {
    const quartier = {
        nom: params.nom,
        latitude: parseFloat(params.latitude),
        longitude: parseFloat(params.longitude),
        idSecteur: params.idSecteur || params.id_secteur
    };

    if (!quartier.nom || isNaN(quartier.latitude) || isNaN(quartier.longitude) || !quartier.idSecteur) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres manquants: nom, latitude, longitude, idSecteur requis'
        );
    }

    const result = createQuartier(quartier);

    return createJsonResponse({
        success: true,
        quartier: result
    });
}

function handleUpdateQuartier(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    const updates = {};
    if (params.nom) updates.nom = params.nom;
    if (params.latitude) updates.latitude = parseFloat(params.latitude);
    if (params.longitude) updates.longitude = parseFloat(params.longitude);
    if (params.idSecteur || params.id_secteur) updates.idSecteur = params.idSecteur || params.id_secteur;

    updateQuartier(id, updates);

    return createJsonResponse({
        success: true,
        message: `Quartier ${id} mis à jour`
    });
}

function handleDeleteQuartier(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    deleteQuartier(id);

    return createJsonResponse({
        success: true,
        message: `Quartier ${id} supprimé`
    });
}

function handleGeocodeQuartiersOfVille(params) {
    const idVille = params.idVille || params.id_ville;

    if (!idVille) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "idVille" requis'
        );
    }

    const results = geocodeQuartiersOfVille(idVille);

    return createJsonResponse({
        idVille: idVille,
        total: results.length,
        results: results
    });
}
