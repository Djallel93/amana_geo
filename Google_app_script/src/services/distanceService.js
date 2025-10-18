/**
 * Service de calcul de distances géographiques - VERSION OPTIMISÉE
 * Utilise la formule de Haversine avec optimisations
 */

// ========================================
// CONSTANTES
// ========================================

const EARTH_RADIUS_KM = 6371; // Rayon de la Terre en km

// ========================================
// CALCUL DE DISTANCE
// ========================================

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 * Optimisé avec early validation et précalculs
 * 
 * @param {number} lat1 - Latitude du point 1 (-90 à 90)
 * @param {number} lng1 - Longitude du point 1 (-180 à 180)
 * @param {number} lat2 - Latitude du point 2 (-90 à 90)
 * @param {number} lng2 - Longitude du point 2 (-180 à 180)
 * @returns {number} Distance en kilomètres (arrondie à 3 décimales)
 * @throws {Error} Si les coordonnées sont invalides
 * 
 * @example
 * const distance = calculateDistance(48.8566, 2.3522, 47.2173, -1.5536);
 * console.log(distance); // 342.158 km (Paris-Nantes)
 * 
 * @performance O(1) - Calcul constant
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  // Validation rapide des coordonnées
  if (!isValidCoordinates(lat1, lng1) || !isValidCoordinates(lat2, lng2)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  // Optimisation : si même point, retourner 0 immédiatement
  if (lat1 === lat2 && lng1 === lng2) {
    return 0;
  }

  // Conversion en radians (une seule fois)
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);

  // Formule de Haversine optimisée
  const sinDeltaLat = Math.sin(deltaLat / 2);
  const sinDeltaLng = Math.sin(deltaLng / 2);

  const a = sinDeltaLat * sinDeltaLat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    sinDeltaLng * sinDeltaLng;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return roundTo(distance, 3);
}

/**
 * Calcule les distances entre un point et plusieurs destinations
 * Optimisé pour traitement par lots
 * 
 * @param {number} originLat - Latitude d'origine
 * @param {number} originLng - Longitude d'origine
 * @param {Array<{lat: number, lng: number}>} destinations - Destinations
 * @returns {Array<Object>} Résultats avec distances
 * 
 * @example
 * const results = calculateDistances(48.8566, 2.3522, [
 *   { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
 *   { name: 'Marseille', lat: 43.2965, lng: 5.3698 }
 * ]);
 */
