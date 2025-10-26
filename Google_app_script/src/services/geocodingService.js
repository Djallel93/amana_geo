// ============================================================================
// FICHIER: geocodingService.js
// Description: Géocodage d'adresses avec résolution point-in-polygon
// ============================================================================

/**
 * 🎯 Service de géocodage amélioré avec support polygonal
 * 
 * Stratégie de résolution (ordre de priorité):
 * 1️⃣ Point dans UN seul polygon → retour immédiat
 * 2️⃣ Point dans PLUSIEURS polygons → choisir le plus petit (aire)
 * 3️⃣ Point HORS polygons + centroid proche (< seuil) → assigner
 * 4️⃣ Fallback → centroid du secteur/ville parent
 */

/**
 * 🔍 Fonction principale: trouve le quartier depuis une adresse
 * 
 * @param {string} address - Adresse à géocoder
 * @returns {Object} Résultat avec quartier + méthode de résolution
 */
function findQuartierFromAddress(address) {
  Logger.log(`🔍 Géocodage adresse: ${address}`);

  // Étape 1: Géocoder l'adresse → coordonnées
  const geocodeResult = geocodeAddress(address);

  if (!geocodeResult || !geocodeResult.isValid) {
    throw new Error('❌ Impossible de géocoder cette adresse');
  }

  const { latitude, longitude } = geocodeResult.coordinates;
  Logger.log(`📍 Coordonnées: ${latitude}, ${longitude}`);

  // Étape 2: Résolution avec polygones
  return resolveQuartierFromCoordinates(latitude, longitude);
}

/**
 * 🎯 Résolution quartier depuis coordonnées (avec polygones)
 */
function resolveQuartierFromCoordinates(lat, lng) {
  // Charger tous les quartiers avec polygones
  const quartiers = loadQuartiersWithPolygons();

  if (quartiers.length === 0) {
    throw new Error('⚠️ Aucun quartier en base de données');
  }

  Logger.log(`📋 ${quartiers.length} quartiers chargés`);

  // 🔍 ÉTAPE 1: Chercher dans les polygones
  const matchingPolygons = [];

  for (const q of quartiers) {
    if (q.polygon && isPointInPolygon(lat, lng, q.polygon)) {
      const area = polygonArea(q.polygon);
      matchingPolygons.push({ quartier: q, area: area });
      Logger.log(`  ✅ Point dans polygon: ${q.nom} (aire: ${area.toFixed(6)})`);
    }
  }

  // ✅ CAS 1: UN SEUL polygon match
  if (matchingPolygons.length === 1) {
    Logger.log(`🎯 Résolution: point-in-polygon (unique)`);
    return formatQuartierResult(matchingPolygons[0].quartier, 'point-in-polygon');
  }

  // ✅ CAS 2: PLUSIEURS polygons (choisir le plus petit)
  if (matchingPolygons.length > 1) {
    matchingPolygons.sort((a, b) => a.area - b.area);
    const smallest = matchingPolygons[0];

    Logger.log(`🎯 Résolution: point-in-multiple-polygons (choix plus petit: ${smallest.quartier.nom})`);
    return formatQuartierResult(
      smallest.quartier,
      'point-in-polygon-smallest',
      `Point dans ${matchingPolygons.length} polygones, plus petit sélectionné`
    );
  }

  // 🔍 ÉTAPE 2: Aucun polygon match → chercher centroid proche
  Logger.log(`⚠️ Point hors polygons, recherche centroid proche...`);

  const threshold = CONFIG.GEO.NEAREST_THRESHOLD_M / 1000; // Convertir m → km
  let nearestCentroid = null;
  let minDistance = Infinity;

  for (const q of quartiers) {
    if (!q.centreLat || !q.centreLng) continue;

    const distance = haversineDistance(lat, lng, q.centreLat, q.centreLng);

    if (distance < minDistance) {
      minDistance = distance;
      nearestCentroid = q;
    }
  }

  // ✅ CAS 3: Centroid dans le seuil
  if (nearestCentroid && minDistance <= threshold) {
    Logger.log(`🎯 Résolution: nearest-centroid-within-threshold (${(minDistance * 1000).toFixed(0)}m < ${CONFIG.GEO.NEAREST_THRESHOLD_M}m)`);
    return formatQuartierResult(
      nearestCentroid,
      'nearest-centroid-within-threshold',
      `Distance: ${(minDistance * 1000).toFixed(0)}m`
    );
  }

  // 🔍 ÉTAPE 3: FALLBACK → centroid du secteur parent
  Logger.log(`⚠️ Distance trop grande (${(minDistance * 1000).toFixed(0)}m), fallback secteur...`);

  const fallbackSecteur = findFallbackSecteur(lat, lng, nearestCentroid);

  if (fallbackSecteur) {
    Logger.log(`🎯 Résolution: fallback-to-secteur-centroid`);
    return formatQuartierResult(
      fallbackSecteur,
      'fallback-to-secteur-centroid',
      `Point trop éloigné, centroid du secteur "${fallbackSecteur.secteurNom}" utilisé`
    );
  }

  // ❌ Aucune solution trouvée
  throw new Error(`❌ Aucun quartier trouvé (point trop éloigné: ${(minDistance * 1000).toFixed(0)}m)`);
}

