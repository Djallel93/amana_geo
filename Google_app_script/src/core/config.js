/**
 * GEO API - Configuration centralisée
 * Version: 4.0 (Read-Only API with Polygon-based resolution)
 */

const CONFIG = (() => {
  const props = PropertiesService.getScriptProperties();

  return {
    // Noms des feuilles
    SHEETS: {
      VILLES: 'villes',
      QUARTIERS: 'quartiers'
    },

    // Structure des colonnes (0-indexed)
    COLUMNS: {
      VILLES: {
        ID: 0,
        NOM: 1,
        POLYGON: 2,
        CODE_POSTAL: 3,
        DEPARTEMENT: 4
      },
      QUARTIERS: {
        ID: 0,
        NOM: 1,
        POLYGON: 2,
        ID_VILLE: 3
      }
    },

    // Paramètres géospatiaux
    GEO: {
      RAYON_TERRE_KM: 6371,
      PAYS_DEFAUT: 'France',
      USER_AGENT: props.getProperty('USER_AGENT') || 'AMANA-GeoAPI/4.0 (bigdjallel@gmail.com)'
    },

    // Configuration du cache
    CACHE: {
      DUREE_DEFAUT: parseInt(props.getProperty('CACHE_DURATION')) || 3600,
      TAILLE_MAX_ENTREE: 100000
    },

    // Authentification
    AUTH: {
      API_KEY: props.getProperty('API_KEY') || ''
    },

    // Messages d'erreur
    ERRORS: {
      INVALID_COORDINATES: 'COORDONNEES_INVALIDES',
      INVALID_GEOJSON: 'GEOJSON_INVALIDE',
      GEOCODING_FAILED: 'GEOCODAGE_ECHOUE',
      NO_MATCH: 'AUCUNE_CORRESPONDANCE',
      MISSING_PARAMETERS: 'PARAMETRES_MANQUANTS',
      UNAUTHORIZED: 'NON_AUTORISE',
      QUARTIER_NOT_FOUND: 'QUARTIER_INTROUVABLE',
      VILLE_NOT_FOUND: 'VILLE_INTROUVABLE'
    }
  };
})();

/**
 * Récupère une feuille avec validation
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Feuille "${sheetName}" introuvable`);
  }

  return sheet;
}