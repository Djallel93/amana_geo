/**
 * Service de gestion des quartiers - VERSION OPTIMISÉE
 * Améliorations: cache, validation, performance
 */

// ========================================
// CACHE POUR PERFORMANCES
// ========================================

/**
 * Cache des quartiers pour éviter lectures répétées
 */
class QuartierCache {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.CACHE_KEY = 'all_quartiers';
    this.CACHE_DURATION = 600; // 10 minutes
  }

  get() {
    try {
      const cached = this.cache.get(this.CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.log(`⚠️ Erreur lecture cache quartiers: ${e.message}`);
    }
    return null;
  }

  set(quartiers) {
    try {
      this.cache.put(this.CACHE_KEY, JSON.stringify(quartiers), this.CACHE_DURATION);
    } catch (e) {
      console.log(`⚠️ Erreur écriture cache quartiers: ${e.message}`);
    }
  }

  invalidate() {
    this.cache.remove(this.CACHE_KEY);
  }
}

const quartierCache = new QuartierCache();

// ========================================
// RÉCUPÉRATION DES DONNÉES
// ========================================

/**
 * Récupère tous les quartiers (avec cache)
 * @param {boolean} hasCoordinates - Filtre les quartiers avec coordonnées valides
 * @returns {Array<Object>} Liste des quartiers
 */
function getAllQuartiers(hasCoordinates = true) {
  // Vérifier le cache d'abord
  const cacheKey = hasCoordinates ? 'all_quartiers_coords' : 'all_quartiers';
  let quartiers = null;

  try {
    const cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      quartiers = JSON.parse(cached);
      console.log(`✅ Cache HIT: ${quartiers.length} quartiers`);
      return quartiers;
    }
  } catch (e) {
    console.log(`⚠️ Erreur cache: ${e.message}`);
  }

  // Charger depuis le sheet
  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  // Optimisation: utiliser map + filter en une passe
  quartiers = data
    .slice(1)
    .map(row => {
      const q = {
        id: row[CONFIG.COLUMNS.QUARTIER.ID],
        nom: row[CONFIG.COLUMNS.QUARTIER.NOM],
        latitude: parseFloat(row[CONFIG.COLUMNS.QUARTIER.LATITUDE]),
        longitude: parseFloat(row[CONFIG.COLUMNS.QUARTIER.LONGITUDE]),
        idSecteur: row[CONFIG.COLUMNS.QUARTIER.ID_SECTEUR]
      };

      // Valider l'ID
      if (!q.id) {
        return null;
      }

      // Filtrer par coordonnées si demandé
      if (hasCoordinates && !isValidCoordinates(q.latitude, q.longitude)) {
        return null;
      }

      return q;
    })
    .filter(q => q !== null);

  console.log(`📋 ${quartiers.length} quartiers chargés depuis le sheet`);

  // Mettre en cache
  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(quartiers), 600);
  } catch (e) {
    console.log(`⚠️ Erreur mise en cache: ${e.message}`);
  }

  return quartiers;
}

/**
 * Récupère un quartier par son ID (optimisé)
 * @param {number} id - ID du quartier
 * @param {boolean} hasCoordinates - Filtre par coordonnées
 * @returns {Object|null} Quartier ou null
 */
function getQuartierById(id, hasCoordinates = true) {
  if (!id) {
    return null;
  }

  const quartiers = getAllQuartiers(hasCoordinates);

  // Optimisation: utiliser find au lieu de filter
  return quartiers.find(q => q.id == id) || null;
}

/**
 * Récupère tous les quartiers d'un secteur (optimisé)
 * @param {number} idSecteur - ID du secteur
 * @param {boolean} hasCoordinates - Filtre par coordonnées
 * @returns {Array<Object>} Quartiers du secteur
 */
function getQuartiersBySecteur(idSecteur, hasCoordinates = true) {
  if (!idSecteur) {
    return [];
  }

  const quartiers = getAllQuartiers(hasCoordinates);
  return quartiers.filter(q => q.idSecteur == idSecteur);
}

/**
 * Récupère tous les quartiers d'une ville (via secteur) - OPTIMISÉ
 * @param {number} idVille - ID de la ville
 * @param {boolean} hasCoordinates - Filtre par coordonnées
 * @returns {Array<Object>} Quartiers de la ville
 */
function getQuartiersByVille(idVille, hasCoordinates = true) {
  if (!idVille) {
    return [];
  }

  // Récupérer les secteurs une seule fois
  const secteurs = getSecteursByVille(idVille);

  if (secteurs.length === 0) {
    return [];
  }

  // Créer un Set pour recherche O(1)
  const secteurIds = new Set(secteurs.map(s => s.id));

  // Filtrer les quartiers en une passe
  const quartiers = getAllQuartiers(hasCoordinates);
  return quartiers.filter(q => secteurIds.has(q.idSecteur));
}

// ========================================
// RECHERCHE GÉOGRAPHIQUE
// ========================================

