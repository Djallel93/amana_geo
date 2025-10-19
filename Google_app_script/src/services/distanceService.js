/** ===============================================================
 *  SECTION 1 : CONSTANTES ET OUTILS DE CONVERSION
 * =============================================================== */

/** Rayon moyen de la Terre en mètres */
const EARTH_RADIUS_KM = 6371;

/**
 * Convertit des degrés en radians.
 * @param {number} degrees - Angle en degrés
 * @returns {number} Angle en radians
 */
function degreesToRadians(degrees) {
  const radians = (degrees * Math.PI) / 180;
  console.log(`[degreesToRadians] ${degrees}° -> ${radians} rad`);
  return radians;
}

/**
 * Convertit des radians en degrés.
 * @param {number} radians - Angle en radians
 * @returns {number} Angle en degrés
 */
function radiansToDegrees(radians) {
  const degrees = (radians * 180) / Math.PI;
  console.log(`[radiansToDegrees] ${radians} rad -> ${degrees}°`);
  return degrees;
}

/**
 * Convertit des mètres en kilomètres.
 * @param {number} meters - Distance en mètres
 * @returns {number} Distance en kilomètres
 */
function metersToKilometers(meters) {
  const km = meters / 1000;
  console.log(`[metersToKilometers] ${meters} m -> ${km} km`);
  return km;
}

/**
 * Convertit des kilomètres en mètres.
 * @param {number} kilometers - Distance en kilomètres
 * @returns {number} Distance en mètres
 */
function kilometersToMeters(kilometers) {
  const meters = kilometers * 1000;
  console.log(`[kilometersToMeters] ${kilometers} km -> ${meters} m`);
  return meters;
}

/** ===============================================================
 *  SECTION 2 : CALCULS GÉOGRAPHIQUES DE BASE
 * =============================================================== */

/**
 * Calcule la distance entre deux points géographiques (formule de Haversine).
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} Distance en mètres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = EARTH_RADIUS_KM;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return roundTo(R * c, 3); // Returns km
}

/**
 * Calcule le cap (bearing) initial entre deux points.
 * @param {number} lat1 - Latitude du point de départ
 * @param {number} lon1 - Longitude du point de départ
 * @param {number} lat2 - Latitude du point d’arrivée
 * @param {number} lon2 - Longitude du point d’arrivée
 * @returns {number} Cap en degrés (0° = Nord)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = degreesToRadians(lat1);
  const φ2 = degreesToRadians(lat2);
  const Δλ = degreesToRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = (radiansToDegrees(θ) + 360) % 360;

  console.log(`[calculateBearing] Cap initial = ${bearing}°`);
  return bearing;
}

/**
 * Calcule le point de destination à partir d’un point initial,
 * d’un cap (bearing) et d’une distance.
 * @param {number} lat - Latitude du point de départ
 * @param {number} lon - Longitude du point de départ
 * @param {number} bearing - Cap en degrés
 * @param {number} distance - Distance en mètres
 * @returns {{ lat: number, lon: number }} Coordonnées du point d’arrivée
 */
function calculateDestinationPoint(lat, lon, bearing, distance) {
  const δ = distance / EARTH_RADIUS; // distance angulaire
  const θ = degreesToRadians(bearing);
  const φ1 = degreesToRadians(lat);
  const λ1 = degreesToRadians(lon);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  const lat2 = radiansToDegrees(φ2);
  const lon2 = (radiansToDegrees(λ2) + 540) % 360 - 180;

  console.log(
    `[calculateDestinationPoint] (${lat}, ${lon}) + ${distance}m @ ${bearing}° -> (${lat2}, ${lon2})`
  );
  return { lat: lat2, lon: lon2 };
}

/** ===============================================================
 *  SECTION 3 : STATISTIQUES SUR LES DISTANCES
 * =============================================================== */

/**
 * Calcule des statistiques sur un ensemble de distances.
 * @param {number[]} distances - Tableau de distances (en mètres)
 * @returns {{ min: number, max: number, average: number, total: number }}
 */
function calculateDistanceStatistics(distances) {
  if (!Array.isArray(distances) || distances.length === 0) {
    console.warn("[calculateDistanceStatistics] Tableau vide ou invalide.");
    return { min: 0, max: 0, average: 0, total: 0 };
  }

  const total = distances.reduce((sum, d) => sum + d, 0);
  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const average = total / distances.length;

  console.log(`[calculateDistanceStatistics] min=${min}, max=${max}, avg=${average}, total=${total}`);
  return { min, max, average, total };
}

/** ===============================================================
 *  SECTION 4 : OUTILS COMPLÉMENTAIRES
 * =============================================================== */

/**
 * Calcule les distances successives entre chaque paire de points dans une liste.
 * Exemple : pour [P1, P2, P3], retourne [distance(P1,P2), distance(P2,P3)]
 * @param {{ lat: number, lon: number }[]} points - Tableau de points GPS ordonnés
 * @returns {number[]} Tableau des distances entre points successifs (en mètres)
 */
