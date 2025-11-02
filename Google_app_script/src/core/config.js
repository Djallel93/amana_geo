/**
 * GEO API - Configuration centralisée
 * Version: 5.0 (Read-Only API with Secteur dimension - No Cache)
 */

const CONFIG = (() => {
  const props = PropertiesService.getScriptProperties();

  return {
    // Noms des feuilles
    SHEETS: {
      VILLES: 'villes',
      SECTEURS: 'secteurs',
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
      SECTEURS: {
        ID: 0,
        NOM: 1,
        ID_VILLE: 2
      },
      QUARTIERS: {
        ID: 0,
        NOM: 1,
        POLYGON: 2,
        ID_SECTEUR: 3
      }
    },

    // Paramètres géospatiaux
    GEO: {
      RAYON_TERRE_KM: 6371,
      PAYS_DEFAUT: 'France',
      USER_AGENT: props.getProperty('USER_AGENT') || 'AMANA-GeoAPI/5.0 (bigdjallel@gmail.com)'
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
      SECTEUR_NOT_FOUND: 'SECTEUR_INTROUVABLE',
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