/**
 * 🔄 Fallback: chercher le centroid du secteur le plus proche
 */
function findFallbackSecteur(lat, lng, nearestQuartier) {
  if (!nearestQuartier) return null;

  // Récupérer le secteur du quartier le plus proche
  const secteur = getSecteurById(nearestQuartier.idSecteur);

  if (!secteur || !secteur.centreLat || !secteur.centreLng) {
    // Fallback niveau 2: calculer centroid des quartiers du secteur
    const quartiersInSecteur = loadQuartiersWithPolygons().filter(
      q => q.idSecteur === nearestQuartier.idSecteur
    );

    if (quartiersInSecteur.length > 0) {
      const avgLat = quartiersInSecteur.reduce((sum, q) => sum + (q.centreLat || 0), 0) / quartiersInSecteur.length;
      const avgLng = quartiersInSecteur.reduce((sum, q) => sum + (q.centreLng || 0), 0) / quartiersInSecteur.length;

      return {
        ...nearestQuartier,
        centreLat: avgLat,
        centreLng: avgLng,
        secteurNom: secteur ? secteur.nom : 'Inconnu'
      };
    }
  }

  return {
    ...nearestQuartier,
    centreLat: secteur.centreLat,
    centreLng: secteur.centreLng,
    secteurNom: secteur.nom
  };
}

/**
 * 📦 Charge tous les quartiers avec leurs polygones
 */
function loadQuartiersWithPolygons() {
  const sheet = getSheet(CONFIG.SHEETS.QUARTIERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];

  const quartiers = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const polygonStr = row[CONFIG.COLUMNS.QUARTIERS.POLYGON];

    const quartier = {
      id: row[CONFIG.COLUMNS.QUARTIERS.ID],
      nom: row[CONFIG.COLUMNS.QUARTIERS.NOM],
      centreLat: parseFloat(row[CONFIG.COLUMNS.QUARTIERS.CENTRE_LAT]),
      centreLng: parseFloat(row[CONFIG.COLUMNS.QUARTIERS.CENTRE_LNG]),
      idSecteur: row[CONFIG.COLUMNS.QUARTIERS.ID_SECTEUR],
      polygon: parseGeoJSONPolygon(polygonStr)
    };

    // Vérifier validité coordonnées
    if (isNaN(quartier.centreLat)) quartier.centreLat = null;
    if (isNaN(quartier.centreLng)) quartier.centreLng = null;

    quartiers.push(quartier);
  }

  return quartiers;
}

/**
 * 📝 Formate le résultat final
 */