function calculateDistances(points) {
  if (!Array.isArray(points) || points.length < 2) {
    console.warn("[calculateDistances] Moins de 2 points fournis.");
    return [];
  }

  const distances = [];
  for (let i = 0; i < points.length - 1; i++) {
    const { lat: lat1, lon: lon1 } = points[i];
    const { lat: lat2, lon: lon2 } = points[i + 1];
    const d = calculateDistance(lat1, lon1, lat2, lon2);
    distances.push(d);
    console.log(`[calculateDistances] ${i}: ${d.toFixed(2)} m entre P${i + 1} et P${i + 2}`);
  }

  console.log(`[calculateDistances] ${distances.length} segments calculés.`);
  return distances;
}

/**
 * Calcule la distance totale d’un trajet défini par une liste de points GPS.
 * @param {{ lat: number, lon: number }[]} points - Liste ordonnée de points GPS
 * @returns {number} Distance totale en mètres
 */
function calculateTotalPathDistance(points) {
  if (!Array.isArray(points) || points.length < 2) {
    console.warn("[calculateTotalPathDistance] Moins de 2 points fournis.");
    return 0;
  }

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const { lat: lat1, lon: lon1 } = points[i];
    const { lat: lat2, lon: lon2 } = points[i + 1];
    total += calculateDistance(lat1, lon1, lat2, lon2);
  }

  console.log(`[calculateTotalPathDistance] Distance totale = ${total} m`);
  return total;
}

/**
 * Trouve le point le plus proche d’un point de référence dans une liste de points.
 * @param {{ lat: number, lon: number }} referencePoint - Point de référence
 * @param {{ lat: number, lon: number }[]} points - Liste de points à comparer
 * @returns {{ point: { lat: number, lon: number }, distance: number, index: number } | null}
 */
function findNearestPoint(referencePoint, points) {
  if (
    !referencePoint ||
    typeof referencePoint.lat !== "number" ||
    typeof referencePoint.lon !== "number" ||
    !Array.isArray(points) ||
    points.length === 0
  ) {
    console.warn("[findNearestPoint] Paramètres invalides.");
    return null;
  }

  let nearest = null;
  let minDistance = Infinity;
  let nearestIndex = -1;

  points.forEach((p, i) => {
    const d = calculateDistance(referencePoint.lat, referencePoint.lon, p.lat, p.lon);
    if (d < minDistance) {
      minDistance = d;
      nearest = p;
      nearestIndex = i;
    }
  });

  console.log(
    `[findNearestPoint] Point le plus proche trouvé à ${minDistance.toFixed(2)} m (index ${nearestIndex}).`
  );

  return nearest
    ? { point: nearest, distance: minDistance, index: nearestIndex }
    : null;
}

/**
 * Vérifie si deux points sont "proches" l’un de l’autre selon un seuil.
 * @param {{ lat: number, lon: number }} p1 - Premier point
 * @param {{ lat: number, lon: number }} p2 - Deuxième point
 * @param {number} threshold - Distance maximale (en mètres)
 * @returns {boolean} true si les points sont proches
 */
function arePointsClose(p1, p2, threshold = 50) {
  const distance = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);
  const result = distance <= threshold;
  console.log(`[arePointsClose] ${distance}m <= ${threshold}m ? ${result}`);
  return result;
}

function calculateDistances(originLat, originLng, destinations) {
  return destinations.map((dest, index) => {
    const destLat = dest.lat || dest.latitude;
    const destLng = dest.lng || dest.longitude;
    if (typeof destLat !== 'number' || typeof destLng !== 'number') {
      return { index, distance: null, error: 'Invalid coords' };
    }
    return {
      index,
      distance: calculateDistance(originLat, originLng, destLat, destLng),
      lat: destLat,
      lng: destLng
    };
  });
}

function findNearestPoint(referencePoint, points) {
  if (!referencePoint || !Array.isArray(points) || points.length === 0) {
    return null;
  }

  const refLat = referencePoint.latitude || referencePoint.lat;
  const refLng = referencePoint.longitude || referencePoint.lng;

  let nearest = null;
  let minDistance = Infinity;
  let nearestIndex = -1;

  points.forEach((p, i) => {
    const pLat = p.latitude || p.lat;
    const pLng = p.longitude || p.lng;
    if (typeof pLat !== 'number' || typeof pLng !== 'number') return;

    const d = calculateDistance(refLat, refLng, pLat, pLng);
    if (d < minDistance) {
      minDistance = d;
      nearest = p;
      nearestIndex = i;
    }
  });

  if (!nearest) return null;

  return {
    point: nearest,
    distance: minDistance,
    index: nearestIndex,
    name: nearest.name || `Point ${nearestIndex}`
  };
}

function calculateCentroid(points) {
  let totalLat = 0, totalLng = 0, count = 0;

  points.forEach(p => {
    const lat = p.latitude || p.lat;
    const lng = p.longitude || p.lng;
    if (typeof lat === 'number' && typeof lng === 'number') {
      totalLat += lat;
      totalLng += lng;
      count++;
    }
  });

  return {
    latitude: roundTo(totalLat / count, 6),
    longitude: roundTo(totalLng / count, 6)
  };
}

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

function isPointInBounds(lat, lng, bounds) {
  return lat >= bounds.minLat && lat <= bounds.maxLat &&
    lng >= bounds.minLng && lng <= bounds.maxLng;
}