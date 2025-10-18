/**
 * Service de géocodage d'adresses
 * Utilise Google Maps Geocoding API avec cache pour économiser le quota
 */

/**
 * Géocode une adresse et retourne les coordonnées + détails
 * @param {string} address - Adresse à géocoder
 * @param {string} country - Pays (optionnel, défaut: France)
 * @returns {Object} Résultat du géocodage
 */
function geocodeAddress(address, country = null) {
  if (!address || isEmpty(address)) {
    throw new Error(CONFIG.ERRORS.MISSING_PARAMETERS);
  }

  // Nettoyer l'adresse
  const cleanedAddress = cleanAddress(address);
  const countryToUse = country || CONFIG.GEO.DEFAULT_COUNTRY;
  const fullAddress = `${cleanedAddress}, ${countryToUse}`;

  // Vérifier le cache
  const cacheKey = getCacheKeyForAddress(fullAddress);
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    logWithTimestamp(`🔍 Géocodage: ${fullAddress}`, 'INFO');

    // Appel à l'API Google Maps
    const geocoder = Maps.newGeocoder();
    geocoder.setRegion('fr'); // Prioriser les résultats français
    const response = geocoder.geocode(fullAddress);

    if (!response.results || response.results.length === 0) {
      throw new Error(CONFIG.ERRORS.INVALID_ADDRESS);
    }

    const result = response.results[0];
    const location = result.geometry.location;

    // Extraire les composants d'adresse
    const components = extractAddressComponents(result.address_components);

    // Construire la réponse
    const geocodingResult = {
      isValid: true,
      coordinates: {
        latitude: location.lat,
        longitude: location.lng
      },
      formattedAddress: result.formatted_address,
      components: components,
      locationType: result.geometry.location_type,
      placeId: result.place_id,
      timestamp: new Date().toISOString()
    };

    // Mettre en cache
    setCache(cacheKey, geocodingResult);

    logWithTimestamp(`✅ Géocodage réussi: ${location.lat}, ${location.lng}`, 'INFO');

    return geocodingResult;

  } catch (e) {
    logWithTimestamp(`❌ Erreur géocodage: ${e.message}`, 'ERROR');

    return {
      isValid: false,
      error: CONFIG.ERRORS.GEOCODING_FAILED,
      message: e.message,
      address: fullAddress
    };
  }
}

/**
 * Extrait et structure les composants d'une adresse
 * @param {Array} addressComponents - Composants bruts de Google Maps
 * @returns {Object} Composants structurés
 */
function extractAddressComponents(addressComponents) {
  const components = {
    streetNumber: null,
    street: null,
    city: null,
    postalCode: null,
    department: null,
    region: null,
    country: null
  };

  addressComponents.forEach(component => {
    const types = component.types;

    if (types.includes('street_number')) {
      components.streetNumber = component.long_name;
    }
    if (types.includes('route')) {
      components.street = component.long_name;
    }
    if (types.includes('locality')) {
      components.city = component.long_name;
    }
    if (types.includes('postal_code')) {
      components.postalCode = component.long_name;
    }
    if (types.includes('administrative_area_level_2')) {
      components.department = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      components.region = component.long_name;
    }
    if (types.includes('country')) {
      components.country = component.long_name;
    }
  });

  return components;
}

/**
 * Géocode multiple adresses en batch
 * @param {Array<string>} addresses - Tableau d'adresses
 * @param {number} batchSize - Taille des lots (défaut: config)
 * @returns {Array<Object>} Résultats du géocodage
 */
function geocodeAddressesBatch(addresses, batchSize = null) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('Tableau d\'adresses vide ou invalide');
  }

  const size = batchSize || CONFIG.QUOTAS.BATCH_SIZE;
  const results = [];

  logWithTimestamp(`🔄 Géocodage batch: ${addresses.length} adresses`, 'INFO');

  // Traiter par lots pour éviter timeouts
  for (let i = 0; i < addresses.length; i += size) {
    const batch = addresses.slice(i, i + size);

    batch.forEach((address, index) => {
      try {
        const result = geocodeAddress(address);
        results.push({
          index: i + index,
          address: address,
          ...result
        });

        // Pause pour éviter rate limiting
        if ((i + index + 1) % 10 === 0) {
          Utilities.sleep(500); // 0.5 seconde de pause tous les 10 appels
        }

      } catch (e) {
        results.push({
          index: i + index,
          address: address,
          isValid: false,
          error: e.message
        });
      }
    });

    logWithTimestamp(`📊 Progression: ${Math.min(i + size, addresses.length)}/${addresses.length}`, 'INFO');
  }

  const successCount = results.filter(r => r.isValid).length;
  logWithTimestamp(`✅ Géocodage terminé: ${successCount}/${addresses.length} réussis`, 'INFO');

  return results;
}

/**
 * Géocode inversé: trouve l'adresse à partir de coordonnées
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} Adresse trouvée
 */
function reverseGeocode(lat, lng) {
  if (!isValidCoordinates(lat, lng)) {
    throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
  }

  const cacheKey = `reverse_${lat.toFixed(6)}_${lng.toFixed(6)}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    logWithTimestamp(`🔍 Géocodage inversé: ${lat}, ${lng}`, 'INFO');

    const geocoder = Maps.newGeocoder();
    const response = geocoder.reverseGeocode(lat, lng);

    if (!response.results || response.results.length === 0) {
      throw new Error('Aucune adresse trouvée pour ces coordonnées');
    }

    const result = response.results[0];
    const components = extractAddressComponents(result.address_components);

    const reverseResult = {
      isValid: true,
      formattedAddress: result.formatted_address,
      components: components,
      placeId: result.place_id,
      coordinates: {
        latitude: lat,
        longitude: lng
      }
    };

    setCache(cacheKey, reverseResult);

    return reverseResult;

  } catch (e) {
    logWithTimestamp(`❌ Erreur géocodage inversé: ${e.message}`, 'ERROR');

    return {
      isValid: false,
      error: 'Géocodage inversé échoué',
      message: e.message
    };
  }
}

/**
 * Valide une adresse sans récupérer tous les détails
 * @param {string} address - Adresse à valider
 * @returns {boolean} True si l'adresse est valide
 */
function validateAddress(address) {
  try {
    const result = geocodeAddress(address);
    return result.isValid === true;
  } catch (e) {
    return false;
  }
}

/**
 * Normalise une adresse (retourne la version formatée par Google)
 * @param {string} address - Adresse brute
 * @returns {string} Adresse normalisée
 */
function normalizeAddress(address) {
  const result = geocodeAddress(address);

  if (result.isValid) {
    return result.formattedAddress;
  }

  return address;
}