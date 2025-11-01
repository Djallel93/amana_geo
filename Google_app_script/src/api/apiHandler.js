/**
 * Gestionnaire API REST - Read-Only avec authentification API Key
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
    // Vérifier l'authentification
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
    // Vérifier l'authentification dans les headers
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
 * Routeur API - READ ONLY
 */
const APIRouter = {

  /**
   * Routes GET
   */
  routeGet(action, params) {
    const routes = {
      // Géocodage
      'geocode': () => APIHandlers.handleGeocode(params),
      'reversegeocode': () => APIHandlers.handleReverseGeocode(params),

      // Quartier
      'findquartier': () => APIHandlers.handleFindQuartier(params),
      'getquartiers': () => APIHandlers.handleGetQuartiers(params),
      'getquartier': () => APIHandlers.handleGetQuartier(params),
      'quartiersbyville': () => APIHandlers.handleQuartiersByVille(params),

      // Ville
      'getvilles': () => APIHandlers.handleGetVilles(params),
      'getville': () => APIHandlers.handleGetVille(params),
      'searchvilles': () => APIHandlers.handleSearchVilles(params),
      'findville': () => APIHandlers.handleFindVille(params),

      // Distance
      'calculatedistance': () => APIHandlers.handleCalculateDistance(params),

      // Ping
      'ping': () => Utils.createJsonResponse({
        status: 'ok',
        message: 'GEO API opérationnelle (Read-Only)',
        version: '4.0',
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

  /**
   * Routes POST - Limitées
   */
  routePost(action, params) {
    // Pour l'instant, toutes les actions sont en GET
    // POST réservé pour futures fonctionnalités
    return Utils.createErrorResponse(
      'METHOD_NOT_ALLOWED',
      'API en lecture seule. Utilisez GET.',
      405
    );
  }
};

/**
 * Handlers API - READ ONLY
 */
const APIHandlers = {

  // ========== GÉOCODAGE ==========

  handleGeocode(params) {
    if (!params.address) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "address" manquant'
      );
    }

    const result = GeocodingService.geocodeAddress(params.address, params.country);
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

  // ========== QUARTIER ==========

  handleFindQuartier(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres "lat" et "lng" requis'
      );
    }

    try {
      const result = GeocodingService.resolveQuartierFromCoordinates(lat, lng);
      return Utils.createJsonResponse(result);
    } catch (error) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.NO_MATCH,
        error.message,
        404
      );
    }
  },

  handleGetQuartiers(params) {
    const idVille = params.idVille || params.id_ville;

    let quartiers = DataService.loadAll('QUARTIERS');

    if (idVille) {
      quartiers = quartiers.filter(q => q.idVille == idVille);
    }

    return Utils.createJsonResponse({
      count: quartiers.length,
      quartiers: quartiers
    });
  },

  handleGetQuartier(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const quartier = DataService.findById('QUARTIERS', params.id);

    if (!quartier) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.QUARTIER_NOT_FOUND,
        `Quartier ${params.id} introuvable`,
        404
      );
    }

    return Utils.createJsonResponse(quartier);
  },

  handleQuartiersByVille(params) {
    const idVille = params.idVille || params.id_ville;

    if (!idVille) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "idVille" requis'
      );
    }

    const quartiers = DataService.loadAll('QUARTIERS')
      .filter(q => q.idVille == idVille);

    return Utils.createJsonResponse({
      idVille: idVille,
      count: quartiers.length,
      quartiers: quartiers
    });
  },

  // ========== VILLE ==========

  handleGetVilles() {
    const villes = DataService.loadAll('VILLES');

    return Utils.createJsonResponse({
      count: villes.length,
      villes: villes
    });
  },

  handleGetVille(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const ville = DataService.findById('VILLES', params.id);

    if (!ville) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.VILLE_NOT_FOUND,
        `Ville ${params.id} introuvable`,
        404
      );
    }

    return Utils.createJsonResponse(ville);
  },

  handleSearchVilles(params) {
    const codePostal = params.codePostal || params.code_postal;
    const nom = params.nom || params.name;

    if (!codePostal && !nom) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "codePostal" ou "nom" requis'
      );
    }

    let villes = DataService.loadAll('VILLES');

    if (codePostal) {
      villes = villes.filter(v => v.codePostal == codePostal);
    } else if (nom) {
      const searchTerm = nom.toLowerCase();
      villes = villes.filter(v => v.nom.toLowerCase().includes(searchTerm));
    }

    return Utils.createJsonResponse({
      count: villes.length,
      villes: villes
    });
  },

  handleFindVille(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres "lat" et "lng" requis'
      );
    }

    try {
      const result = GeocodingService.resolveVilleFromCoordinates(lat, lng);
      return Utils.createJsonResponse(result);
    } catch (error) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.NO_MATCH,
        error.message,
        404
      );
    }
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
  }
};