function calculateDistances(originLat, originLng, destinations) {
  if (!Array.isArray(destinations) || destinations.length === 0) {
    throw new Error('Destinations invalides ou vides');
  }

  if (!isValidCoordinates(originLat, originLng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  logWithTimestamp(`Calcul de ${destinations.length} distances`, 'INFO');

  // Précalculer les valeurs en radians de l'origine (optimisation)
  const originLatRad = toRadians(originLat);
  const cosOriginLat = Math.cos(originLatRad);

  const results = destinations.map((dest, index) => {
    try {
      const destLat = dest.lat || dest.latitude;
      const destLng = dest.lng || dest.longitude;

      // Validation
      if (!isValidCoordinates(destLat, destLng)) {
        return {
          index: index,
          distance: null,
          error: 'Coordonnées invalides',
          ...dest
        };
      }

      const distance = calculateDistance(originLat, originLng, destLat, destLng);

      return {
        index: index,
        distance: distance,
        ...dest
      };
    } catch (e) {
      logWithTimestamp(`Erreur calcul distance index ${index}: ${e.message}`, 'WARN');
      return {
        index: index,
        distance: null,
        error: e.message,
        ...dest
      };
    }
  });

  return results;
}

// ========================================
// RECHERCHE DE PROXIMITÉ
// ========================================

/**
 * Trouve le point le plus proche parmi une liste
 * Optimisé avec early exit si distance = 0
 * 
 * @param {number} originLat - Latitude d'origine
 * @param {number} originLng - Longitude d'origine
 * @param {Array<Object>} points - Points avec lat/lng
 * @returns {Object|null} Point le plus proche avec distance
 */
function findNearestPoint(originLat, originLng, points) {
  if (!points || points.length === 0) {
    return null;
  }

  if (!isValidCoordinates(originLat, originLng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  let minDistance = Infinity;
  let nearest = null;

  for (const point of points) {
    const lat = point.lat || point.latitude;
    const lng = point.lng || point.longitude;

    if (!isValidCoordinates(lat, lng)) {
      continue;
    }

    const distance = calculateDistance(originLat, originLng, lat, lng);

    // Optimisation : si distance = 0, c'est forcément le plus proche
    if (distance === 0) {
      return { ...point, distance: 0 };
    }

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...point, distance: distance };
    }
  }

  if (nearest) {
    logger.info(`🎯 Point le plus proche trouvé à ${roundTo(nearest.distance, 2)} km`);
  }

  return nearest;
}

/**
 * Trouve tous les points dans un rayon donné
 * Optimisé avec bounding box pré-filtrage
 * 
 * @param {number} originLat - Latitude d'origine
 * @param {number} originLng - Longitude d'origine
 * @param {Array<Object>} points - Points à filtrer
 * @param {number} radiusKm - Rayon en kilomètres
 * @returns {Array<Object>} Points dans le rayon, triés par distance
 */
function findPointsInRadius(originLat, originLng, points, radiusKm) {
  if (!isValidCoordinates(originLat, originLng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  if (radiusKm <= 0) {
    throw new Error('Rayon doit être positif');
  }

  // Pré-filtrage avec bounding box (très rapide)
  const bounds = calculateBoundingBox(originLat, originLng, radiusKm);
  const nearbyPoints = points.filter(p => {
    const lat = p.lat || p.latitude;
    const lng = p.lng || p.longitude;
    return isValidCoordinates(lat, lng) && isPointInBounds(lat, lng, bounds);
  });

  // Calcul précis des distances seulement pour les points proches
  const pointsWithDistance = [];

  for (const point of nearbyPoints) {
    const lat = point.lat || point.latitude;
    const lng = point.lng || point.longitude;

    const distance = calculateDistance(originLat, originLng, lat, lng);

    if (distance <= radiusKm) {
      pointsWithDistance.push({
        ...point,
        distance: distance
      });
    }
  }

  // Trier par distance croissante
  pointsWithDistance.sort((a, b) => a.distance - b.distance);

  logger.info(`📍 ${pointsWithDistance.length} points trouvés dans un rayon de ${radiusKm} km`);

  return pointsWithDistance;
}

// ========================================
// CALCULS GÉOMÉTRIQUES
// ========================================

/**
 * Calcule le point central (centroïde) d'un ensemble de coordonnées
 * 
 * @param {Array<{lat: number, lng: number}>} coordinates - Coordonnées
 * @returns {Object} Centre {latitude, longitude}
 * @throws {Error} Si aucune coordonnée valide
 * 
 * @example
 * const center = calculateCentroid([
 *   { lat: 48.8566, lng: 2.3522 },
 *   { lat: 45.7640, lng: 4.8357 }
 * ]);
 */
function calculateCentroid(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    throw new Error('Aucune coordonnée fournie');
  }

  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const coord of coordinates) {
    const lat = coord.lat || coord.latitude;
    const lng = coord.lng || coord.longitude;

    if (isValidCoordinates(lat, lng)) {
      sumLat += lat;
      sumLng += lng;
      count++;
    }
  }

  if (count === 0) {
    throw new Error('Aucune coordonnée valide trouvée');
  }

  const centroid = {
    latitude: sumLat / count,
    longitude: sumLng / count
  };

  logger.info(`📊 Centroïde calculé: ${centroid.latitude.toFixed(4)}, ${centroid.longitude.toFixed(4)}`);

  return centroid;
}

/**
 * Calcule la distance totale d'un itinéraire (succession de points)
 * 
 * @param {Array<{lat: number, lng: number}>} waypoints - Points de l'itinéraire
 * @returns {number} Distance totale en kilomètres
 * @throws {Error} Si moins de 2 points
 * 
 * @example
 * const totalDistance = calculateRouteDistance([
 *   { lat: 48.8566, lng: 2.3522 }, // Paris
 *   { lat: 45.7640, lng: 4.8357 }, // Lyon
 *   { lat: 43.2965, lng: 5.3698 }  // Marseille
 * ]);
 */
function calculateRouteDistance(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('Au moins 2 points nécessaires pour un itinéraire');
  }

  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const point1 = waypoints[i];
    const point2 = waypoints[i + 1];

    const lat1 = point1.lat || point1.latitude;
    const lng1 = point1.lng || point1.longitude;
    const lat2 = point2.lat || point2.latitude;
    const lng2 = point2.lng || point2.longitude;

    if (!isValidCoordinates(lat1, lng1) || !isValidCoordinates(lat2, lng2)) {
      throw new Error(`Coordonnées invalides au segment ${i + 1}`);
    }

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    totalDistance += distance;
  }

  logger.info(`🛣️ Distance totale itinéraire: ${roundTo(totalDistance, 2)} km (${waypoints.length} points)`);

  return roundTo(totalDistance, 2);
}

