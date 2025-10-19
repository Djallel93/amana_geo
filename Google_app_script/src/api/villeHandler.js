function handleGetVilles(params) {
    const villes = getAllVilles();

    return createJsonResponse({
        count: villes.length,
        villes: villes
    });
}

function handleGetVille(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    const ville = getVilleById(id);

    if (!ville) {
        return createErrorResponse(
            CONFIG.ERRORS.VILLE_NOT_FOUND,
            `Ville ${id} introuvable`,
            404
        );
    }

    return createJsonResponse(ville);
}

function handleSearchVilles(params) {
    const codePostal = params.codePostal || params.code_postal;
    const nom = params.nom || params.name;

    let villes;

    if (codePostal) {
        villes = getVillesByCodePostal(codePostal);
    } else if (nom) {
        villes = searchVillesByName(nom);
    } else {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "codePostal" ou "nom" requis'
        );
    }

    return createJsonResponse({
        count: villes.length,
        villes: villes
    });
}

function handleGeocodeVille(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    const result = geocodeVille(id);

    return createJsonResponse(result);
}

function handleCreateVille(params) {
    const ville = {
        nom: params.nom,
        codePostal: params.codePostal || params.code_postal,
        departement: params.departement,
        pays: params.pays
    };

    if (!ville.nom || !ville.codePostal) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres manquants: nom et codePostal requis'
        );
    }

    const result = createVille(ville);

    return createJsonResponse({
        success: true,
        ville: result
    });
}

function handleUpdateVille(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    const updates = {};
    if (params.nom) updates.nom = params.nom;
    if (params.codePostal || params.code_postal) updates.codePostal = params.codePostal || params.code_postal;
    if (params.departement) updates.departement = params.departement;
    if (params.pays) updates.pays = params.pays;

    updateVille(id, updates);

    return createJsonResponse({
        success: true,
        message: `Ville ${id} mise à jour`
    });
}

function handleDeleteVille(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    deleteVille(id);

    return createJsonResponse({
        success: true,
        message: `Ville ${id} supprimée`
    });
}