// ============================================================================
// FICHIER: Code.js (Principal)
// Description: Configuration centrale et fonctions core
// ============================================================================

/**
 * 🌍 Configuration centrale du projet GEO avec support polygones
 * Structure des sheets: villes | secteurs | quartiers avec polygon_frontiere
 */
const CONFIG = {
  // Noms exacts des feuilles (comme spécifié)
  SHEETS: {
    VILLES: 'villes',
    SECTEURS: 'secteurs',
    QUARTIERS: 'quartiers'
  },

  // 📋 Structure EXACTE des colonnes (index 0-based)
  COLUMNS: {
    VILLES: {
      ID: 0,
      NOM: 1,
      CENTRE_LAT: 2,
      CENTRE_LNG: 3,
      POLYGON: 4,
      CODE_POSTAL: 5,
      DEPARTEMENT: 6
    },
    SECTEURS: {
      ID: 0,
      NOM: 1,
      CENTRE_LAT: 2,
      CENTRE_LNG: 3,
      POLYGON: 4,
      ID_VILLE: 5
    },
    QUARTIERS: {
      ID: 0,
      NOM: 1,
      CENTRE_LAT: 2,
      CENTRE_LNG: 3,
      POLYGON: 4,
      ID_SECTEUR: 5
    }
  },

  // 🔧 Paramètres géospatiaux (configurables via Script Properties)
  GEO: {
    NEAREST_THRESHOLD_M: parseFloat(
      PropertiesService.getScriptProperties().getProperty('NEAREST_CENTROID_THRESHOLD_METERS')
    ) || 200,
    RAYON_TERRE_KM: 6371,
    DEFAULT_COUNTRY: 'France',
    USER_AGENT: 'AMANA-GeoAPI/2.1 (bigdjallel@gmail.com)' // Make sure this follows format: "AppName/Version (contact@email.com)"
  },

  // ⚠️ Messages d'erreur en français avec emojis
  ERRORS: {
    INVALID_GEOJSON: '❌ GeoJSON invalide',
    NO_POLYGON: '⚠️ Aucun polygone disponible',
    GEOCODING_FAILED: '❌ Échec du géocodage',
    NO_MATCH: '🔍 Aucun quartier trouvé'
  }
};

/**
 * 🔧 Récupère une feuille par nom
 */
function getSheet(sheetName) {
  console.log(`🔄 Récupération de la feuille: ${sheetName}`);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`❌ Feuille "${sheetName}" introuvable`);
  }
  return sheet;
}
