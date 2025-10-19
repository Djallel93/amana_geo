/**
 * Point d'entrée GET pour le Web App
 * @param {Object} e - Événement de requête
 * @returns {GoogleAppsScript.Content.TextOutput} Réponse JSON
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (!action) {
      return createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "action" manquant'
      );
    }

    return routeGetAction(action.toLowerCase(), e.parameter);

  } catch (error) {
    console.log(`❌ Erreur API: ${error.message}`);
    return createErrorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

/**
 * Point d'entrée POST pour le Web App
 * @param {Object} e - Événement de requête
 * @returns {GoogleAppsScript.Content.TextOutput} Réponse JSON
 */
function doPost(e) {
  try {
    let params = {};

    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseError) {
        return createErrorResponse('INVALID_JSON', 'Corps de requête JSON invalide');
      }
    }

    params = { ...e.parameter, ...params };
    const action = params.action;

    if (!action) {
      return createErrorResponse(
        CONFIG.ERRORS.MISSING_PARAMETERS,
        'Paramètre "action" manquant'
      );
    }

    return routePostAction(action.toLowerCase(), params);

  } catch (error) {
    console.log(`❌ Erreur API POST: ${error.message}`);
    return createErrorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

// ========================================
// ROUTEURS
// ========================================

/**
 * Route les actions GET vers les handlers appropriés
 */
function routeGetAction(action, params) {
  const routes = {
    // Géocodage
    'geocode': () => handleGeocode(params),
    'reversegeocode': () => handleReverseGeocode(params),
    'validate': () => handleValidateAddress(params),

    // Quartier
    'findquartier': () => handleFindQuartier(params),
    'getquartiers': () => handleGetQuartiers(params),
    'getquartier': () => handleGetQuartier(params),
    'geocodequartier': () => handleGeocodeQuartier(params),
    'quartiersbyville': () => handleQuartiersByVille(params),
    'quartiersinradius': () => handleQuartiersInRadius(params),

    // Ville
    'getvilles': () => handleGetVilles(params),
    'getville': () => handleGetVille(params),
    'searchvilles': () => handleSearchVilles(params),
    'geocodeville': () => handleGeocodeVille(params),

    // Secteur
    'getsecteurs': () => handleGetSecteurs(params),
    'getsecteur': () => handleGetSecteur(params),
    'secteursbyville': () => handleSecteursByVille(params),

    // Distance
    'calculatedistance': () => handleCalculateDistance(params),
    'calculatedistances': () => handleCalculateDistances(params),

    // Utils
    'ping': () => createJsonResponse({
      status: 'ok',
      message: 'GEO API opérationnelle',
      timestamp: new Date().toISOString()
    })
  };

  const handler = routes[action];

  if (!handler) {
    return createErrorResponse('INVALID_ACTION', `Action "${action}" inconnue`);
  }

  return handler();
}

/**
 * Route les actions POST vers les handlers appropriés
 */
function routePostAction(action, params) {
  const routes = {
    // Quartier CRUD
    'createquartier': () => handleCreateQuartier(params),
    'updatequartier': () => handleUpdateQuartier(params),
    'deletequartier': () => handleDeleteQuartier(params),

    // Ville CRUD
    'createville': () => handleCreateVille(params),
    'updateville': () => handleUpdateVille(params),
    'deleteville': () => handleDeleteVille(params),

    // Secteur CRUD
    'createsecteur': () => handleCreateSecteur(params),
    'updatesecteur': () => handleUpdateSecteur(params),
    'deletesecteur': () => handleDeleteSecteur(params),

    // Batch
    'batchgeocode': () => handleBatchGeocode(params),
    'geocodequartiersofville': () => handleGeocodeQuartiersOfVille(params)
  };

  const handler = routes[action];

  if (!handler) {
    return createErrorResponse('INVALID_ACTION', `Action POST "${action}" inconnue`);
  }

  return handler();
}