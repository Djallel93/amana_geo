function handleGetSecteurs(params) {
    const secteurs = getAllSecteurs();

    return createJsonResponse({
        count: secteurs.length,
        secteurs: secteurs
    });
}

function handleGetSecteur(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    const secteur = getSecteurById(id);

    if (!secteur) {
        return createErrorResponse(
            'SECTEUR_NOT_FOUND',
            `Secteur ${id} introuvable`,
            404
        );
    }

    return createJsonResponse(secteur);
}

function handleSecteursByVille(params) {
    const idVille = params.idVille || params.id_ville;

    if (!idVille) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "idVille" requis'
        );
    }

    const secteurs = getSecteursByVille(idVille);

    return createJsonResponse({
        idVille: idVille,
        count: secteurs.length,
        secteurs: secteurs
    });
}

function handleCreateSecteur(params) {
    const secteur = {
        nom: params.nom,
        latitude: params.latitude ? parseFloat(params.latitude) : null,
        longitude: params.longitude ? parseFloat(params.longitude) : null,
        idVille: params.idVille || params.id_ville
    };

    if (!secteur.nom || !secteur.idVille) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètres manquants: nom et idVille requis'
        );
    }

    const result = createSecteur(secteur);

    return createJsonResponse({
        success: true,
        secteur: result
    });
}

function handleUpdateSecteur(params) {
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
    if (params.idVille || params.id_ville) updates.idVille = params.idVille || params.id_ville;

    updateSecteur(id, updates);

    return createJsonResponse({
        success: true,
        message: `Secteur ${id} mis à jour`
    });
}

function handleDeleteSecteur(params) {
    const id = params.id;

    if (!id) {
        return createErrorResponse(
            CONFIG.ERRORS.MISSING_PARAMETERS,
            'Paramètre "id" requis'
        );
    }

    deleteSecteur(id);

    return createJsonResponse({
        success: true,
        message: `Secteur ${id} supprimé`
    });
}