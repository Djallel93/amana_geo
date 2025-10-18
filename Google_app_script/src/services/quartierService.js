/**
 * Service de gestion des quartiers
 * CRUD + recherche + matching géographique
 */

/**
 * Récupère tous les quartiers
 * @param {boolean} hasCoordinates - renvoie les quartier uniquement s'ils ont des coordonnées valides
 * @returns {Array<Object>} Liste des quartiers
 */
function getAllQuartiers(hasCoordinates = true) {
  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const quartiers = data
    .slice(1)
    .map(row => ({
      id: row[CONFIG.COLUMNS.QUARTIER.ID],
      nom: row[CONFIG.COLUMNS.QUARTIER.NOM],
      latitude: parseFloat(row[CONFIG.COLUMNS.QUARTIER.LATITUDE]),
      longitude: parseFloat(row[CONFIG.COLUMNS.QUARTIER.LONGITUDE]),
      idSecteur: row[CONFIG.COLUMNS.QUARTIER.ID_SECTEUR]
    }))
    .filter(q => q.id);

  Logger.log(`📋 ${quartiers.length} quartiers chargés`);

  if (hasCoordinates) {
    return quartiers.filter(q => isValidCoordinates(q.latitude, q.longitude));
  } else {
    return quartiers;
  }
}

/**
 * Récupère un quartier par son ID
 * @param {number} id - ID du quartier
 * @param {boolean} hasCoordinates - renvoie les quartier uniquement s'ils ont des coordonnées valides
 * @returns {Object|null} Quartier ou null
 */
function getQuartierById(id, hasCoordinates = true) {
  const quartiers = getAllQuartiers(hasCoordinates);
  return quartiers.find(q => q.id == id) || null;
}

/**
 * Récupère tous les quartiers d'un secteur
 * @param {number} idSecteur - ID du secteur
 * @param {boolean} hasCoordinates - renvoie les quartier uniquement s'ils ont des coordonnées valides
 * @returns {Array<Object>} Quartiers du secteur
 */
function getQuartiersBySecteur(idSecteur, hasCoordinates = true) {
  const quartiers = getAllQuartiers(hasCoordinates);
  return quartiers.filter(q => q.idSecteur == idSecteur);
}

/**
 * Récupère tous les quartiers d'une ville (via secteur)
 * @param {number} idVille - ID de la ville
 * @param {boolean} hasCoordinates - renvoie les quartier uniquement s'ils ont des coordonnées valides
 * @returns {Array<Object>} Quartiers de la ville
 */
function getQuartiersByVille(idVille, hasCoordinates = true) {
  const secteurs = getSecteursByVille(idVille);
  const secteurIds = secteurs.map(s => s.id);

  const quartiers = getAllQuartiers(hasCoordinates);
  return quartiers.filter(q => secteurIds.includes(q.idSecteur));
}

/**
 * Trouve le quartier le plus proche de coordonnées données
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxDistance - Distance max en km (optionnel)
 * @returns {Object|null} Quartier trouvé avec distance
 */
