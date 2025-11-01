/**
 * GEO API - Configuration centralisée
 * Version: 3.0 (Refactorée)
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
        ID_VILLE: 4
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

    // Paramètres géospatiaux
    GEO: {
      RAYON_TERRE_KM: 6371,
      SEUIL_PROXIMITE_M: parseInt(props.getProperty('NEAREST_THRESHOLD_M')) || 200,
      DISTANCE_MAX_KM: parseInt(props.getProperty('MAX_DISTANCE_KM')) || 50,
      PAYS_DEFAUT: 'France',
      USER_AGENT: props.getProperty('USER_AGENT') || 'AMANA-GeoAPI/3.0 (bigdjallel@gmail.com)'
    },

    // Configuration du cache
    CACHE: {
      DUREE_DEFAUT: parseInt(props.getProperty('CACHE_DURATION')) || 3600,
      TAILLE_MAX_ENTREE: 100000
    },

    // Messages d'erreur
    ERRORS: {
      INVALID_COORDINATES: 'COORDONNEES_INVALIDES',
      INVALID_GEOJSON: 'GEOJSON_INVALIDE',
      NO_POLYGON: 'AUCUN_POLYGONE',
      GEOCODING_FAILED: 'GEOCODAGE_ECHOUE',
      NO_MATCH: 'AUCUNE_CORRESPONDANCE',
      MISSING_PARAMETERS: 'PARAMETRES_MANQUANTS',
      QUARTIER_NOT_FOUND: 'QUARTIER_INTROUVABLE',
      VILLE_NOT_FOUND: 'VILLE_INTROUVABLE',
      SECTEUR_NOT_FOUND: 'SECTEUR_INTROUVABLE'
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