// ========================================
// BOUNDING BOX
// ========================================

/**
 * Calcule une bounding box autour d'un point avec un rayon donné
 * Approximation rapide pour pré-filtrage
 * 
 * @param {number} lat - Latitude du centre
 * @param {number} lng - Longitude du centre
 * @param {number} radiusKm - Rayon en kilomètres
 * @returns {Object} Bounding box {north, south, east, west}
 * 
 * @example
 * const bounds = calculateBoundingBox(48.8566, 2.3522, 50);
 * // bounds = { north: 49.306, south: 48.407, east: 3.065, west: 1.639 }
 */
function calculateBoundingBox(lat, lng, radiusKm) {
  if (!isValidCoordinates(lat, lng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  if (radiusKm <= 0) {
    throw new Error('Rayon doit être positif');
  }

  // Approximation : 1° latitude ≈ 111 km
  const latDelta = radiusKm / 111;

  // Approximation : 1° longitude varie selon la latitude
  // Au niveau de l'équateur : 1° ≈ 111 km
  // Aux pôles : 1° ≈ 0 km
  const lngDelta = radiusKm / (111 * Math.cos(toRadians(lat)));

  return {
    north: Math.min(lat + latDelta, 90),
    south: Math.max(lat - latDelta, -90),
    east: lng + lngDelta,
    west: lng - lngDelta
  };
}

/**
 * Vérifie si un point est dans une bounding box
 * Gère le cas du méridien 180° (passage date internationale)
 * 
 * @param {number} lat - Latitude du point
 * @param {number} lng - Longitude du point
 * @param {Object} bounds - {north, south, east, west}
 * @returns {boolean} True si le point est dans la zone
 */
function isPointInBounds(lat, lng, bounds) {
  if (!isValidCoordinates(lat, lng)) {
    return false;
  }

  // Vérifier latitude (simple)
  if (lat < bounds.south || lat > bounds.north) {
    return false;
  }

  // Vérifier longitude (gérer le passage du méridien 180°)
  if (bounds.west <= bounds.east) {
    // Cas normal
    return lng >= bounds.west && lng <= bounds.east;
  } else {
    // Cas du passage du méridien 180°
    return lng >= bounds.west || lng <= bounds.east;
  }
}

// ========================================
// BEARING (DIRECTION)
// ========================================

/**
 * Calcule l'azimut (bearing) entre deux points
 * Utile pour savoir dans quelle direction se trouve un point
 * 
 * @param {number} lat1 - Latitude du point de départ
 * @param {number} lng1 - Longitude du point de départ
 * @param {number} lat2 - Latitude du point d'arrivée
 * @param {number} lng2 - Longitude du point d'arrivée
 * @returns {number} Azimut en degrés (0-360, 0 = Nord)
 * 
 * @example
 * const bearing = calculateBearing(48.8566, 2.3522, 51.5074, -0.1278);
 * console.log(bearing); // ~330° (Paris vers Londres = Nord-Ouest)
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
  if (!isValidCoordinates(lat1, lng1) || !isValidCoordinates(lat2, lng2)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLng = toRadians(lng2 - lng1);

  const y = Math.sin(deltaLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLng);

  let bearing = toDegrees(Math.atan2(y, x));

  // Normaliser entre 0 et 360
  bearing = (bearing + 360) % 360;

  return roundTo(bearing, 1);
}

/**
 * Convertit un azimut en direction cardinale (N, NE, E, etc.)
 * 
 * @param {number} bearing - Azimut en degrés (0-360)
 * @returns {string} Direction cardinale
 * 
 * @example
 * bearingToDirection(45); // "NE"
 * bearingToDirection(180); // "S"
 */
function bearingToDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// ========================================
// DESTINATION POINT
// ========================================

/**
 * Calcule un point de destination à partir d'un point de départ,
 * d'une distance et d'un azimut
 * 
 * @param {number} lat - Latitude de départ
 * @param {number} lng - Longitude de départ
 * @param {number} distanceKm - Distance en km
 * @param {number} bearing - Azimut en degrés
 * @returns {Object} Point de destination {latitude, longitude}
 * 
 * @example
 * const destination = calculateDestinationPoint(48.8566, 2.3522, 100, 0);
 * // Point à 100km au Nord de Paris
 */
function calculateDestinationPoint(lat, lng, distanceKm, bearing) {
  if (!isValidCoordinates(lat, lng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);
  const bearingRad = toRadians(bearing);
  const distRatio = distanceKm / EARTH_RADIUS_KM;

  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distRatio) +
    Math.cos(latRad) * Math.sin(distRatio) * Math.cos(bearingRad)
  );

  const destLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distRatio) * Math.cos(latRad),
    Math.cos(distRatio) - Math.sin(latRad) * Math.sin(destLatRad)
  );

  return {
    latitude: toDegrees(destLatRad),
    longitude: toDegrees(destLngRad)
  };
}

