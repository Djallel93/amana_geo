/**
 * Service de calcul de distances géographiques
 * Utilise la formule de Haversine pour les calculs précis
 */

const EARTH_RADIUS_KM = 6371;

// ========================================
// CONVERSIONS
// ========================================

/**
 * Convertit des degrés en radians
 * @param {number} degrees - Angle en degrés
 * @returns {number} Angle en radians
 */
function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Convertit des radians en degrés
 * @param {number} radians - Angle en radians
 * @returns {number} Angle en degrés
 */
function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

// ========================================
// CALCULS DE BASE
// ========================================

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lng1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lng2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return roundTo(EARTH_RADIUS_KM * c, 3);
}

/**
 * Calcule le cap (bearing) entre deux points
 * @param {number} lat1 - Latitude de départ
 * @param {number} lng1 - Longitude de départ
 * @param {number} lat2 - Latitude d'arrivée
 * @param {number} lng2 - Longitude d'arrivée
 * @returns {number} Cap en degrés (0-360, 0 = Nord)
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
  const φ1 = degreesToRadians(lat1);
  const φ2 = degreesToRadians(lat2);
  const Δλ = degreesToRadians(lng2 - lng1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return (radiansToDegrees(θ) + 360) % 360;
}

/**
 * Calcule un point de destination à partir d'un point, cap et distance
 * @param {number} lat - Latitude de départ
 * @param {number} lng - Longitude de départ
 * @param {number} bearing - Cap en degrés
 * @param {number} distanceKm - Distance en km
 * @returns {{lat: number, lng: number}} Coordonnées du point d'arrivée
 */
function calculateDestinationPoint(lat, lng, bearing, distanceKm) {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = degreesToRadians(bearing);
  const φ1 = degreesToRadians(lat);
  const λ1 = degreesToRadians(lng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: radiansToDegrees(φ2),
    lng: (radiansToDegrees(λ2) + 540) % 360 - 180
  };
}

// ========================================
// CALCULS MULTIPLES
// ========================================

/**
 * Calcule les distances entre un point d'origine et plusieurs destinations
 * @param {number} originLat - Latitude d'origine
 * @param {number} originLng - Longitude d'origine
 * @param {Array<{lat: number, lng: number}>} destinations - Destinations
 * @returns {Array<Object>} Résultats avec distances
 */
function calculateDistances(originLat, originLng, destinations) {
  if (!Array.isArray(destinations)) {
    return [];
  }

  return destinations.map((dest, index) => {
    const destLat = dest.lat || dest.latitude;
    const destLng = dest.lng || dest.longitude;

    if (typeof destLat !== 'number' || typeof destLng !== 'number') {
      return {
        index,
        distance: null,
        error: 'Invalid coordinates'
      };
    }

    return {
      index,
      distance: calculateDistance(originLat, originLng, destLat, destLng),
      lat: destLat,
      lng: destLng,
      name: dest.name || `Point ${index}`
    };
  });
}

/**
 * Calcule les distances successives le long d'un chemin
 * @param {Array<{lat: number, lng: number}>} points - Points ordonnés
 * @returns {Array<number>} Distances entre chaque paire de points
 */
function calculatePathDistances(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return [];
  }

  const distances = [];

  for (let i = 0; i < points.length - 1; i++) {
    const lat1 = points[i].lat || points[i].latitude;
    const lng1 = points[i].lng || points[i].longitude;
    const lat2 = points[i + 1].lat || points[i + 1].latitude;
    const lng2 = points[i + 1].lng || points[i + 1].longitude;

    if (typeof lat1 === 'number' && typeof lng1 === 'number' &&
      typeof lat2 === 'number' && typeof lng2 === 'number') {
      distances.push(calculateDistance(lat1, lng1, lat2, lng2));
    }
  }

  return distances;
}

/**
 * Calcule la distance totale d'un chemin
 * @param {Array<{lat: number, lng: number}>} points - Points ordonnés
 * @returns {number} Distance totale en km
 */
function calculateTotalPathDistance(points) {
  const distances = calculatePathDistances(points);
  return distances.reduce((sum, d) => sum + d, 0);
}

// ========================================
// RECHERCHE ET FILTRAGE
// ========================================

/**
 * Trouve le point le plus proche d'un point de référence
 * @param {{lat: number, lng: number}} referencePoint - Point de référence
 * @param {Array<{lat: number, lng: number}>} points - Points à comparer
 * @returns {Object|null} Point le plus proche avec sa distance
 */
