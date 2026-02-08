/**
 * Gestionnaire API REST - Version 5.1 avec traitement par lot
 */

/**
 * Vérifie l'API Key dans le header
 */
function checkAuthentication(headers) {
  const apiKey = headers['x-api-key'] || headers['X-Api-Key'];
  const validKey = CONFIG.AUTH.API_KEY;

  if (!validKey) {
    Logger.error('API_KEY non configurée dans Script Properties');
    return false;
  }

  if (!apiKey || apiKey !== validKey) {
    Logger.warn('Tentative d\'accès non autorisée');
    return false;
  }

  return true;
}

/**
 * Point d'entrée GET
 */
function doGet(e) {
  try {
    const headers = e.parameter;
    if (!checkAuthentication(headers)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.UNAUTHORIZED,
        'API Key invalide ou manquante. Ajoutez le header X-Api-Key',
        401
      );
    }

    const action = e.parameter.action;

    if (!action) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "action" manquant'
      );
    }

    return APIRouter.routeGet(action.toLowerCase(), e.parameter);

  } catch (error) {
    Logger.error(`Erreur API GET`, { error: error.message });
    return Utils.createErrorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

/**
 * Point d'entrée POST
 */
function doPost(e) {
  try {
    const headers = e.parameter;
    if (!checkAuthentication(headers)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.UNAUTHORIZED,
        'API Key invalide ou manquante. Ajoutez le header X-Api-Key',
        401
      );
    }

    let params = {};

    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseError) {
        return Utils.createErrorResponse(
          'INVALID_JSON',
          'Corps de requête JSON invalide'
        );
      }
    }

    params = { ...e.parameter, ...params };
    const action = params.action;

    if (!action) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "action" manquant'
      );
    }

    return APIRouter.routePost(action.toLowerCase(), params);

  } catch (error) {
    Logger.error(`Erreur API POST`, { error: error.message });
    return Utils.createErrorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

/**
 * Routeur API
 */
const APIRouter = {

  routeGet(action, params) {
    const routes = {
      'geocode': () => APIHandlers.handleGeocode(params),
      'reversegeocode': () => APIHandlers.handleReverseGeocode(params),
      'resolvelocation': () => APIHandlers.handleResolveLocation(params),
      'validatequartier': () => APIHandlers.handleValidateQuartier(params),
      'validatesecteur': () => APIHandlers.handleValidateSecteur(params),
      'validateville': () => APIHandlers.handleValidateVille(params),
      'getquartiers': () => APIHandlers.handleGetQuartiers(params),
      'getquartier': () => APIHandlers.handleGetQuartier(params),
      'quartiersbysecteur': () => APIHandlers.handleQuartiersBySecteur(params),
      'getsecteurs': () => APIHandlers.handleGetSecteurs(params),
      'getsecteur': () => APIHandlers.handleGetSecteur(params),
      'secteursbyville': () => APIHandlers.handleSecteursByVille(params),
      'getvilles': () => APIHandlers.handleGetVilles(params),
      'getville': () => APIHandlers.handleGetVille(params),
      'searchvilles': () => APIHandlers.handleSearchVilles(params),
      'calculatedistance': () => APIHandlers.handleCalculateDistance(params),
      'ping': () => Utils.createJsonResponse({
        status: 'ok',
        message: 'GEO API opérationnelle v5.1 (Batch processing)',
        version: '5.1',
        timestamp: new Date().toISOString()
      })
    };

    const handler = routes[action];

    if (!handler) {
      return Utils.createErrorResponse(
        'INVALID_ACTION',
        `Action "${action}" inconnue`
      );
    }

    return handler();
  },

  routePost(action, params) {
    const routes = {
      'batchgeocode': () => APIHandlers.handleBatchGeocode(params),
      'batchresolvelocation': () => APIHandlers.handleBatchResolveLocation(params),
      'batchcalculatedistance': () => APIHandlers.handleBatchCalculateDistance(params)
    };

    const handler = routes[action];

    if (!handler) {
      return Utils.createErrorResponse(
        'METHOD_NOT_ALLOWED',
        `Action POST "${action}" non supportée. Actions disponibles: batchgeocode, batchresolvelocation, batchcalculatedistance`,
        405
      );
    }

    return handler();
  }
};

/**
 * Handlers API
 */
const APIHandlers = {

  // ========== GÉOCODAGE ==========

  handleGeocode(params) {
    if (!params.adresse) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "adresse" manquant'
      );
    }

    const result = GeocodingService.geocodeAddress(
      params.adresse,
      params.ville,
      params.codePostal || params.code_postal,
      params.pays
    );

    return Utils.createJsonResponse(result);
  },

  handleReverseGeocode(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres "lat" et "lng" requis'
      );
    }

    const result = GeocodingService.reverseGeocode(lat, lng);
    return Utils.createJsonResponse(result);
  },

  // ========== BATCH GÉOCODAGE ==========

  handleBatchGeocode(params) {
    if (!params.adresses || !Array.isArray(params.adresses)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "adresses" requis (tableau d\'objets avec adresse, ville?, codePostal?, pays?)'
      );
    }

    return BatchService.batchGeocode(params.adresses);
  },

  // ========== RÉSOLUTION ==========

  handleResolveLocation(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres "lat" et "lng" requis'
      );
    }

    try {
      const result = GeocodingService.resolveLocation(lat, lng);
      return Utils.createJsonResponse(result);
    } catch (error) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.NO_MATCH,
        error.message,
        404
      );
    }
  },

  handleBatchResolveLocation(params) {
    if (!params.coordinates || !Array.isArray(params.coordinates)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "coordinates" requis (tableau d\'objets avec lat et lng)'
      );
    }

    return BatchService.batchResolveLocation(params.coordinates);
  },

  // ========== VALIDATION ==========

  handleValidateQuartier(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const result = GeocodingService.validateQuartier(params.id);
    return Utils.createJsonResponse(result);
  },

  handleValidateSecteur(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const result = GeocodingService.validateSecteur(params.id);
    return Utils.createJsonResponse(result);
  },

  handleValidateVille(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const result = GeocodingService.validateVille(params.id);
    return Utils.createJsonResponse(result);
  },

  // ========== QUARTIER, SECTEUR, VILLE (inchangé) ==========

  handleGetQuartiers(params) {
    const idSecteur = params.idSecteur || params.id_secteur;
    let quartiers = DataService.loadAll('QUARTIERS');
    if (idSecteur) quartiers = quartiers.filter(q => q.idSecteur == idSecteur);
    quartiers = DataService.stripPolygons(quartiers);
    return Utils.createJsonResponse({ count: quartiers.length, quartiers: quartiers });
  },

  handleGetQuartier(params) {
    if (!params.id) return Utils.createErrorResponse(CONFIG.ERRORS.MISSING_PARAMETERS, 'Paramètre "id" requis');
    const quartier = DataService.findById('QUARTIERS', params.id);
    if (!quartier) return Utils.createErrorResponse(CONFIG.ERRORS.QUARTIER_NOT_FOUND, `Quartier ${params.id} introuvable`, 404);
    return Utils.createJsonResponse(DataService.stripPolygons(quartier));
  },

  handleQuartiersBySecteur(params) {
    const idSecteur = params.idSecteur || params.id_secteur;
    if (!idSecteur) return Utils.createErrorResponse(CONFIG.ERRORS.MISSING_PARAMETERS, 'Paramètre "idSecteur" requis');
    let quartiers = DataService.loadAll('QUARTIERS').filter(q => q.idSecteur == idSecteur);
    quartiers = DataService.stripPolygons(quartiers);
    return Utils.createJsonResponse({ idSecteur: idSecteur, count: quartiers.length, quartiers: quartiers });
  },

  handleGetSecteurs(params) {
    const idVille = params.idVille || params.id_ville;
    let secteurs = DataService.loadAll('SECTEURS');
    if (idVille) secteurs = secteurs.filter(s => s.idVille == idVille);
    secteurs = DataService.stripPolygons(secteurs);
    return Utils.createJsonResponse({ count: secteurs.length, secteurs: secteurs });
  },

  handleGetSecteur(params) {
    if (!params.id) return Utils.createErrorResponse(CONFIG.ERRORS.MISSING_PARAMETERS, 'Paramètre "id" requis');
    const secteur = DataService.findById('SECTEURS', params.id);
    if (!secteur) return Utils.createErrorResponse(CONFIG.ERRORS.SECTEUR_NOT_FOUND, `Secteur ${params.id} introuvable`, 404);
    return Utils.createJsonResponse(DataService.stripPolygons(secteur));
  },

  handleSecteursByVille(params) {
    const idVille = params.idVille || params.id_ville;
    if (!idVille) return Utils.createErrorResponse(CONFIG.ERRORS.MISSING_PARAMETERS, 'Paramètre "idVille" requis');
    let secteurs = DataService.loadAll('SECTEURS').filter(s => s.idVille == idVille);
    secteurs = DataService.stripPolygons(secteurs);
    return Utils.createJsonResponse({ idVille: idVille, count: secteurs.length, secteurs: secteurs });
  },

  handleGetVilles() {
    let villes = DataService.loadAll('VILLES');
    villes = DataService.stripPolygons(villes);
    return Utils.createJsonResponse({ count: villes.length, villes: villes });
  },

  handleGetVille(params) {
    if (!params.id) return Utils.createErrorResponse(CONFIG.ERRORS.MISSING_PARAMETERS, 'Paramètre "id" requis');
    const ville = DataService.findById('VILLES', params.id);
    if (!ville) return Utils.createErrorResponse(CONFIG.ERRORS.VILLE_NOT_FOUND, `Ville ${params.id} introuvable`, 404);
    return Utils.createJsonResponse(DataService.stripPolygons(ville));
  },

  handleSearchVilles(params) {
    const codePostal = params.codePostal || params.code_postal;
    const nom = params.nom || params.name;
    if (!codePostal && !nom) return Utils.createErrorResponse(CONFIG.ERRORS.MISSING_PARAMETERS, 'Paramètre "codePostal" ou "nom" requis');
    let villes = DataService.loadAll('VILLES');
    if (codePostal) villes = villes.filter(v => v.codePostal == codePostal);
    else if (nom) villes = villes.filter(v => v.nom.toLowerCase().includes(nom.toLowerCase()));
    villes = DataService.stripPolygons(villes);
    return Utils.createJsonResponse({ count: villes.length, villes: villes });
  },

  // ========== DISTANCE ==========

  handleCalculateDistance(params) {
    const lat1 = parseFloat(params.lat1);
    const lng1 = parseFloat(params.lng1);
    const lat2 = parseFloat(params.lat2);
    const lng2 = parseFloat(params.lng2);

    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres "lat1", "lng1", "lat2", "lng2" requis'
      );
    }

    const distance = Utils.calculateDistance(lat1, lng1, lat2, lng2);

    return Utils.createJsonResponse({
      distance: distance,
      unit: 'km',
      from: { latitude: lat1, longitude: lng1 },
      to: { latitude: lat2, longitude: lng2 }
    });
  },

  handleBatchCalculateDistance(params) {
    if (!params.coordinates || !Array.isArray(params.coordinates)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "coordinates" requis (tableau d\'objets avec lat et lng)'
      );
    }

    if (!params.reference || !params.reference.lat || !params.reference.lng) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "reference" requis (objet avec lat et lng)'
      );
    }

    return BatchService.batchCalculateDistance(params.coordinates, params.reference);
  }
};