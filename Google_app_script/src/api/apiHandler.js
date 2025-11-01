/**
 * Gestionnaire API REST - Point d'entrée principal
 */

/**
 * Point d'entrée GET
 */
function doGet(e) {
  try {
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
      'quartiersinradius': () => APIHandlers.handleQuartiersInRadius(params),

      // Ville
      'getvilles': () => APIHandlers.handleGetVilles(params),
      'getville': () => APIHandlers.handleGetVille(params),
      'searchvilles': () => APIHandlers.handleSearchVilles(params),

      // Secteur
      'getsecteurs': () => APIHandlers.handleGetSecteurs(params),
      'getsecteur': () => APIHandlers.handleGetSecteur(params),
      'secteursbyville': () => APIHandlers.handleSecteursByVille(params),

      // Distance
      'calculatedistance': () => APIHandlers.handleCalculateDistance(params),

      // Ping
      'ping': () => Utils.createJsonResponse({
        status: 'ok',
        message: 'GEO API opérationnelle',
        version: '3.0',
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
   * Routes POST
   */
  routePost(action, params) {
    const routes = {
      // CRUD Quartier
      'createquartier': () => APIHandlers.handleCreateQuartier(params),
      'updatequartier': () => APIHandlers.handleUpdateQuartier(params),
      'deletequartier': () => APIHandlers.handleDeleteQuartier(params),

      // CRUD Ville
      'createville': () => APIHandlers.handleCreateVille(params),
      'updateville': () => APIHandlers.handleUpdateVille(params),
      'deleteville': () => APIHandlers.handleDeleteVille(params),

      // CRUD Secteur
      'createsecteur': () => APIHandlers.handleCreateSecteur(params),
      'updatesecteur': () => APIHandlers.handleUpdateSecteur(params),
      'deletesecteur': () => APIHandlers.handleDeleteSecteur(params),

      // Batch
      'geocodequartiersofville': () => APIHandlers.handleGeocodeQuartiersOfVille(params)
    };

    const handler = routes[action];

    if (!handler) {
      return Utils.createErrorResponse(
        'INVALID_ACTION',
        `Action POST "${action}" inconnue`
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
    const maxDistance = params.maxDistance ? parseFloat(params.maxDistance) : null;

    if (isNaN(lat) || isNaN(lng)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres "lat" et "lng" requis'
      );
    }

    const result = QuartierService.findNearestQuartier(lat, lng, maxDistance);

    if (!result) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.NO_MATCH,
        'Aucun quartier trouvé',
        404
      );
    }

    return Utils.createJsonResponse(result);
  },

  handleGetQuartiers(params) {
    const idSecteur = params.idSecteur || params.id_secteur;

    let quartiers;

    if (idSecteur) {
      quartiers = QuartierService.getQuartiersBySecteur(idSecteur);
    } else {
      quartiers = DataService.loadAll('QUARTIERS');
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

    const quartiers = QuartierService.getQuartiersByVille(idVille);

    return Utils.createJsonResponse({
      idVille: idVille,
      count: quartiers.length,
      quartiers: quartiers
    });
  },

  handleQuartiersInRadius(params) {
    const lat = parseFloat(params.lat || params.latitude);
    const lng = parseFloat(params.lng || params.longitude);
    const radius = parseFloat(params.radius || params.radiusKm || 10);

    if (isNaN(lat) || isNaN(lng)) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres "lat" et "lng" requis'
      );
    }

    const quartiers = QuartierService.findQuartiersInRadius(lat, lng, radius);

    return Utils.createJsonResponse({
      center: { latitude: lat, longitude: lng },
      radiusKm: radius,
      count: quartiers.length,
      quartiers: quartiers
    });
  },

  handleCreateQuartier(params) {
    const quartier = {
      nom: params.nom,
      centreLatitude: parseFloat(params.latitude),
      centreLongitude: parseFloat(params.longitude),
      idSecteur: params.idSecteur || params.id_secteur
    };

    if (!quartier.nom || isNaN(quartier.centreLatitude) ||
      isNaN(quartier.centreLongitude) || !quartier.idSecteur) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres manquants: nom, latitude, longitude, idSecteur requis'
      );
    }

    const result = DataService.create('QUARTIERS', quartier);

    return Utils.createJsonResponse({
      success: true,
      quartier: result
    });
  },

  handleUpdateQuartier(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const updates = {};
    if (params.nom) updates.nom = params.nom;
    if (params.latitude) updates.centreLatitude = parseFloat(params.latitude);
    if (params.longitude) updates.centreLongitude = parseFloat(params.longitude);
    if (params.idSecteur || params.id_secteur) {
      updates.idSecteur = params.idSecteur || params.id_secteur;
    }

    DataService.update('QUARTIERS', params.id, updates);

    return Utils.createJsonResponse({
      success: true,
      message: `Quartier ${params.id} mis à jour`
    });
  },

  handleDeleteQuartier(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    DataService.delete('QUARTIERS', params.id);

    return Utils.createJsonResponse({
      success: true,
      message: `Quartier ${params.id} supprimé`
    });
  },

  handleGeocodeQuartiersOfVille(params) {
    const idVille = params.idVille || params.id_ville;

    if (!idVille) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "idVille" requis'
      );
    }

    const results = GeocodingService.geocodeQuartiersOfVille(idVille);

    return Utils.createJsonResponse({
      idVille: idVille,
      total: results.total,
      success: results.success,
      failed: results.failed,
      details: results.details
    });
  },

  // ========== VILLE ==========

  handleGetVilles() {
    const villes = DataService.loadAll('VILLES', false);

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

    let villes = DataService.loadAll('VILLES', false);

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

  handleCreateVille(params) {
    const ville = {
      nom: params.nom,
      codePostal: params.codePostal || params.code_postal,
      departement: params.departement,
      pays: params.pays || 'France'
    };

    if (!ville.nom || !ville.codePostal) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres manquants: nom et codePostal requis'
      );
    }

    const result = DataService.create('VILLES', ville);

    return Utils.createJsonResponse({
      success: true,
      ville: result
    });
  },

  handleUpdateVille(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const updates = {};
    if (params.nom) updates.nom = params.nom;
    if (params.codePostal || params.code_postal) {
      updates.codePostal = params.codePostal || params.code_postal;
    }
    if (params.departement) updates.departement = params.departement;
    if (params.pays) updates.pays = params.pays;

    DataService.update('VILLES', params.id, updates);

    return Utils.createJsonResponse({
      success: true,
      message: `Ville ${params.id} mise à jour`
    });
  },

  handleDeleteVille(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    DataService.delete('VILLES', params.id);

    return Utils.createJsonResponse({
      success: true,
      message: `Ville ${params.id} supprimée`
    });
  },

  // ========== SECTEUR ==========

  handleGetSecteurs() {
    const secteurs = DataService.loadAll('SECTEURS', false);

    return Utils.createJsonResponse({
      count: secteurs.length,
      secteurs: secteurs
    });
  },

  handleGetSecteur(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const secteur = DataService.findById('SECTEURS', params.id);

    if (!secteur) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.SECTEUR_NOT_FOUND,
        `Secteur ${params.id} introuvable`,
        404
      );
    }

    return Utils.createJsonResponse(secteur);
  },

  handleSecteursByVille(params) {
    const idVille = params.idVille || params.id_ville;

    if (!idVille) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "idVille" requis'
      );
    }

    const secteurs = DataService.loadAll('SECTEURS', false)
      .filter(s => s.idVille == idVille);

    return Utils.createJsonResponse({
      idVille: idVille,
      count: secteurs.length,
      secteurs: secteurs
    });
  },

  handleCreateSecteur(params) {
    const secteur = {
      nom: params.nom,
      centreLatitude: params.latitude ? parseFloat(params.latitude) : null,
      centreLongitude: params.longitude ? parseFloat(params.longitude) : null,
      idVille: params.idVille || params.id_ville
    };

    if (!secteur.nom || !secteur.idVille) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètres manquants: nom et idVille requis'
      );
    }

    const result = DataService.create('SECTEURS', secteur);

    return Utils.createJsonResponse({
      success: true,
      secteur: result
    });
  },

  handleUpdateSecteur(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    const updates = {};
    if (params.nom) updates.nom = params.nom;
    if (params.latitude) updates.centreLatitude = parseFloat(params.latitude);
    if (params.longitude) updates.centreLongitude = parseFloat(params.longitude);
    if (params.idVille || params.id_ville) {
      updates.idVille = params.idVille || params.id_ville;
    }

    DataService.update('SECTEURS', params.id, updates);

    return Utils.createJsonResponse({
      success: true,
      message: `Secteur ${params.id} mis à jour`
    });
  },

  handleDeleteSecteur(params) {
    if (!params.id) {
      return Utils.createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "id" requis'
      );
    }

    DataService.delete('SECTEURS', params.id);

    return Utils.createJsonResponse({
      success: true,
      message: `Secteur ${params.id} supprimé`
    });
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