function findNearestQuartier(lat, lng, maxDistance = null) {
  if (!isValidCoordinates(lat, lng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  // Vérifier le cache
  const cacheKey = getCacheKeyForCoordinates(lat, lng);
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  const maxDist = maxDistance || CONFIG.GEO.MAX_DISTANCE_KM;
  const quartiers = getAllQuartiers();

  if (quartiers.length === 0) {
    logWithTimestamp('⚠️ Aucun quartier en base', 'WARN');
    return null;
  }

  logWithTimestamp(`🔍 Recherche quartier proche de ${lat}, ${lng}`, 'INFO');

  // Calculer les distances
  const quartiersWithDistance = quartiers.map(q => ({
    ...q,
    distance: calculateDistance(lat, lng, q.latitude, q.longitude)
  }));

  // Trier par distance
  quartiersWithDistance.sort((a, b) => a.distance - b.distance);

  const nearest = quartiersWithDistance[0];

  // Vérifier la distance max
  if (nearest.distance > maxDist) {
    logWithTimestamp(`❌ Quartier trop éloigné: ${roundTo(nearest.distance, 2)} km > ${maxDist} km`, 'WARN');
    return null;
  }

  const result = {
    quartierId: nearest.id,
    quartierName: nearest.nom,
    distance: roundTo(nearest.distance, 3),
    quartierLatitude: nearest.latitude,
    quartierLongitude: nearest.longitude,
    idSecteur: nearest.idSecteur
  };

  // Mettre en cache
  setCache(cacheKey, result);

  logWithTimestamp(`✅ Quartier trouvé: ${result.quartierName} (${result.distance} km)`, 'INFO');

  return result;
}

/**
 * Trouve tous les quartiers dans un rayon donné
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Rayon en km
 * @returns {Array<Object>} Quartiers dans le rayon
 */
function findQuartiersInRadius(lat, lng, radiusKm) {
  if (!isValidCoordinates(lat, lng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  const quartiers = getAllQuartiers();
  const points = quartiers.map(q => ({
    ...q,
    lat: q.latitude,
    lng: q.longitude
  }));

  const quartiersInRadius = findPointsInRadius(lat, lng, points, radiusKm);

  return quartiersInRadius.map(q => ({
    quartierId: q.id,
    quartierName: q.nom,
    distance: roundTo(q.distance, 3),
    quartierLatitude: q.latitude,
    quartierLongitude: q.longitude,
    idSecteur: q.idSecteur
  }));
}

/**
 * Crée un nouveau quartier
 * @param {Object} quartier - {nom, latitude, longitude, idSecteur}
 * @returns {Object} Quartier créé avec ID
 */
function createQuartier(quartier) {
  if (!quartier.nom || !quartier.latitude || !quartier.longitude || !quartier.idSecteur) {
    throw new Error(CONFIG.ERRORS.MISSING_PARAMETERS);
  }

  if (!isValidCoordinates(quartier.latitude, quartier.longitude)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const lastRow = sheet.getLastRow();

  // Générer un nouvel ID
  const newId = lastRow; // Simple auto-increment

  // Ajouter la ligne
  sheet.appendRow([
    newId,
    quartier.nom,
    quartier.latitude,
    quartier.longitude,
    quartier.idSecteur
  ]);

  logWithTimestamp(`✅ Quartier créé: ${quartier.nom} (ID: ${newId})`, 'INFO');

  return {
    id: newId,
    ...quartier
  };
}

/**
 * Met à jour un quartier existant
 * @param {number} id - ID du quartier
 * @param {Object} updates - Champs à mettre à jour
 * @returns {boolean} True si succès
 */
function updateQuartier(id, updates) {
  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const data = sheet.getDataRange().getValues();

  // Trouver la ligne du quartier
  const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.QUARTIER.ID] == id);

  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error(CONFIG.ERRORS.QUARTIER_NOT_FOUND);
  }

  const actualRow = rowIndex + 1; // +1 car getDataRange commence à 1

  // Mettre à jour les cellules modifiées
  if (updates.nom) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.QUARTIER.NOM + 1).setValue(updates.nom);
  }
  if (updates.latitude) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.QUARTIER.LATITUDE + 1).setValue(updates.latitude);
  }
  if (updates.longitude) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.QUARTIER.LONGITUDE + 1).setValue(updates.longitude);
  }
  if (updates.idSecteur) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.QUARTIER.ID_SECTEUR + 1).setValue(updates.idSecteur);
  }

  logWithTimestamp(`✅ Quartier ${id} mis à jour`, 'INFO');

  return true;
}

/**
 * Supprime un quartier
 * @param {number} id - ID du quartier
 * @returns {boolean} True si succès
 */
function deleteQuartier(id) {
  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const data = sheet.getDataRange().getValues();

  const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.QUARTIER.ID] == id);

  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error(CONFIG.ERRORS.QUARTIER_NOT_FOUND);
  }

  sheet.deleteRow(rowIndex + 1);

  logWithTimestamp(`✅ Quartier ${id} supprimé`, 'INFO');

  return true;
}

/**
 * Géocode un quartier (trouve ses coordonnées depuis son nom + ville)
 * @param {number} id - ID du quartier
 * @returns {Object} Coordonnées trouvées
 */
function geocodeQuartier(id) {
  const quartier = getQuartierById(id, false);

  if (!quartier) {
    throw new Error(CONFIG.ERRORS.QUARTIER_NOT_FOUND);
  }

  // Récupérer le secteur et la ville
  const secteur = getSecteurById(quartier.idSecteur);
  if (!secteur) {
    throw new Error('Secteur introuvable pour ce quartier');
  }

  const ville = getVilleById(secteur.idVille);
  if (!ville) {
    throw new Error('Ville introuvable pour ce quartier');
  }

  // Construire l'adresse à géocoder
  const address = `${quartier.nom}, ${ville.nom}, ${ville.codePostal}, France`;

  logWithTimestamp(`🔍 Géocodage quartier: ${address}`, 'INFO');

  const result = geocodeAddress(address);

  if (!result.isValid) {
    return result;
  }

  // Mettre à jour les coordonnées du quartier
  updateQuartier(id, {
    latitude: result.coordinates.latitude,
    longitude: result.coordinates.longitude
  });

  return {
    quartierId: id,
    quartierName: quartier.nom,
    ...result
  };
}

/**
 * Géocode tous les quartiers d'une ville
 * @param {number} idVille - ID de la ville
 * @returns {Array<Object>} Résultats du géocodage
 */
function geocodeQuartiersOfVille(idVille) {
  const quartiers = getQuartiersByVille(idVille);

  logWithTimestamp(`🔄 Géocodage de ${quartiers.length} quartiers`, 'INFO');

  const results = [];

  quartiers.forEach((quartier, index) => {
    try {
      const result = geocodeQuartier(quartier.id);
      results.push({
        index: index,
        success: true,
        ...result
      });

      // Pause pour éviter rate limiting
      if ((index + 1) % 10 === 0) {
        Utilities.sleep(500);
      }

    } catch (e) {
      results.push({
        index: index,
        success: false,
        quartierId: quartier.id,
        error: e.message
      });
    }
  });

  const successCount = results.filter(r => r.success).length;
  logWithTimestamp(`✅ Géocodage terminé: ${successCount}/${quartiers.length}`, 'INFO');

  return results;
}