function formatQuartierResult(quartier, resolutionMethod, details = null) {
  return {
    success: true,
    quartierId: quartier.id,
    quartierNom: quartier.nom,
    centreLat: quartier.centreLat,
    centreLng: quartier.centreLng,
    idSecteur: quartier.idSecteur,
    resolutionMethod: resolutionMethod,
    resolutionDetails: details,
    timestamp: new Date().toISOString()
  };
}

/**
 * 🌍 Géocode une adresse (wrapper Google Maps)
 */
function geocodeAddress(address) {
  // Vérifier cache
  const cacheKey = `geocode_${address.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = CacheService.getScriptCache().get(cacheKey);

  if (cached) {
    Logger.log(`💾 Cache HIT: ${cacheKey}`);
    return JSON.parse(cached);
  }

  try {
    const geocoder = Maps.newGeocoder();
    geocoder.setRegion('fr');
    geocoder.setLanguage('fr');

    const response = geocoder.geocode(address);

    if (!response.results || response.results.length === 0) {
      return { isValid: false, error: 'Adresse introuvable' };
    }

    const result = response.results[0];
    const location = result.geometry.location;

    const geocodeResult = {
      isValid: true,
      coordinates: {
        latitude: location.lat,
        longitude: location.lng
      },
      formattedAddress: result.formatted_address,
      locationType: result.geometry.location_type
    };

    // Mettre en cache (1 heure)
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(geocodeResult), 3600);

    return geocodeResult;

  } catch (e) {
    Logger.log(`❌ Erreur géocodage: ${e.message}`);
    return { isValid: false, error: e.message };
  }
}

/**
 * 🔄 Géocode un quartier et met à jour ses coordonnées
 */
function geocodeQuartier(quartierId) {
  const quartier = getQuartierData(quartierId);

  if (!quartier) {
    throw new Error(`❌ Quartier ${quartierId} introuvable`);
  }

  // Construire adresse de recherche
  const secteur = getSecteurById(quartier.idSecteur);
  const ville = secteur ? getVilleById(secteur.idVille) : null;

  if (!ville) {
    throw new Error(`❌ Ville parente introuvable pour quartier ${quartierId}`);
  }

  const searchAddress = `${quartier.nom}, ${ville.nom}, ${ville.codePostal}, France`;
  Logger.log(`🔍 Géocodage: ${searchAddress}`);

  const result = geocodeAddress(searchAddress);

  if (!result.isValid) {
    return {
      success: false,
      quartierId: quartierId,
      quartierNom: quartier.nom,
      error: result.error
    };
  }

  // Mettre à jour les coordonnées dans le sheet
  const sheet = getSheet(CONFIG.SHEETS.QUARTIERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][CONFIG.COLUMNS.QUARTIERS.ID] == quartierId) {
      sheet.getRange(i + 1, CONFIG.COLUMNS.QUARTIERS.CENTRE_LAT + 1)
        .setValue(result.coordinates.latitude);
      sheet.getRange(i + 1, CONFIG.COLUMNS.QUARTIERS.CENTRE_LNG + 1)
        .setValue(result.coordinates.longitude);

      Logger.log(`✅ Coordonnées mises à jour: ${result.coordinates.latitude}, ${result.coordinates.longitude}`);
      break;
    }
  }

  return {
    success: true,
    quartierId: quartierId,
    quartierNom: quartier.nom,
    coordinates: result.coordinates,
    formattedAddress: result.formattedAddress
  };
}

/**
 * 📖 Récupère les données d'un quartier
 */
function getQuartierData(quartierId) {
  const sheet = getSheet(CONFIG.SHEETS.QUARTIERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][CONFIG.COLUMNS.QUARTIERS.ID] == quartierId) {
      return {
        id: data[i][CONFIG.COLUMNS.QUARTIERS.ID],
        nom: data[i][CONFIG.COLUMNS.QUARTIERS.NOM],
        centreLat: data[i][CONFIG.COLUMNS.QUARTIERS.CENTRE_LAT],
        centreLng: data[i][CONFIG.COLUMNS.QUARTIERS.CENTRE_LNG],
        idSecteur: data[i][CONFIG.COLUMNS.QUARTIERS.ID_SECTEUR]
      };
    }
  }

  return null;
}

/**
 * 🔄 Géocode tous les quartiers d'une ville
 */
function geocodeQuartiersOfVille(villeId, options = {}) {
  const skipExisting = options.skipExisting !== false;
  const batchSize = options.batchSize || 10;
  const pauseMs = options.pauseMs || 1000;

  // Charger quartiers de la ville
  const secteurs = getSecteursByVille(villeId);
  const secteurIds = secteurs.map(s => s.id);

  const allQuartiers = loadQuartiersWithPolygons().filter(
    q => secteurIds.includes(q.idSecteur)
  );

  // Filtrer si skipExisting
  const toGeocode = skipExisting
    ? allQuartiers.filter(q => !q.centreLat || !q.centreLng)
    : allQuartiers;

  Logger.log(`🔄 Géocodage: ${toGeocode.length}/${allQuartiers.length} quartiers`);

  const results = {
    total: toGeocode.length,
    success: 0,
    failed: 0,
    details: []
  };

  toGeocode.forEach((q, index) => {
    // Pause entre batches
    if (index > 0 && index % batchSize === 0) {
      Logger.log(`⏸️ Pause après ${index} géocodages...`);
      Utilities.sleep(2000);
    }

    try {
      const result = geocodeQuartier(q.id);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }

      results.details.push(result);

      // Pause légère
      if (index < toGeocode.length - 1) {
        Utilities.sleep(pauseMs);
      }

    } catch (e) {
      results.failed++;
      results.details.push({
        success: false,
        quartierId: q.id,
        quartierNom: q.nom,
        error: e.message
      });
    }
  });

  Logger.log(`✅ Terminé: ${results.success} succès, ${results.failed} échecs`);
  return results;
}

/**
 * 📖 Récupère secteurs d'une ville
 */
function getSecteursByVille(villeId) {
  const sheet = getSheet(CONFIG.SHEETS.SECTEURS);
  const data = sheet.getDataRange().getValues();

  const secteurs = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][CONFIG.COLUMNS.SECTEURS.ID_VILLE] == villeId) {
      secteurs.push({
        id: data[i][CONFIG.COLUMNS.SECTEURS.ID],
        nom: data[i][CONFIG.COLUMNS.SECTEURS.NOM],
        centreLat: data[i][CONFIG.COLUMNS.SECTEURS.CENTRE_LAT],
        centreLng: data[i][CONFIG.COLUMNS.SECTEURS.CENTRE_LNG],
        idVille: data[i][CONFIG.COLUMNS.SECTEURS.ID_VILLE]
      });
    }
  }

  return secteurs;
}

/**
 * 🎯 UI: Tester géocodage avec polygones
 */
function testGeocodeWithPolygonsUI() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    '🔍 Tester géocodage',
    'Entrez une adresse à géocoder:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const address = response.getResponseText();

    try {
      const result = findQuartierFromAddress(address);

      ui.alert(
        '✅ Quartier trouvé',
        `Quartier: ${result.quartierNom}\n` +
        `ID: ${result.quartierId}\n` +
        `Méthode: ${result.resolutionMethod}\n` +
        `${result.resolutionDetails ? 'Détails: ' + result.resolutionDetails : ''}`,
        ui.ButtonSet.OK
      );

    } catch (e) {
      ui.alert('❌ Erreur', e.message, ui.ButtonSet.OK);
    }
  }
}

/**
 * 🧹 Vider cache UI
 */
function clearCacheUI() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '🧹 Vider cache',
    'Vider tout le cache de géocodage?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    CacheService.getScriptCache().removeAll([]);
    ui.alert('✅ Cache vidé', 'Le cache a été nettoyé avec succès.', ui.ButtonSet.OK);
  }
}