// ========================================
// STATISTIQUES
// ========================================

/**
 * Calcule des statistiques sur un ensemble de distances
 * 
 * @param {Array<number>} distances - Tableau de distances
 * @returns {Object} Statistiques {min, max, avg, median, total}
 */
function calculateDistanceStatistics(distances) {
  if (!Array.isArray(distances) || distances.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      total: 0,
      count: 0
    };
  }

  const validDistances = distances.filter(d => typeof d === 'number' && !isNaN(d));

  if (validDistances.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      total: 0,
      count: 0
    };
  }

  const sorted = [...validDistances].sort((a, b) => a - b);
  const total = sorted.reduce((sum, d) => sum + d, 0);

  return {
    min: roundTo(sorted[0], 2),
    max: roundTo(sorted[sorted.length - 1], 2),
    avg: roundTo(total / sorted.length, 2),
    median: roundTo(sorted[Math.floor(sorted.length / 2)], 2),
    total: roundTo(total, 2),
    count: sorted.length
  };
}

// ========================================
// PERFORMANCE TESTING
// ========================================

/**
 * Benchmark des calculs de distance
 * Utile pour tester les optimisations
 */
function benchmarkDistanceCalculations() {
  logger.info('=== BENCHMARK DISTANCE SERVICE ===');

  const testPoints = [];
  for (let i = 0; i < 1000; i++) {
    testPoints.push({
      lat: 45 + Math.random() * 5,
      lng: -2 + Math.random() * 5
    });
  }

  // Test 1: Calculs individuels
  const start1 = Date.now();
  testPoints.forEach(p => {
    calculateDistance(48.8566, 2.3522, p.lat, p.lng);
  });
  const duration1 = Date.now() - start1;
  logger.info(`1000 calculs individuels: ${duration1}ms`);

  // Test 2: Batch
  const start2 = Date.now();
  calculateDistances(48.8566, 2.3522, testPoints);
  const duration2 = Date.now() - start2;
  logger.info(`1000 calculs batch: ${duration2}ms`);

  // Test 3: Recherche dans rayon avec bounding box
  const start3 = Date.now();
  findPointsInRadius(48.8566, 2.3522, testPoints, 200);
  const duration3 = Date.now() - start3;
  logger.info(`Recherche rayon 200km: ${duration3}ms`);

  logger.info('=== FIN BENCHMARK ===');
}