/**
 * Trouve le quartier le plus proche (OPTIMISÉ avec bounding box)
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
    console.log('⚠️ Aucun quartier en base', 'WARN');
    return null;
  }

  console.log(`🔍 Recherche quartier proche de ${lat}, ${lng}`, 'INFO');

  // OPTIMISATION: Utiliser bounding box pour pré-filtrage
  const bounds = calculateBoundingBox(lat, lng, maxDist);
  const nearbyQuartiers = quartiers.filter(q =>
    isPointInBounds(q.latitude, q.longitude, bounds)
  );

  if (nearbyQuartiers.length === 0) {
    console.log(`❌ Aucun quartier dans la bounding box`, 'WARN');
    return null;
  }

  // Calculer les distances seulement pour les quartiers proches
  let minDistance = Infinity;
  let nearest = null;

  for (const q of nearbyQuartiers) {
    const distance = calculateDistance(lat, lng, q.latitude, q.longitude);

    if (distance < minDistance && distance <= maxDist) {
      minDistance = distance;
      nearest = q;
    }
  }

  if (!nearest) {
    console.log(`❌ Quartier trop éloigné: > ${maxDist} km`, 'WARN');
    return null;
  }

  const result = {
    quartierId: nearest.id,
    quartierName: nearest.nom,
    distance: roundTo(minDistance, 3),
    quartierLatitude: nearest.latitude,
    quartierLongitude: nearest.longitude,
    idSecteur: nearest.idSecteur
  };

  // Mettre en cache
  setCache(cacheKey, result);

  console.log(`✅ Quartier trouvé: ${result.quartierName} (${result.distance} km)`, 'INFO');

  return result;
}

/**
 * Trouve tous les quartiers dans un rayon (OPTIMISÉ)
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

  // Pré-filtrage avec bounding box
  const bounds = calculateBoundingBox(lat, lng, radiusKm);
  const nearbyQuartiers = quartiers.filter(q =>
    isPointInBounds(q.latitude, q.longitude, bounds)
  );

  // Calculer distances précises et filtrer
  const results = [];

  for (const q of nearbyQuartiers) {
    const distance = calculateDistance(lat, lng, q.latitude, q.longitude);

    if (distance <= radiusKm) {
      results.push({
        quartierId: q.id,
        quartierName: q.nom,
        distance: roundTo(distance, 3),
        quartierLatitude: q.latitude,
        quartierLongitude: q.longitude,
        idSecteur: q.idSecteur
      });
    }
  }

  // Trier par distance
  results.sort((a, b) => a.distance - b.distance);

  return results;
}

// ========================================
// CRUD OPERATIONS
// ========================================

/**
 * Crée un nouveau quartier (avec validation renforcée)
 * @param {Object} quartier - {nom, latitude, longitude, idSecteur}
 * @returns {Object} Quartier créé avec ID
 */
function createQuartier(quartier) {
  // Validation
  if (!quartier.nom || typeof quartier.nom !== 'string' || quartier.nom.trim().length === 0) {
    throw new Error('Nom du quartier requis');
  }

  if (!quartier.latitude || !quartier.longitude) {
    throw new Error('Coordonnées GPS requises');
  }

  if (!quartier.idSecteur) {
    throw new Error('ID du secteur requis');
  }

  const lat = parseFloat(quartier.latitude);
  const lng = parseFloat(quartier.longitude);

  if (!isValidCoordinates(lat, lng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  // Vérifier que le secteur existe
  const secteur = getSecteurById(quartier.idSecteur);
  if (!secteur) {
    throw new Error(`Secteur ${quartier.idSecteur} introuvable`);
  }

  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const lastRow = sheet.getLastRow();

  // Générer un nouvel ID (amélioration: vérifier unicité)
  const newId = lastRow > 1 ? lastRow : 1;

  // Ajouter la ligne
  sheet.appendRow([
    newId,
    quartier.nom.trim(),
    lat,
    lng,
    quartier.idSecteur
  ]);

  // Invalider le cache
  quartierCache.invalidate();
  CacheService.getScriptCache().remove('all_quartiers');
  CacheService.getScriptCache().remove('all_quartiers_coords');

  console.log(`✅ Quartier créé: ${quartier.nom} (ID: ${newId})`, 'INFO');

  return {
    id: newId,
    nom: quartier.nom.trim(),
    latitude: lat,
    longitude: lng,
    idSecteur: quartier.idSecteur
  };
}

/**
 * Met à jour un quartier existant (OPTIMISÉ)
 * @param {number} id - ID du quartier
 * @param {Object} updates - Champs à mettre à jour
 * @returns {boolean} True si succès
 */
function updateQuartier(id, updates) {
  if (!id) {
    throw new Error('ID du quartier requis');
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('Aucune mise à jour spécifiée');
  }

  // Validation des coordonnées si fournies
  if (updates.latitude !== undefined || updates.longitude !== undefined) {
    const lat = updates.latitude !== undefined ? parseFloat(updates.latitude) : null;
    const lng = updates.longitude !== undefined ? parseFloat(updates.longitude) : null;

    if (lat !== null && lng !== null && !isValidCoordinates(lat, lng)) {
      throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
    }
  }

  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const data = sheet.getDataRange().getValues();

  // Trouver la ligne du quartier
  const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.QUARTIER.ID] == id);

  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error(CONFIG.ERRORS.QUARTIER_NOT_FOUND);
  }

  const actualRow = rowIndex + 1;

  // Mettre à jour les cellules modifiées (batch update pour performance)
  const updateOperations = [];

  if (updates.nom) {
    updateOperations.push({
      row: actualRow,
      col: CONFIG.COLUMNS.QUARTIER.NOM + 1,
      value: updates.nom.trim()
    });
  }
  if (updates.latitude !== undefined) {
    updateOperations.push({
      row: actualRow,
      col: CONFIG.COLUMNS.QUARTIER.LATITUDE + 1,
      value: parseFloat(updates.latitude)
    });
  }
  if (updates.longitude !== undefined) {
    updateOperations.push({
      row: actualRow,
      col: CONFIG.COLUMNS.QUARTIER.LONGITUDE + 1,
      value: parseFloat(updates.longitude)
    });
  }
  if (updates.idSecteur) {
    updateOperations.push({
      row: actualRow,
      col: CONFIG.COLUMNS.QUARTIER.ID_SECTEUR + 1,
      value: updates.idSecteur
    });
  }

  // Effectuer les mises à jour
  updateOperations.forEach(op => {
    sheet.getRange(op.row, op.col).setValue(op.value);
  });

  // Invalider le cache
  quartierCache.invalidate();
  CacheService.getScriptCache().remove('all_quartiers');
  CacheService.getScriptCache().remove('all_quartiers_coords');

  console.log(`✅ Quartier ${id} mis à jour`, 'INFO');

  return true;
}

