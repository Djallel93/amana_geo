/**
 * Service de calcul de distances géographiques
 * Utilise la formule de Haversine pour calculer les distances entre coordonnées GPS
 */

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lng1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lng2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  // Validation des coordonnées
  if (!isValidCoordinates(lat1, lng1) || !isValidCoordinates(lat2, lng2)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  // Conversion en radians
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);

  // Formule de Haversine
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = CONFIG.GEO.RAYON_TERRE_KM * c;

  Logger.log(`📏 Distance calculée: ${roundTo(distance, 3)} km`);

  return roundTo(distance, 3);
}

/**
 * Calcule les distances entre un point et plusieurs destinations
 * @param {number} originLat - Latitude d'origine
 * @param {number} originLng - Longitude d'origine
 * @param {Array<{lat: number, lng: number}>} destinations - Tableau de destinations
 * @returns {Array<{index: number, distance: number}>} Distances calculées avec index
 */
function calculateDistances(originLat, originLng, destinations) {
  if (!Array.isArray(destinations) || destinations.length === 0) {
    throw new Error('Destinations invalides ou vides');
  }

  logWithTimestamp(`Calcul de ${destinations.length} distances`, 'INFO');

  const results = destinations.map((dest, index) => {
    try {
      const distance = calculateDistance(
        originLat,
        originLng,
        dest.lat || dest.latitude,
        dest.lng || dest.longitude
      );

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

/**
 * Trouve le point le plus proche parmi une liste
 * @param {number} originLat - Latitude d'origine
 * @param {number} originLng - Longitude d'origine
 * @param {Array<Object>} points - Tableau de points avec lat/lng
 * @returns {Object} Point le plus proche avec sa distance
 */
function findNearestPoint(originLat, originLng, points) {
  if (!points || points.length === 0) {
    return null;
  }

  const distances = calculateDistances(originLat, originLng, points);

  // Filtrer les erreurs et trier par distance
  const validDistances = distances
    .filter(d => d.distance !== null)
    .sort((a, b) => a.distance - b.distance);

  if (validDistances.length === 0) {
    return null;
  }

  const nearest = validDistances[0];
  Logger.log(`🎯 Point le plus proche trouvé: ${roundTo(nearest.distance, 2)} km`);

  return nearest;
}

/**
 * Trouve tous les points dans un rayon donné
 * @param {number} originLat - Latitude d'origine
 * @param {number} originLng - Longitude d'origine
 * @param {Array<Object>} points - Tableau de points
 * @param {number} radiusKm - Rayon en kilomètres
 * @returns {Array<Object>} Points dans le rayon avec distances
 */
function findPointsInRadius(originLat, originLng, points, radiusKm) {
  const distances = calculateDistances(originLat, originLng, points);

  const pointsInRadius = distances
    .filter(d => d.distance !== null && d.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  Logger.log(`📍 ${pointsInRadius.length} points trouvés dans un rayon de ${radiusKm} km`);

  return pointsInRadius;
}

/**
 * Calcule le point central (centroïde) d'un ensemble de coordonnées
 * @param {Array<{lat: number, lng: number}>} coordinates - Tableau de coordonnées
 * @returns {Object} Coordonnées du centre {latitude, longitude}
 */
function calculateCentroid(coordinates) {
  if (!coordinates || coordinates.length === 0) {
    throw new Error('Aucune coordonnée fournie');
  }

  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  coordinates.forEach(coord => {
    const lat = coord.lat || coord.latitude;
    const lng = coord.lng || coord.longitude;

    if (isValidCoordinates(lat, lng)) {
      sumLat += lat;
      sumLng += lng;
      count++;
    }
  });

  if (count === 0) {
    throw new Error('Aucune coordonnée valide trouvée');
  }

  const centroid = {
    latitude: sumLat / count,
    longitude: sumLng / count
  };

  Logger.log(`📊 Centroïde calculé: ${centroid.latitude}, ${centroid.longitude}`);

  return centroid;
}

/**
 * Calcule la distance totale d'un itinéraire (succession de points)
 * @param {Array<{lat: number, lng: number}>} waypoints - Points de l'itinéraire
 * @returns {number} Distance totale en kilomètres
 */
function calculateRouteDistance(waypoints) {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('Au moins 2 points nécessaires pour un itinéraire');
  }

  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const point1 = waypoints[i];
    const point2 = waypoints[i + 1];

    const distance = calculateDistance(
      point1.lat || point1.latitude,
      point1.lng || point1.longitude,
      point2.lat || point2.latitude,
      point2.lng || point2.longitude
    );

    totalDistance += distance;
  }

  Logger.log(`🛣️ Distance totale itinéraire: ${roundTo(totalDistance, 2)} km`);

  return roundTo(totalDistance, 2);
}

/**
 * Vérifie si un point est dans un rectangle délimité (bounding box)
 * @param {number} lat - Latitude du point
 * @param {number} lng - Longitude du point
 * @param {Object} bounds - {north, south, east, west}
 * @returns {boolean} True si le point est dans la zone
 */
function isPointInBounds(lat, lng, bounds) {
  return lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west;
}

/**
 * Calcule une bounding box autour d'un point avec un rayon donné
 * @param {number} lat - Latitude du centre
 * @param {number} lng - Longitude du centre
 * @param {number} radiusKm - Rayon en kilomètres
 * @returns {Object} Bounding box {north, south, east, west}
 */
function calculateBoundingBox(lat, lng, radiusKm) {
  // Approximation: 1° latitude ≈ 111 km
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(toRadians(lat)));

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta
  };
}