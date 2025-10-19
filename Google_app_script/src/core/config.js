/**
 * Configuration centrale du projet GEO
 * Contient toutes les constantes et paramètres de configuration
 */

// === IDs des feuilles Google Sheets ===
const CONFIG = {
  // ID du Google Sheet (à modifier après création)
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID') || 'VOTRE_SHEET_ID',

  // Noms des feuilles
  SHEETS: {
    QUARTIER: 'Quartier',
    SECTEUR: 'Secteur',
    VILLE: 'Ville'
  },

  // Colonnes des feuilles
  COLUMNS: {
    QUARTIER: {
      ID: 0,
      NOM: 1,
      LATITUDE: 2,
      LONGITUDE: 3,
      ID_SECTEUR: 4
    },
    SECTEUR: {
      ID: 0,
      NOM: 1,
      LATITUDE: 2,
      LONGITUDE: 3,
      ID_VILLE: 4
    },
    VILLE: {
      ID: 0,
      NOM: 1,
      CODE_POSTAL: 2,
      DEPARTEMENT: 3,
      PAYS: 4
    }
  },

  // Paramètres de géolocalisation
  GEO: {
    MAX_DISTANCE_KM: parseFloat(PropertiesService.getScriptProperties().getProperty('MAX_DISTANCE_KM')) || 50,
    DEFAULT_COUNTRY: 'France',
    CACHE_DURATION: parseInt(PropertiesService.getScriptProperties().getProperty('CACHE_DURATION')) || 3600, // 1 heure
    RAYON_TERRE_KM: 6371 // Rayon de la Terre pour calculs Haversine
  },

  // Sécurité
  SECURITY: {
    API_KEY: PropertiesService.getScriptProperties().getProperty('API_KEY') || null,
    RATE_LIMIT_REQUESTS: 100, // Nombre de requêtes par IP/heure
    ENABLE_AUTH: PropertiesService.getScriptProperties().getProperty('ENABLE_AUTH') === 'true'
  },

  // Quotas Google Maps
  QUOTAS: {
    GEOCODING_DAILY_LIMIT: 1000,
    BATCH_SIZE: 50 // Nombre max d'adresses à géocoder en une fois
  },

  // Messages d'erreur
  ERRORS: {
    INVALID_ADDRESS: 'Adresse invalide ou introuvable',
    GEOCODING_FAILED: 'Échec du géocodage',
    NO_QUARTIER_FOUND: 'Aucun quartier trouvé dans le rayon spécifié',
    INVALID_COORDINATES: 'Coordonnées GPS invalides',
    MISSING_PARAMETERS: 'Paramètres manquants',
    UNAUTHORIZED: 'Clé API invalide ou manquante',
    QUOTA_EXCEEDED: 'Quota de géocodage dépassé',
    VILLE_NOT_FOUND: 'Ville introuvable',
    QUARTIER_NOT_FOUND: 'Quartier introuvable'
  }
};

/**
 * Récupère l'objet Spreadsheet
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

/**
 * Récupère une feuille par son nom
 * @param {string} sheetName - Nom de la feuille
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Feuille "${sheetName}" introuvable`);
  }
  return sheet;
}

/**
 * Configure les propriétés du script (à exécuter une fois)
 */
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();

  // Demander à l'utilisateur de remplir ces valeurs
  props.setProperties({
    'SHEET_ID': 'VOTRE_SHEET_ID_ICI',
    'MAX_DISTANCE_KM': '50',
    'CACHE_DURATION': '3600',
    'API_KEY': '', // Laisser vide si pas d'auth
    'ENABLE_AUTH': 'false'
  });

  console.log('✅ Propriétés configurées avec succès');
  console.log('⚠️ N\'oubliez pas de modifier SHEET_ID !');
}