/**
 * Fonctions utilitaires - VERSION OPTIMISÉE
 * Améliorations: validation renforcée, gestion d'erreurs, performance
 */


/**
 * Convertit des degrés en radians
 * @param {number} degrees - Angle en degrés
 * @returns {number} Angle en radians
 */
function toRadians(degrees) {
  if (typeof degrees !== 'number' || isNaN(degrees)) {
    throw new Error('Valeur invalide pour toRadians');
  }
  return degrees * Math.PI / 180;
}

/**
 * Convertit des radians en degrés
 * @param {number} radians - Angle en radians
 * @returns {number} Angle en degrés
 */
function toDegrees(radians) {
  if (typeof radians !== 'number' || isNaN(radians)) {
    throw new Error('Valeur invalide pour toDegrees');
  }
  return radians * 180 / Math.PI;
}

/**
 * Valide des coordonnées GPS (optimisé)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True si coordonnées valides
 */
function isValidCoordinates(lat, lng) {
  // Vérification rapide des types
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }

  // Vérification NaN
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }

  // Vérification des bornes
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Teste si une chaîne est vide ou null
 * @param {string} str - Chaîne à tester
 * @returns {boolean}
 */
function isEmpty(str) {
  return str === null ||
    str === undefined ||
    (typeof str === 'string' && str.trim().length === 0);
}

/**
 * Valide un email basique
 * @param {string} email - Email à valider
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Regex simple mais efficace
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Gestionnaire de cache amélioré
 */
class CacheManager {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.defaultTTL = CONFIG.GEO.CACHE_DURATION || 3600;
  }

  /**
   * Récupère une valeur du cache avec gestion d'erreurs
   */
  get(key) {
    if (!key) {
      return null;
    }

    try {
      const cached = this.cache.get(key);

      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return JSON.parse(cached);
      }

      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (e) {
      console.log(`⚠️ Erreur cache lecture: ${e.message}`);
      return null;
    }
  }

  /**
   * Stocke une valeur dans le cache
   */
  set(key, value, duration) {
    if (!key) {
      return false;
    }

    try {
      const ttl = duration || this.defaultTTL;
      const serialized = JSON.stringify(value);

      // Vérifier la taille (limite 100KB par entrée)
      if (serialized.length > 100000) {
        console.log(`⚠️ Valeur trop grande pour le cache: ${key}`);
        return false;
      }

      this.cache.put(key, serialized, ttl);
      console.log(`💾 Cache SET: ${key} (${ttl}s)`);
      return true;
    } catch (e) {
      console.log(`⚠️ Erreur cache écriture: ${e.message}`);
      return false;
    }
  }

  /**
   * Supprime une entrée du cache
   */
  remove(key) {
    if (!key) {
      return false;
    }

    try {
      this.cache.remove(key);
      console.log(`🗑️ Cache REMOVE: ${key}`);
      return true;
    } catch (e) {
      console.log(`⚠️ Erreur cache suppression: ${e.message}`);
      return false;
    }
  }

  /**
   * Génère une clé de cache sécurisée
   */
  generateKey(...parts) {
    return parts
      .filter(p => p !== null && p !== undefined)
      .map(p => String(p).toLowerCase().replace(/[^a-z0-9]/g, '_'))
      .join('_');
  }
}

// Instance globale
const cacheManager = new CacheManager();

/**
 * Récupère une valeur du cache (wrapper pour compatibilité)
 */
function getCache(key) {
  return cacheManager.get(key);
}

/**
 * Stocke une valeur dans le cache (wrapper)
 */
function setCache(key, value, duration) {
  return cacheManager.set(key, value, duration);
}

/**
 * Génère une clé de cache pour une adresse
 */
function getCacheKeyForAddress(address) {
  return cacheManager.generateKey('geocode', address);
}

/**
 * Génère une clé de cache pour des coordonnées
 */
function getCacheKeyForCoordinates(lat, lng) {
  return cacheManager.generateKey('quartier', lat.toFixed(4), lng.toFixed(4));
}


/**
 * Formate une réponse API en JSON (optimisé)
 */
