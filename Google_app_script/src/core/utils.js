/**
 * Fonctions utilitaires pour le projet GEO
 * Cache, validation, formatage, etc.
 */

/**
 * Convertit des degrés en radians
 * @param {number} degrees - Angle en degrés
 * @returns {number} Angle en radians
 */
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Convertit des radians en degrés
 * @param {number} radians - Angle en radians
 * @returns {number} Angle en degrés
 */
function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

/**
 * Valide des coordonnées GPS
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True si coordonnées valides
 */
function isValidCoordinates(lat, lng) {
  return !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;
}

/**
 * Récupère une valeur du cache
 * @param {string} key - Clé du cache
 * @returns {any} Valeur ou null si expiré/absent
 */
function getCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(key);

    if (cached) {
      Logger.log(`✅ Cache HIT: ${key}`);
      return JSON.parse(cached);
    }

    Logger.log(`❌ Cache MISS: ${key}`);
    return null;
  } catch (e) {
    Logger.log(`⚠️ Erreur cache lecture: ${e.message}`);
    return null;
  }
}

/**
 * Stocke une valeur dans le cache
 * @param {string} key - Clé du cache
 * @param {any} value - Valeur à stocker
 * @param {number} duration - Durée en secondes (optionnel)
 */
function setCache(key, value, duration) {
  try {
    const cache = CacheService.getScriptCache();
    const ttl = duration || CONFIG.GEO.CACHE_DURATION;
    cache.put(key, JSON.stringify(value), ttl);
    Logger.log(`💾 Cache SET: ${key} (${ttl}s)`);
  } catch (e) {
    Logger.log(`⚠️ Erreur cache écriture: ${e.message}`);
  }
}

/**
 * Génère une clé de cache pour une adresse
 * @param {string} address - Adresse
 * @returns {string} Clé de cache
 */
function getCacheKeyForAddress(address) {
  return `geocode_${address.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Génère une clé de cache pour des coordonnées
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Clé de cache
 */
function getCacheKeyForCoordinates(lat, lng) {
  return `quartier_${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

/**
 * Formate une réponse API en JSON
 * @param {any} data - Données à retourner
 * @param {number} status - Code HTTP (200, 400, 500, etc.)
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createJsonResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  // Note: Impossible de définir le code HTTP dans Apps Script Web App
  // Le statut est uniquement informatif dans la réponse
  if (status !== 200) {
    data.httpStatus = status;
  }

  return output;
}

/**
 * Crée une réponse d'erreur
 * @param {string} error - Type d'erreur
 * @param {string} message - Message détaillé
 * @param {number} status - Code HTTP
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createErrorResponse(error, message, status = 400) {
  Logger.log(`❌ Erreur: ${error} - ${message}`);
  return createJsonResponse({
    error: error,
    message: message,
    timestamp: new Date().toISOString()
  }, status);
}

/**
 * Vérifie l'authentification par API Key
 * @param {string} apiKey - Clé API fournie
 * @returns {boolean} True si authentifié
 */
function checkAuthentication(apiKey) {
  if (!CONFIG.SECURITY.ENABLE_AUTH) {
    return true; // Auth désactivée
  }

  if (!apiKey || apiKey !== CONFIG.SECURITY.API_KEY) {
    Logger.log('⚠️ Authentification échouée');
    return false;
  }

  return true;
}

/**
 * Vérifie et applique le rate limiting
 * @param {string} identifier - Identifiant (IP, clé API, etc.)
 * @returns {boolean} True si sous la limite
 */
function checkRateLimit(identifier) {
  const key = `ratelimit_${identifier}`;
  const cache = CacheService.getScriptCache();
  const count = cache.get(key);

  if (!count) {
    cache.put(key, '1', 3600); // 1 heure
    return true;
  }

  const current = parseInt(count);
  if (current >= CONFIG.SECURITY.RATE_LIMIT_REQUESTS) {
    Logger.log(`⚠️ Rate limit dépassé pour ${identifier}: ${current} requêtes`);
    return false;
  }

  cache.put(key, (current + 1).toString(), 3600);
  return true;
}

/**
 * Nettoie et normalise une adresse
 * @param {string} address - Adresse brute
 * @returns {string} Adresse nettoyée
 */
function cleanAddress(address) {
  if (!address) return '';

  return address
    .trim()
    .replace(/\s+/g, ' ') // Multiples espaces
    .replace(/[^\w\s,.-]/g, '') // Caractères spéciaux
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Accents (optionnel)
}

/**
 * Arrondit un nombre à N décimales
 * @param {number} value - Valeur à arrondir
 * @param {number} decimals - Nombre de décimales
 * @returns {number} Valeur arrondie
 */
function roundTo(value, decimals = 2) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Formatte une distance pour affichage
 * @param {number} km - Distance en km
 * @returns {string} Distance formatée (ex: "1.2 km" ou "850 m")
 */
function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${roundTo(km, 2)} km`;
}

/**
 * Log avec timestamp
 * @param {string} message - Message à logger
 * @param {string} level - Niveau (INFO, WARN, ERROR)
 */
function logWithTimestamp(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  Logger.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Convertit un tableau de données en objets
 * @param {Array<Array>} data - Données brutes du sheet
 * @param {Object} columnMap - Mapping des colonnes
 * @returns {Array<Object>} Tableau d'objets
 */
function convertDataToObjects(data, columnMap) {
  if (!data || data.length === 0) return [];

  return data.slice(1).map(row => {
    const obj = {};
    Object.keys(columnMap).forEach(key => {
      obj[key.toLowerCase()] = row[columnMap[key]];
    });
    return obj;
  });
}

/**
 * Génère un ID unique
 * @returns {string} ID unique
 */
function generateUniqueId() {
  return Utilities.getUuid();
}

/**
 * Teste si une chaîne est vide
 * @param {string} str - Chaîne à tester
 * @returns {boolean}
 */
function isEmpty(str) {
  return !str || str.toString().trim() === '';
}