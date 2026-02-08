/**
 * Service de traitement par lot (Batch Processing)
 * Version 5.1
 */

const BatchService = {

    /**
     * Géocodage par lot
     * @param {Array} adresses - Tableau d'objets {adresse, ville?, codePostal?, pays?}
     * @returns {Object} Réponse JSON avec résultats
     */
    batchGeocode(adresses) {
        Logger.info(`🔄 Démarrage batch geocode pour ${adresses.length} adresses`);

        if (adresses.length > CONFIG.BATCH.MAX_ITEMS) {
            return Utils.createErrorResponse(
                'BATCH_LIMIT_EXCEEDED',
                `Limite dépassée. Maximum ${CONFIG.BATCH.MAX_ITEMS} éléments par requête`,
                400
            );
        }

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < adresses.length; i++) {
            const item = adresses[i];

            if (!item.adresse) {
                results.push({
                    index: i,
                    success: false,
                    error: 'Adresse manquante',
                    input: item
                });
                failureCount++;
                continue;
            }

            try {
                const geocodeResult = GeocodingService.geocodeAddress(
                    item.adresse,
                    item.ville,
                    item.codePostal || item.code_postal,
                    item.pays
                );

                results.push({
                    index: i,
                    success: geocodeResult.isValid,
                    result: geocodeResult,
                    input: item
                });

                if (geocodeResult.isValid) {
                    successCount++;
                } else {
                    failureCount++;
                }

            } catch (error) {
                Logger.error(`Erreur batch geocode index ${i}`, { error: error.message });
                results.push({
                    index: i,
                    success: false,
                    error: error.message,
                    input: item
                });
                failureCount++;
            }

            // Pause pour éviter rate limiting
            if (i > 0 && i % CONFIG.BATCH.PAUSE_EVERY === 0) {
                Logger.debug(`Pause après ${i} éléments`);
                Utilities.sleep(CONFIG.BATCH.PAUSE_MS);
            }
        }

        Logger.success(`Batch geocode terminé: ${successCount} succès, ${failureCount} échecs`);

        return Utils.createJsonResponse({
            totalProcessed: adresses.length,
            successCount: successCount,
            failureCount: failureCount,
            results: results
        });
    },

    /**
     * Résolution de localisation par lot
     * @param {Array} coordinates - Tableau d'objets {lat, lng}
     * @returns {Object} Réponse JSON avec résultats
     */
    batchResolveLocation(coordinates) {
        Logger.info(`🔄 Démarrage batch resolve pour ${coordinates.length} coordonnées`);

        if (coordinates.length > CONFIG.BATCH.MAX_ITEMS) {
            return Utils.createErrorResponse(
                'BATCH_LIMIT_EXCEEDED',
                `Limite dépassée. Maximum ${CONFIG.BATCH.MAX_ITEMS} éléments par requête`,
                400
            );
        }

        // Charger la hiérarchie une seule fois pour optimiser
        const hierarchy = DataService.loadHierarchy();

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < coordinates.length; i++) {
            const item = coordinates[i];
            const lat = parseFloat(item.lat || item.latitude);
            const lng = parseFloat(item.lng || item.longitude);

            if (isNaN(lat) || isNaN(lng)) {
                results.push({
                    index: i,
                    success: false,
                    error: 'Coordonnées invalides',
                    input: item
                });
                failureCount++;
                continue;
            }

            try {
                const resolveResult = GeocodingService.resolveLocationWithHierarchy(lat, lng, hierarchy);

                results.push({
                    index: i,
                    success: true,
                    result: resolveResult,
                    input: { lat: lat, lng: lng }
                });
                successCount++;

            } catch (error) {
                Logger.warn(`Résolution échouée index ${i}`, { lat, lng, error: error.message });
                results.push({
                    index: i,
                    success: false,
                    error: error.message,
                    input: { lat: lat, lng: lng }
                });
                failureCount++;
            }
        }

        Logger.success(`Batch resolve terminé: ${successCount} succès, ${failureCount} échecs`);

        return Utils.createJsonResponse({
            totalProcessed: coordinates.length,
            successCount: successCount,
            failureCount: failureCount,
            results: results
        });
    },

    /**
     * Calcul de distance par lot
     * @param {Array} coordinates - Tableau d'objets {lat, lng}
     * @param {Object} reference - Point de référence {lat, lng}
     * @returns {Object} Réponse JSON avec résultats
     */
    batchCalculateDistance(coordinates, reference) {
        Logger.info(`🔄 Démarrage batch distance pour ${coordinates.length} points`);

        if (coordinates.length > CONFIG.BATCH.MAX_ITEMS) {
            return Utils.createErrorResponse(
                'BATCH_LIMIT_EXCEEDED',
                `Limite dépassée. Maximum ${CONFIG.BATCH.MAX_ITEMS} éléments par requête`,
                400
            );
        }

        const refLat = parseFloat(reference.lat || reference.latitude);
        const refLng = parseFloat(reference.lng || reference.longitude);

        if (isNaN(refLat) || isNaN(refLng)) {
            return Utils.createErrorResponse(
                CONFIG.ERRORS.INVALID_COORDINATES,
                'Point de référence invalide'
            );
        }

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < coordinates.length; i++) {
            const item = coordinates[i];
            const lat = parseFloat(item.lat || item.latitude);
            const lng = parseFloat(item.lng || item.longitude);

            if (isNaN(lat) || isNaN(lng)) {
                results.push({
                    index: i,
                    success: false,
                    error: 'Coordonnées invalides',
                    input: item
                });
                failureCount++;
                continue;
            }

            try {
                const distance = Utils.calculateDistance(refLat, refLng, lat, lng);

                results.push({
                    index: i,
                    success: true,
                    distance: distance,
                    unit: 'km',
                    coordinates: { latitude: lat, longitude: lng },
                    input: item
                });
                successCount++;

            } catch (error) {
                Logger.error(`Erreur calcul distance index ${i}`, { error: error.message });
                results.push({
                    index: i,
                    success: false,
                    error: error.message,
                    input: item
                });
                failureCount++;
            }
        }

        Logger.success(`Batch distance terminé: ${successCount} succès, ${failureCount} échecs`);

        return Utils.createJsonResponse({
            reference: { latitude: refLat, longitude: refLng },
            totalProcessed: coordinates.length,
            successCount: successCount,
            failureCount: failureCount,
            results: results
        });
    }
};