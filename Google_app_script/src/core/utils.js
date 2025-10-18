/**
 * Fonctions utilitaires - VERSION OPTIMISÉE
 * Améliorations: validation renforcée, gestion d'erreurs, performance
 */

// ========================================
// CONVERSIONS MATHÉMATIQUES
// ========================================

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

// ========================================
// VALIDATION
// ========================================

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

// ========================================
// CACHE MANAGEMENT
// ========================================

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
        Logger.log(`⚠️ Valeur trop grande pour le cache: ${key}`);
        return false;
      }

      this.cache.put(key, serialized, ttl);
      Logger.log(`💾 Cache SET: ${key} (${ttl}s)`);
      return true;
    } catch (e) {
      Logger.log(`⚠️ Erreur cache écriture: ${e.message}`);
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
      Logger.log(`🗑️ Cache REMOVE: ${key}`);
      return true;
    } catch (e) {
      Logger.log(`⚠️ Erreur cache suppression: ${e.message}`);
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

// ========================================
// RÉPONSES API
// ========================================

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
  Logger.log(`❌ Erreur API: ${errorCode} - ${message}`);

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

// ========================================
// AUTHENTIFICATION
// ========================================

/**
 * Vérifie l'authentification par API Key (DÉPRÉCIÉ - Utiliser auth.js)
 * @deprecated Utiliser checkAPIAuthentication() dans auth.js
 */
function checkAuthentication(apiKey) {
  Logger.log('⚠️ checkAuthentication() est déprécié, utilisez checkAPIAuthentication()');

  if (!CONFIG.SECURITY.ENABLE_AUTH) {
    return true;
  }

  if (!apiKey || apiKey !== CONFIG.SECURITY.API_KEY) {
    Logger.log('⚠️ Authentification échouée');
    return false;
  }

  return true;
}

// ========================================
// RATE LIMITING
// ========================================

/**
 * Système de rate limiting amélioré
 */
class RateLimiter {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.limit = CONFIG.SECURITY.RATE_LIMIT_REQUESTS || 100;
    this.window = 3600; // 1 heure
  }

  /**
   * Vérifie et incrémente le compteur de requêtes
   * @param {string} identifier - Identifiant (IP, clé API, etc.)
   * @returns {Object} {allowed: boolean, remaining: number, resetAt: Date}
   */
  check(identifier) {
    if (!identifier) {
      return { allowed: true, remaining: this.limit, resetAt: null };
    }

    const key = `ratelimit_${identifier}`;

    try {
      const cached = this.cache.get(key);

      if (!cached) {
        // Première requête
        this.cache.put(key, '1', this.window);
        return {
          allowed: true,
          remaining: this.limit - 1,
          resetAt: new Date(Date.now() + this.window * 1000)
        };
      }

      const count = parseInt(cached);

      if (count >= this.limit) {
        Logger.log(`⚠️ Rate limit dépassé pour ${identifier}: ${count} requêtes`);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + this.window * 1000)
        };
      }

      // Incrémenter
      this.cache.put(key, (count + 1).toString(), this.window);

      return {
        allowed: true,
        remaining: this.limit - count - 1,
        resetAt: new Date(Date.now() + this.window * 1000)
      };

    } catch (e) {
      Logger.log(`⚠️ Erreur rate limiting: ${e.message}`);
      // En cas d'erreur, autoriser la requête
      return { allowed: true, remaining: this.limit, resetAt: null };
    }
  }

  /**
   * Réinitialise le compteur pour un identifiant
   */
  reset(identifier) {
    if (!identifier) {
      return false;
    }

    const key = `ratelimit_${identifier}`;
    this.cache.remove(key);
    return true;
  }
}

// Instance globale
const rateLimiter = new RateLimiter();

/**
 * Vérifie le rate limiting (wrapper pour compatibilité)
 * @param {string} identifier - Identifiant
 * @returns {boolean} True si sous la limite
 */
function checkRateLimit(identifier) {
  const result = rateLimiter.check(identifier);
  return result.allowed;
}

// ========================================
// FORMATAGE ET NETTOYAGE
// ========================================

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

// ========================================
// LOGGING
// ========================================

/**
 * Système de logging amélioré
 */
class Logger {
  constructor() {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.currentLevel = this.levels.INFO;
  }

  /**
   * Log avec niveau et timestamp
   */
  log(message, level = 'INFO', data = null) {
    const levelValue = this.levels[level] || this.levels.INFO;

    if (levelValue < this.currentLevel) {
      return; // Ne pas logger si niveau trop bas
    }

    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level);
    const logMessage = `[${timestamp}] ${emoji} [${level}] ${message}`;

    // Logger dans Apps Script
    console.log(logMessage);

    // Si des données supplémentaires
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Raccourcis pour chaque niveau
   */
  debug(message, data) {
    this.log(message, 'DEBUG', data);
  }

  info(message, data) {
    this.log(message, 'INFO', data);
  }

  warn(message, data) {
    this.log(message, 'WARN', data);
  }

  error(message, data) {
    this.log(message, 'ERROR', data);
  }

  /**
   * Emoji selon le niveau
   */
  getEmoji(level) {
    const emojis = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌'
    };
    return emojis[level] || 'ℹ️';
  }

  /**
   * Définit le niveau de logging
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }
}

// Instance globale
const logger = new Logger();

/**
 * Log avec timestamp (wrapper pour compatibilité)
 * @param {string} message - Message à logger
 * @param {string} level - Niveau (INFO, WARN, ERROR, DEBUG)
 */
function logWithTimestamp(message, level = 'INFO') {
  logger.log(message, level);
}

// ========================================
// CONVERSIONS DE DONNÉES
// ========================================

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

// ========================================
// UTILITAIRES DIVERS
// ========================================

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
 * Attend un certain délai (pour rate limiting)
 * @param {number} ms - Millisecondes à attendre
 */
function sleep(ms) {
  if (typeof ms !== 'number' || ms < 0) {
    return;
  }

  // Limiter à 5 minutes max pour éviter timeouts
  const delay = Math.min(ms, 300000);
  Utilities.sleep(delay);
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
        sleep(delay);
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

// ========================================
// VALIDATION DE DONNÉES SHEET
// ========================================

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