function findNearestPoint(referencePoint, points) {
  if (!referencePoint || !Array.isArray(points) || points.length === 0) {
    return null;
  }

  const refLat = referencePoint.latitude || referencePoint.lat;
  const refLng = referencePoint.longitude || referencePoint.lng;

  if (typeof refLat !== 'number' || typeof refLng !== 'number') {
    return null;
  }

  let nearest = null;
  let minDistance = Infinity;
  let nearestIndex = -1;

  points.forEach((p, i) => {
    const pLat = p.latitude || p.lat;
    const pLng = p.longitude || p.lng;

    if (typeof pLat !== 'number' || typeof pLng !== 'number') {
      return;
    }

    const d = calculateDistance(refLat, refLng, pLat, pLng);

    if (d < minDistance) {
      minDistance = d;
      nearest = p;
      nearestIndex = i;
    }
  });

  if (!nearest) {
    return null;
  }

  return {
    point: nearest,
    distance: minDistance,
    index: nearestIndex,
    name: nearest.name || `Point ${nearestIndex}`
  };
}

/**
 * Vérifie si deux points sont proches selon un seuil
 * @param {{lat: number, lng: number}} p1 - Premier point
 * @param {{lat: number, lng: number}} p2 - Deuxième point
 * @param {number} thresholdKm - Distance maximale en km
 * @returns {boolean} True si les points sont proches
 */
function arePointsClose(p1, p2, thresholdKm = 0.05) {
  const lat1 = p1.lat || p1.latitude;
  const lng1 = p1.lng || p1.longitude;
  const lat2 = p2.lat || p2.latitude;
  const lng2 = p2.lng || p2.longitude;

  if (typeof lat1 !== 'number' || typeof lng1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lng2 !== 'number') {
    return false;
  }

  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  return distance <= thresholdKm;
}

// ========================================
// GÉOMÉTRIE
// ========================================

/**
 * Calcule le centroïde d'un ensemble de points
 * @param {Array<{lat: number, lng: number}>} points - Points
 * @returns {{latitude: number, longitude: number}} Centroïde
 */
function calculateCentroid(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  let totalLat = 0;
  let totalLng = 0;
  let count = 0;

  points.forEach(p => {
    const lat = p.latitude || p.lat;
    const lng = p.longitude || p.lng;

    if (typeof lat === 'number' && typeof lng === 'number') {
      totalLat += lat;
      totalLng += lng;
      count++;
    }
  });

  if (count === 0) {
    return { latitude: 0, longitude: 0 };
  }

  return {
    latitude: roundTo(totalLat / count, 6),
    longitude: roundTo(totalLng / count, 6)
  };
}

/**
 * Calcule une bounding box autour d'un point
 * @param {number} lat - Latitude du centre
 * @param {number} lng - Longitude du centre
 * @param {number} radiusKm - Rayon en km
 * @returns {{minLat: number, maxLat: number, minLng: number, maxLng: number}}
 */
function calculateBoundingBox(lat, lng, radiusKm) {
  const deltaLat = radiusKm / 111.0;
  const deltaLng = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));

  return {
    minLat: roundTo(lat - deltaLat, 6),
    maxLat: roundTo(lat + deltaLat, 6),
    minLng: roundTo(lng - deltaLng, 6),
    maxLng: roundTo(lng + deltaLng, 6)
  };
}

/**
 * Vérifie si un point est dans une bounding box
 * @param {number} lat - Latitude du point
 * @param {number} lng - Longitude du point
 * @param {{minLat: number, maxLat: number, minLng: number, maxLng: number}} bounds - Limites
 * @returns {boolean} True si le point est dans les limites
 */
function isPointInBounds(lat, lng, bounds) {
  return lat >= bounds.minLat && lat <= bounds.maxLat &&
    lng >= bounds.minLng && lng <= bounds.maxLng;
}

// ========================================
// STATISTIQUES
// ========================================

/**
 * Calcule des statistiques sur un ensemble de distances
 * @param {Array<number>} distances - Distances en km
 * @returns {{min: number, max: number, average: number, total: number}}
 */
function calculateDistanceStatistics(distances) {
  if (!Array.isArray(distances) || distances.length === 0) {
    return { min: 0, max: 0, average: 0, total: 0 };
  }

  const validDistances = distances.filter(d => typeof d === 'number' && !isNaN(d));

  if (validDistances.length === 0) {
    return { min: 0, max: 0, average: 0, total: 0 };
  }

  const total = validDistances.reduce((sum, d) => sum + d, 0);
  const min = Math.min(...validDistances);
  const max = Math.max(...validDistances);
  const average = total / validDistances.length;

  return {
    min: roundTo(min, 3),
    max: roundTo(max, 3),
    average: roundTo(average, 3),
    total: roundTo(total, 3)
  };
}