function createJsonResponse(data, status = 200) {
  // Ajouter des métadonnées utiles
  const response = {
    ...data,
    _meta: {
      timestamp: new Date().toISOString(),
      status: status
    }
  };

  const output = ContentService.createTextOutput(JSON.stringify(response));
  output.setMimeType(ContentService.MimeType.JSON);

  return output;
}

/**
 * Crée une réponse d'erreur standardisée
 */
function createErrorResponse(errorCode, message, status = 400) {
  console.log(`❌ Erreur API: ${errorCode} - ${message}`);

  return createJsonResponse({
    error: {
      code: errorCode,
      message: message,
      timestamp: new Date().toISOString()
    }
  }, status);
}

/**
 * Crée une réponse de succès standardisée
 */
function createSuccessResponse(data, message = null) {
  const response = {
    success: true,
    data: data
  };

  if (message) {
    response.message = message;
  }

  return createJsonResponse(response, 200);
}

/**
 * Nettoie et normalise une adresse (optimisé)
 * @param {string} address - Adresse brute
 * @returns {string} Adresse nettoyée
 */
function cleanAddress(address) {
  if (!address || typeof address !== 'string') {
    return '';
  }

  return address
    .trim()
    .replace(/\s+/g, ' ') // Multiples espaces
    .replace(/[^\w\s,.\-]/g, '') // Caractères spéciaux (garder virgule, point, tiret)
    .substring(0, 500); // Limiter la longueur
}

/**
 * Normalise un nom (ville, quartier, etc.)
 * @param {string} name - Nom à normaliser
 * @returns {string} Nom normalisé
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-']/g, '')
    .substring(0, 200);
}

/**
 * Arrondit un nombre à N décimales (optimisé)
 * @param {number} value - Valeur à arrondir
 * @param {number} decimals - Nombre de décimales
 * @returns {number} Valeur arrondie
 */
function roundTo(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }

  if (decimals < 0 || decimals > 10) {
    decimals = 2;
  }

  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Formate une distance pour affichage (optimisé)
 * @param {number} km - Distance en km
 * @returns {string} Distance formatée
 */
function formatDistance(km) {
  if (typeof km !== 'number' || isNaN(km) || km < 0) {
    return '0 m';
  }

  if (km < 0.001) {
    return `${Math.round(km * 1000000)} mm`;
  }

  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  if (km >= 1000) {
    return `${roundTo(km / 1000, 1)} Mm`;
  }

  return `${roundTo(km, 2)} km`;
}

/**
 * Formate une date en français
 * @param {Date|string} date - Date à formater
 * @returns {string} Date formatée
 */
function formatDate(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);

    if (isNaN(d.getTime())) {
      return 'Date invalide';
    }

    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Date invalide';
  }
}

/**
 * Convertit un tableau de données en objets (optimisé)
 * @param {Array<Array>} data - Données brutes du sheet
 * @param {Object} columnMap - Mapping des colonnes
 * @returns {Array<Object>} Tableau d'objets
 */
function convertDataToObjects(data, columnMap) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  if (!columnMap || typeof columnMap !== 'object') {
    throw new Error('Column map requis');
  }

  // Optimisation: créer le mapping une seule fois
  const keys = Object.keys(columnMap);

  return data.slice(1).map(row => {
    const obj = {};

    keys.forEach(key => {
      const colIndex = columnMap[key];
      obj[key.toLowerCase()] = row[colIndex];
    });

    return obj;
  });
}

/**
 * Convertit un objet en paramètres d'URL
 * @param {Object} params - Paramètres
 * @returns {string} Query string
 */