/**
 * Supprime un quartier (avec vérification)
 * @param {number} id - ID du quartier
 * @returns {boolean} True si succès
 */
function deleteQuartier(id) {
  if (!id) {
    throw new Error('ID du quartier requis');
  }

  const sheet = getSheet(CONFIG.SHEETS.QUARTIER);
  const data = sheet.getDataRange().getValues();

  const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.QUARTIER.ID] == id);

  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error(CONFIG.ERRORS.QUARTIER_NOT_FOUND);
  }

  sheet.deleteRow(rowIndex + 1);

  // Invalider le cache
  quartierCache.invalidate();
  CacheService.getScriptCache().remove('all_quartiers');
  CacheService.getScriptCache().remove('all_quartiers_coords');

  console.log(`✅ Quartier ${id} supprimé`, 'INFO');

  return true;
}

// ========================================
// GÉOCODAGE
// ========================================

/**
 * Géocode un quartier (OPTIMISÉ avec meilleure gestion d'erreurs)
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

  console.log(`🔍 Géocodage quartier: ${address}`, 'INFO');

  const result = geocodeAddress(address);

  if (!result.isValid) {
    console.log(`❌ Échec géocodage: ${result.message}`, 'ERROR');
    return {
      success: false,
      quartierId: id,
      quartierName: quartier.nom,
      error: result.message
    };
  }

  // Mettre à jour les coordonnées du quartier
  try {
    updateQuartier(id, {
      latitude: result.coordinates.latitude,
      longitude: result.coordinates.longitude
    });
  } catch (e) {
    console.log(`❌ Erreur mise à jour: ${e.message}`, 'ERROR');
    return {
      success: false,
      quartierId: id,
      quartierName: quartier.nom,
      error: e.message
    };
  }

  return {
    success: true,
    quartierId: id,
    quartierName: quartier.nom,
    ...result
  };
}

/**
 * Géocode tous les quartiers d'une ville (OPTIMISÉ avec batch)
 * @param {number} idVille - ID de la ville
 * @returns {Array<Object>} Résultats du géocodage
 */
function geocodeQuartiersOfVille(idVille) {
  const quartiers = getQuartiersByVille(idVille, false);

  console.log(`🔄 Géocodage de ${quartiers.length} quartiers`, 'INFO');

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  quartiers.forEach((quartier, index) => {
    try {
      const result = geocodeQuartier(quartier.id);

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      results.push({
        index: index,
        ...result
      });

      // Pause pour éviter rate limiting (tous les 10)
      if ((index + 1) % 10 === 0 && index < quartiers.length - 1) {
        Utilities.sleep(500);
      }

    } catch (e) {
      errorCount++;
      results.push({
        index: index,
        success: false,
        quartierId: quartier.id,
        quartierName: quartier.nom,
        error: e.message
      });
    }
  });

  console.log(`✅ Géocodage terminé: ${successCount} succès, ${errorCount} échecs`, 'INFO');

  return results;
}