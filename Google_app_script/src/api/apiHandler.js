/**
 * Gestionnaire d'API pour le Web App
 * Point d'entrée pour toutes les requêtes HTTP
 */

/**
 * Point d'entrée GET pour le Web App
 * @param {Object} e - Événement de requête
 * @returns {GoogleAppsScript.Content.TextOutput} Réponse JSON
 */
function doGet(e) {
  try {
    // Vérifier l'authentification API
    const auth = checkAPIAuthentication(e);
    
    if (!auth.authorized) {
      return createErrorResponse(
        'UNAUTHORIZED',
        auth.reason,
        401
      );
    }
    
    // Log de la requête avec token info
    logWithTimestamp(`📥 Requête GET: ${JSON.stringify(e.parameter)} [${auth.tokenData?.name || 'anonymous'}]`, 'INFO');
    
  try {
    // Log de la requête
    logWithTimestamp(`📥 Requête GET: ${JSON.stringify(e.parameter)}`, 'INFO');

    // Vérification de l'authentification
    const apiKey = e.parameter.apiKey || e.parameter.api_key;
    if (!checkAuthentication(apiKey)) {
      return createErrorResponse(
        CONFIG.ERRORS.UNAUTHORIZED,
        'Clé API invalide ou manquante',
        401
      );
    }

    // Rate limiting (optionnel)
    const identifier = apiKey || 'anonymous';
    if (!checkRateLimit(identifier)) {
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Limite de requêtes dépassée. Réessayez plus tard.',
        429
      );
    }

    // Router vers l'action appropriée
    const action = e.parameter.action;

    if (!action) {
      return createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "action" manquant'
      );
    }

    // Dispatcher des actions
    switch (action.toLowerCase()) {
      // === GEOCODING ===
      case 'geocode':
        return handleGeocode(e.parameter);

      case 'reversegeocode':
        return handleReverseGeocode(e.parameter);

      case 'validate':
        return handleValidateAddress(e.parameter);

      // === QUARTIER ===
      case 'findquartier':
        return handleFindQuartier(e.parameter);

      case 'getquartiers':
        return handleGetQuartiers(e.parameter);

      case 'getquartier':
        return handleGetQuartier(e.parameter);

      case 'geocodequartier':
        return handleGeocodeQuartier(e.parameter);

      case 'quartiersbyville':
        return handleQuartiersByVille(e.parameter);

      case 'quartiersinradius':
        return handleQuartiersInRadius(e.parameter);

      // === VILLE ===
      case 'getvilles':
        return handleGetVilles(e.parameter);

      case 'getville':
        return handleGetVille(e.parameter);

      case 'searchvilles':
        return handleSearchVilles(e.parameter);

      case 'geocodeville':
        return handleGeocodeVille(e.parameter);

      // === SECTEUR ===
      case 'getsecteurs':
        return handleGetSecteurs(e.parameter);

      case 'getsecteur':
        return handleGetSecteur(e.parameter);

      case 'secteursbyville':
        return handleSecteursByVille(e.parameter);

      // === DISTANCE ===
      case 'calculatedistance':
        return handleCalculateDistance(e.parameter);

      case 'calculatedistances':
        return handleCalculateDistances(e.parameter);

      // === UTILS ===
      case 'ping':
        return createJsonResponse({
          status: 'ok',
          message: 'GEO API opérationnelle',
          timestamp: new Date().toISOString()
        });

      default:
        return createErrorResponse(
          'INVALID_ACTION',
          `Action "${action}" inconnue`
        );
    }

  } catch (error) {
    logWithTimestamp(`❌ Erreur API: ${error.message}`, 'ERROR');
    return createErrorResponse(
      'INTERNAL_ERROR',
      error.message,
      500
    );
  }
}

/**
 * Point d'entrée POST pour le Web App
 * @param {Object} e - Événement de requête
 * @returns {GoogleAppsScript.Content.TextOutput} Réponse JSON
 */
function doPost(e) {
  try {
    logWithTimestamp(`📥 Requête POST`, 'INFO');

    // Parser le body JSON
    let params = {};

    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseError) {
        return createErrorResponse(
          'INVALID_JSON',
          'Corps de requête JSON invalide'
        );
      }
    }

    // Fusionner avec les paramètres de query string
    params = { ...e.parameter, ...params };

    // Vérification de l'authentification
    const apiKey = params.apiKey || params.api_key;
    if (!checkAuthentication(apiKey)) {
      return createErrorResponse(
        CONFIG.ERRORS.UNAUTHORIZED,
        'Clé API invalide ou manquante',
        401
      );
    }

    const action = params.action;

    if (!action) {
      return createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "action" manquant'
      );
    }

    // Actions POST (création, mise à jour, suppression)
    switch (action.toLowerCase()) {
      // === QUARTIER CRUD ===
      case 'createquartier':
        return handleCreateQuartier(params);

      case 'updatequartier':
        return handleUpdateQuartier(params);

      case 'deletequartier':
        return handleDeleteQuartier(params);

      // === VILLE CRUD ===
      case 'createville':
        return handleCreateVille(params);

      case 'updateville':
        return handleUpdateVille(params);

      case 'deleteville':
        return handleDeleteVille(params);

      // === SECTEUR CRUD ===
      case 'createsecteur':
        return handleCreateSecteur(params);

      case 'updatesecteur':
        return handleUpdateSecteur(params);

      case 'deletesecteur':
        return handleDeleteSecteur(params);

      // === BATCH ===
      case 'batchgeocode':
        return handleBatchGeocode(params);

      case 'geocodequartiersofville':
        return handleGeocodeQuartiersOfVille(params);

      default:
        return createErrorResponse(
          'INVALID_ACTION',
          `Action POST "${action}" inconnue`
        );
    }

  } catch (error) {
    logWithTimestamp(`❌ Erreur API POST: ${error.message}`, 'ERROR');
    return createErrorResponse(
      'INTERNAL_ERROR',
      error.message,
      500
    );
  }
}

// ========================================
// HANDLERS - GEOCODING
// ========================================

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

// ========================================
// HANDLERS - QUARTIER
// ========================================

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

// ========================================
// HANDLERS - VILLE
// ========================================

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

// ========================================
// HANDLERS - SECTEUR
// ========================================

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

// ========================================
// HANDLERS - DISTANCE
// ========================================

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