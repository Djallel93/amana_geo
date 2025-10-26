/**
 * Service de géocodage d'adresses
 */

/**
 * Normalise une chaîne SANS supprimer les accents (pour géocodage)
 * @param {string} str - Chaîne à normaliser
 * @returns {string} Chaîne normalisée avec accents préservés
 */
function normalizeForGeocoding(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Crée une clé de cache UNIQUE qui préserve les accents
 * @param {string} address - Adresse complète
 * @returns {string} Clé de cache unique
 */
function createGeocodeKey(address) {
  // Utiliser un hash pour éviter les collisions
  const normalized = address.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Simple hash pour assurer l'unicité
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Retourner une clé qui inclut le hash
  return `geocode_${normalized.substring(0, 50)}_${Math.abs(hash)}`;
}

// ========================================
// VALIDATION DE RÉSULTATS
// ========================================

/**
 * Vérifie si le résultat de géocodage est trop générique
 * @param {Object} result - Résultat Google Maps
 * @param {string} searchedAddress - Adresse recherchée
 * @returns {Object} {isValid: boolean, reason: string}
 */
function validateGeocodingResult(result, searchedAddress) {
  if (!result || !result.geometry || !result.geometry.location) {
    return { isValid: false, reason: 'Résultat vide' };
  }

  const locationType = result.geometry.location_type;
  const addressComponents = result.address_components || [];
  const formattedAddress = result.formatted_address || '';

  // Extraire le nom du quartier recherché
  const searchedQuartier = searchedAddress.split(',')[0].trim().toLowerCase();

  // Vérifier si le résultat contient le quartier recherché
  const containsQuartier = formattedAddress.toLowerCase().includes(searchedQuartier) ||
    addressComponents.some(comp => 
      comp.long_name.toLowerCase().includes(searchedQuartier) ||
      comp.short_name.toLowerCase().includes(searchedQuartier)
    );

  // REJET 1: Résultat trop imprécis (seulement ville/code postal)
  if (locationType === 'APPROXIMATE') {
    console.log(`⚠️ Résultat APPROXIMATE pour "${searchedAddress}" - peut-être trop générique`);
    
    if (!containsQuartier) {
      return { 
        isValid: false, 
        reason: `Résultat trop générique (APPROXIMATE) - quartier "${searchedQuartier}" non trouvé dans "${formattedAddress}"` 
      };
    }
  }

  // REJET 2: Vérifier si on a au moins une route/rue
  const hasStreet = addressComponents.some(comp => 
    comp.types.includes('route') || 
    comp.types.includes('neighborhood') ||
    comp.types.includes('sublocality')
  );

  if (!hasStreet && locationType === 'APPROXIMATE') {
    return { 
      isValid: false, 
      reason: 'Pas de rue/quartier identifié - probablement centre-ville' 
    };
  }

  // REJET 3: Vérifier que ce n'est pas juste "Ville, France"
  const componentCount = addressComponents.length;
  if (componentCount < 4) {
    return { 
      isValid: false, 
      reason: 'Trop peu de composants d\'adresse - résultat générique' 
    };
  }

  return { isValid: true, reason: 'OK' };
}

// ========================================
// GÉOCODAGE AMÉLIORÉ
// ========================================

/**
 * Géocode une adresse avec validation renforcée
 * @param {string} address - Adresse à géocoder
 * @param {string} country - Pays (optionnel)
 * @param {boolean} strictMode - Mode strict (rejette résultats imprécis)
 * @returns {Object} Résultat du géocodage
 */
function geocodeAddressImproved(address, country = null, strictMode = true) {
  if (!address || isEmpty(address)) {
    throw new Error(CONFIG.ERRORS.MISSING_PARAMETERS);
  }

  const cleanedAddress = normalizeForGeocoding(address);
  const countryToUse = country || CONFIG.GEO.DEFAULT_COUNTRY;
  const fullAddress = `${cleanedAddress}, ${countryToUse}`;

  // NOUVEAU: Clé de cache unique avec hash
  const cacheKey = createGeocodeKey(fullAddress);
  const cached = getCache(cacheKey);

  if (cached) {
    console.log(`✅ Cache HIT: ${cacheKey}`);
    return cached;
  }

  console.log(`❌ Cache MISS: ${cacheKey}`);

  try {
    console.log(`🔍 Géocodage: ${fullAddress}`);

    const geocoder = Maps.newGeocoder();
    geocoder.setRegion('fr');
    geocoder.setLanguage('fr');
    const response = geocoder.geocode(fullAddress);

    if (!response.results || response.results.length === 0) {
      throw new Error(CONFIG.ERRORS.INVALID_ADDRESS);
    }

    const result = response.results[0];
    
    // NOUVEAU: Validation du résultat
    const validation = validateGeocodingResult(result, cleanedAddress);
    
    if (strictMode && !validation.isValid) {
      console.log(`❌ Résultat rejeté: ${validation.reason}`);
      
      return {
        isValid: false,
        error: 'GEOCODING_TOO_GENERIC',
        message: validation.reason,
        address: fullAddress,
        suggestion: 'Essayez avec une adresse plus précise (rue, numéro) ou géocodez manuellement'
      };
    }

    const location = result.geometry.location;
    const components = extractAddressComponents(result.address_components);

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
      validationWarning: validation.isValid ? null : validation.reason,
      timestamp: new Date().toISOString()
    };

    // Mettre en cache
    setCache(cacheKey, geocodingResult);
    console.log(`💾 Cache SET: ${cacheKey} (3600s)`);
    console.log(`✅ Géocodage réussi: ${location.lat}, ${location.lng}`);

    return geocodingResult;

  } catch (e) {
    console.log(`❌ Erreur géocodage: ${e.message}`);

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
    neighborhood: null,
    city: null,
    postalCode: null,
    department: null,
    region: null,
    country: null
  };

  if (!Array.isArray(addressComponents)) {
    return components;
  }

  addressComponents.forEach(component => {
    const types = component.types;

    if (types.includes('street_number')) {
      components.streetNumber = component.long_name;
    }
    if (types.includes('route')) {
      components.street = component.long_name;
    }
    if (types.includes('neighborhood') || types.includes('sublocality')) {
      components.neighborhood = component.long_name;
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
 * Géocode multiple adresses avec détection des doublons
 * @param {Array<string>} addresses - Tableau d'adresses
 * @param {boolean} strictMode - Mode strict
 * @returns {Array<Object>} Résultats du géocodage avec warnings
 */
function geocodeAddressesBatchImproved(addresses, strictMode = true) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('Tableau d\'adresses vide ou invalide');
  }

  console.log(`🔄 Géocodage batch amélioré: ${addresses.length} adresses`);

  const results = [];
  const coordinateMap = new Map(); // Détection des doublons

  addresses.forEach((address, index) => {
    try {
      const result = geocodeAddressImproved(address, null, strictMode);
      
      // Vérifier les doublons de coordonnées
      if (result.isValid) {
        const coordKey = `${result.coordinates.latitude.toFixed(4)},${result.coordinates.longitude.toFixed(4)}`;
        
        if (coordinateMap.has(coordKey)) {
          result.warning = `⚠️ Coordonnées identiques à "${coordinateMap.get(coordKey)}" - peut-être un doublon`;
          console.log(`⚠️ Doublon détecté: "${address}" et "${coordinateMap.get(coordKey)}"`);
        } else {
          coordinateMap.set(coordKey, address);
        }
      }

      results.push({
        index: index,
        address: address,
        ...result
      });

      // Pause tous les 5 géocodages
      if ((index + 1) % 5 === 0 && index < addresses.length - 1) {
        Utilities.sleep(1000);
      }

    } catch (e) {
      results.push({
        index: index,
        address: address,
        isValid: false,
        error: e.message
      });
    }
  });

  const successCount = results.filter(r => r.isValid).length;
  const warningCount = results.filter(r => r.warning).length;
  
  console.log(`✅ Géocodage terminé: ${successCount}/${addresses.length} réussis, ${warningCount} warnings`);

  return results;
}

/**
 * Wrapper pour compatibilité - utilise la nouvelle version par défaut
 */
function geocodeAddress(address, country = null) {
  return geocodeAddressImproved(address, country, true);
}