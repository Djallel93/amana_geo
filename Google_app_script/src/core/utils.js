/**
 * Utilitaires consolidés et optimisés
 */

const Utils = {

  // ========== VALIDATION ==========

  isValidCoordinates(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
      !isNaN(lat) && !isNaN(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180;
  },

  isEmpty(str) {
    return str == null || (typeof str === 'string' && str.trim().length === 0);
  },

  // ========== CONVERSION ==========

  toRadians(degrees) {
    return degrees * Math.PI / 180;
  },

  roundTo(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  },

  // ========== DISTANCE ==========

  calculateDistance(lat1, lng1, lat2, lng2) {
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.roundTo(CONFIG.GEO.RAYON_TERRE_KM * c, 3);
  },

  // ========== GEOMETRIE ==========

  /**
   * Test point-in-polygon (ray-casting)
   */
  isPointInPolygon(lat, lng, polygon) {
    if (!polygon || polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [latI, lngI] = polygon[i];
      const [latJ, lngJ] = polygon[j];

      const intersect = ((lngI > lng) !== (lngJ > lng)) &&
        (lat < (latJ - latI) * (lng - lngI) / (lngJ - lngI) + latI);

      if (intersect) inside = !inside;
    }

    return inside;
  },

  /**
   * Calcule l'aire d'un polygone (formule Shoelace)
   */
  polygonArea(polygon) {
    if (!polygon || polygon.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i][0] * polygon[j][1];
      area -= polygon[j][0] * polygon[i][1];
    }

    return Math.abs(area) / 2;
  },

  /**
   * Parse un GeoJSON Polygon
   */
  parseGeoJSONPolygon(geoJsonString) {
    if (!geoJsonString || typeof geoJsonString !== 'string') return null;

    try {
      const parsed = JSON.parse(geoJsonString);

      if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates)) {
        return parsed.coordinates[0].map(coord => [coord[1], coord[0]]);
      }

      if (parsed.type === 'MultiPolygon' && Array.isArray(parsed.coordinates)) {
        return parsed.coordinates[0][0].map(coord => [coord[1], coord[0]]);
      }

      return null;
    } catch (e) {
      Logger.warn(`Erreur parsing GeoJSON: ${e.message}`);
      return null;
    }
  },

  // ========== API RESPONSES ==========

  createJsonResponse(data, status = 200) {
    const response = {
      ...data,
      _meta: {
        timestamp: new Date().toISOString(),
        status: status
      }
    };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  },

  createErrorResponse(errorCode, message, status = 400) {
    Logger.error(`API Error: ${errorCode} - ${message}`);

    return this.createJsonResponse({
      error: {
        code: errorCode,
        message: message
      }
    }, status);
  }
};