function objectToQueryString(params) {
  if (!params || typeof params !== 'object') {
    return '';
  }

  return Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * Génère un ID unique (amélioré)
 * @param {string} prefix - Préfixe optionnel
 * @returns {string} ID unique
 */
function generateUniqueId(prefix = '') {
  const uuid = Utilities.getUuid().replace(/-/g, '');
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Retry avec backoff exponentiel
 * @param {Function} fn - Fonction à exécuter
 * @param {number} maxRetries - Nombre max de tentatives
 * @param {number} baseDelay - Délai de base en ms
 * @returns {any} Résultat de la fonction
 */
function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (e) {
      lastError = e;

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        logger.warn(`Tentative ${i + 1}/${maxRetries} échouée, retry dans ${delay}ms`);
        Utilities.sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Exécute une fonction avec timeout
 * @param {Function} fn - Fonction à exécuter
 * @param {number} timeoutMs - Timeout en ms
 * @returns {any} Résultat ou erreur timeout
 */
function withTimeout(fn, timeoutMs = 30000) {
  const startTime = Date.now();

  try {
    const result = fn();
    const duration = Date.now() - startTime;

    if (duration > timeoutMs) {
      throw new Error(`Timeout dépassé: ${duration}ms > ${timeoutMs}ms`);
    }

    return result;
  } catch (e) {
    const duration = Date.now() - startTime;

    if (duration > timeoutMs) {
      throw new Error(`Timeout: ${e.message}`);
    }

    throw e;
  }
}

/**
 * Groupe un tableau par une propriété
 * @param {Array} array - Tableau à grouper
 * @param {string} property - Propriété pour le groupement
 * @returns {Object} Objet groupé
 */
function groupBy(array, property) {
  if (!Array.isArray(array)) {
    return {};
  }

  return array.reduce((acc, item) => {
    const key = item[property];

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(item);
    return acc;
  }, {});
}

/**
 * Supprime les doublons d'un tableau
 * @param {Array} array - Tableau
 * @param {string} property - Propriété pour unicité (optionnel)
 * @returns {Array} Tableau sans doublons
 */
function unique(array, property = null) {
  if (!Array.isArray(array)) {
    return [];
  }

  if (!property) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter(item => {
    const key = item[property];

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Divise un tableau en chunks
 * @param {Array} array - Tableau à diviser
 * @param {number} size - Taille des chunks
 * @returns {Array<Array>} Tableau de chunks
 */
function chunk(array, size) {
  if (!Array.isArray(array) || size < 1) {
    return [];
  }

  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Mesure le temps d'exécution d'une fonction
 * @param {Function} fn - Fonction à mesurer
 * @param {string} label - Label pour le log
 * @returns {any} Résultat de la fonction
 */
function measureTime(fn, label = 'Opération') {
  const startTime = Date.now();

  try {
    const result = fn();
    const duration = Date.now() - startTime;

    logger.info(`⏱️ ${label}: ${duration}ms`);
    return result;
  } catch (e) {
    const duration = Date.now() - startTime;
    logger.error(`⏱️ ${label} (échec): ${duration}ms`, { error: e.message });
    throw e;
  }
}

/**
 * Valide qu'une feuille existe
 * @param {string} sheetName - Nom de la feuille
 * @returns {boolean}
 */
function validateSheetExists(sheetName) {
  try {
    const sheet = getSheet(sheetName);
    return sheet !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Compte les lignes non vides d'une feuille
 * @param {string} sheetName - Nom de la feuille
 * @returns {number} Nombre de lignes
 */
function countNonEmptyRows(sheetName) {
  try {
    const sheet = getSheet(sheetName);
    return sheet.getLastRow() - 1; // -1 pour enlever l'en-tête
  } catch (e) {
    logger.error(`Erreur comptage lignes: ${e.message}`);
    return 0;
  }
}

/**
 * Vide le cache complètement
 * @returns {number} Nombre d'entrées vidées
 */
function clearCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll([]);
    console.log('✅ Cache vidé avec succès');
    return 1;
  } catch (e) {
    console.log(`❌ Erreur lors du nettoyage du cache: ${e.message}`);
    return 0;
  }
}

/**
 * Vide le cache depuis l'UI avec confirmation
 */
function clearCacheUI() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '🧹 Vider le cache',
    'Cette action va supprimer tout le cache.\n' +
    'Les prochaines requêtes seront plus lentes (normal).\n' +
    'Le cache se reconstruira automatiquement.\n\n' +
    'Continuer?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    try {
      clearCache();
      ui.alert(
        '✅ Succès',
        'Cache nettoyé avec succès!\n\n' +
        '💡 Les prochaines requêtes seront plus lentes,\n' +
        'c\'est normal. Le cache se reconstruira automatiquement.',
        ui.ButtonSet.OK
      );
    } catch (e) {
      ui.alert(
        '❌ Erreur',
        'Erreur lors du nettoyage: ' + e.message,
        ui.ButtonSet.OK
      );
    }
  }
}

/**
 * 📏 Calcule la distance Haversine entre deux points
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return CONFIG.GEO.RAYON_TERRE_KM * c;
}

/**
 * 🎯 Test point-in-polygon (ray-casting algorithm)
 * Source: https://en.wikipedia.org/wiki/Point_in_polygon
 * 
 * @param {number} lat - Latitude du point à tester
 * @param {number} lng - Longitude du point à tester
 * @param {Array} polygon - Array de [lat, lng] (format: [[lat1,lng1], [lat2,lng2], ...])
 * @returns {boolean} True si le point est dans le polygone
 */
function isPointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    // Ray-casting: compte les intersections avec un rayon horizontal
    const intersect = ((lngI > lng) !== (lngJ > lng)) &&
      (lat < (latJ - latI) * (lng - lngI) / (lngJ - lngI) + latI);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * 📐 Calcule l'aire d'un polygone (formule Shoelace)
 * Source: https://en.wikipedia.org/wiki/Shoelace_formula
 */
function polygonArea(polygon) {
  if (!polygon || polygon.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }

  return Math.abs(area) / 2;
}

/**
 * 🎯 Calcule le centroïde d'un polygone
 * Source: https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
 */
function polygonCentroid(polygon) {
  if (!polygon || polygon.length < 3) {
    return { latitude: null, longitude: null };
  }

  let centroidLat = 0;
  let centroidLng = 0;
  let signedArea = 0;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const cross = latI * lngJ - latJ * lngI;
    signedArea += cross;
    centroidLat += (latI + latJ) * cross;
    centroidLng += (lngI + lngJ) * cross;
  }

  signedArea *= 0.5;

  if (Math.abs(signedArea) < 1e-10) {
    // Fallback: moyenne simple des points
    const avgLat = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const avgLng = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
    return { latitude: avgLat, longitude: avgLng };
  }

  centroidLat /= (6 * signedArea);
  centroidLng /= (6 * signedArea);

  return { latitude: centroidLat, longitude: centroidLng };
}

/**
 * ✅ Valide et parse un GeoJSON Polygon
 * @returns {Array|null} Polygone valide ou null
 */
function parseGeoJSONPolygon(geoJsonString) {
  if (!geoJsonString || typeof geoJsonString !== 'string') return null;

  try {
    const parsed = JSON.parse(geoJsonString);

    // Format GeoJSON standard: {"type":"Polygon","coordinates":[[[lng,lat]...]]}
    if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates)) {
      const coords = parsed.coordinates[0]; // Outer ring

      // Convertir [lng, lat] WGS84 vers [lat, lng] pour nos fonctions
      return coords.map(coord => [coord[1], coord[0]]);
    }

    // Support MultiPolygon: prendre le premier polygon
    if (parsed.type === 'MultiPolygon' && Array.isArray(parsed.coordinates)) {
      const firstPolygon = parsed.coordinates[0][0];
      return firstPolygon.map(coord => [coord[1], coord[0]]);
    }

    return null;
  } catch (e) {
    Logger.log(`⚠️ Erreur parsing GeoJSON: ${e.message}`);
    return null;
  }
}

/**
 * 💾 Valide et écrit un polygone dans une cellule
 */
function writePolygonToSheet(sheet, row, col, polygon) {
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    Logger.log(`⚠️ Polygone invalide, ignoré pour ligne ${row}`);
    return false;
  }

  // Convertir en GeoJSON WGS84 (lon/lat)
  const geoJson = {
    type: 'Polygon',
    coordinates: [
      polygon.map(coord => [coord[1], coord[0]]) // [lat, lng] → [lng, lat]
    ]
  };

  try {
    const jsonString = JSON.stringify(geoJson);
    sheet.getRange(row, col).setValue(jsonString);
    return true;
  } catch (e) {
    Logger.log(`❌ Erreur écriture polygone ligne ${row}: ${e.message}`);
    return false;
  }
}