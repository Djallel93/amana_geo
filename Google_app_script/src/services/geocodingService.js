/**
 * Service de géocodage - Résolution basée uniquement sur les polygones
 */

const GeocodingService = {

    /**
     * Géocode une adresse avec cache
     */
    geocodeAddress(address, country = null) {
        const cacheKey = CacheManager.getGeocodeKey(address);
        const cached = CacheManager.get(cacheKey);

        if (cached) return cached;

        try {
            const geocoder = Maps.newGeocoder();
            geocoder.setRegion(country || 'fr');
            geocoder.setLanguage('fr');

            const response = geocoder.geocode(address);

            if (!response.results || response.results.length === 0) {
                return {
                    isValid: false,
                    error: 'Adresse introuvable'
                };
            }

            const result = response.results[0];
            const location = result.geometry.location;

            const geocodeResult = {
                isValid: true,
                coordinates: {
                    latitude: location.lat,
                    longitude: location.lng
                },
                formattedAddress: result.formatted_address,
                locationType: result.geometry.location_type
            };

            CacheManager.set(cacheKey, geocodeResult);
            return geocodeResult;

        } catch (e) {
            Logger.error(`Erreur géocodage: ${e.message}`, { address });
            return { isValid: false, error: e.message };
        }
    },

    /**
     * Géocodage inversé (coordonnées → adresse)
     */
    reverseGeocode(lat, lng) {
        if (!Utils.isValidCoordinates(lat, lng)) {
            return { isValid: false, error: CONFIG.ERRORS.INVALID_COORDINATES };
        }

        const cacheKey = CacheManager.generateKey('reverse', lat, lng);
        const cached = CacheManager.get(cacheKey);

        if (cached) return cached;

        try {
            const geocoder = Maps.newGeocoder();
            const response = geocoder.reverseGeocode(lat, lng);

            if (!response.results || response.results.length === 0) {
                return { isValid: false, error: 'Aucune adresse trouvée' };
            }

            const result = {
                isValid: true,
                address: response.results[0].formatted_address,
                coordinates: { latitude: lat, longitude: lng }
            };

            CacheManager.set(cacheKey, result);
            return result;

        } catch (e) {
            Logger.error(`Erreur géocodage inversé: ${e.message}`, { lat, lng });
            return { isValid: false, error: e.message };
        }
    },

    /**
     * Trouve le quartier depuis une adresse
     */
    findQuartierFromAddress(address) {
        Logger.info(`Recherche quartier pour: ${address}`);

        const geocodeResult = this.geocodeAddress(address);

        if (!geocodeResult.isValid) {
            throw new Error('Impossible de géocoder cette adresse');
        }

        const { latitude, longitude } = geocodeResult.coordinates;

        return this.resolveQuartierFromCoordinates(latitude, longitude);
    },

    /**
     * Résolution quartier depuis coordonnées - UNIQUEMENT PAR POLYGONES
     */
    resolveQuartierFromCoordinates(lat, lng) {
        const quartiers = DataService.loadAll('QUARTIERS');

        if (quartiers.length === 0) {
            throw new Error('Aucun quartier en base de données');
        }

        Logger.info(`Recherche dans ${quartiers.length} quartiers`);

        // Chercher dans les polygones
        const matchingPolygons = [];

        for (const q of quartiers) {
            if (q.polygon && Utils.isPointInPolygon(lat, lng, q.polygon)) {
                const area = Utils.polygonArea(q.polygon);
                matchingPolygons.push({ quartier: q, area });
                Logger.debug(`Point dans polygon: ${q.nom}`);
            }
        }

        // Un seul match
        if (matchingPolygons.length === 1) {
            Logger.info('Résolution: point-in-polygon (unique)');
            return this.formatQuartierResult(
                matchingPolygons[0].quartier,
                'point-in-polygon'
            );
        }

        // Plusieurs matchs: choisir le plus petit
        if (matchingPolygons.length > 1) {
            matchingPolygons.sort((a, b) => a.area - b.area);
            const smallest = matchingPolygons[0];

            Logger.info(`Résolution: point-in-polygon (plus petit parmi ${matchingPolygons.length})`);
            return this.formatQuartierResult(
                smallest.quartier,
                'point-in-polygon-smallest',
                `Point dans ${matchingPolygons.length} polygones`
            );
        }

        // Aucun match
        throw new Error('Aucun quartier trouvé pour ces coordonnées');
    },

    /**
     * Résolution ville depuis coordonnées - UNIQUEMENT PAR POLYGONES
     */
    resolveVilleFromCoordinates(lat, lng) {
        const villes = DataService.loadAll('VILLES');

        if (villes.length === 0) {
            throw new Error('Aucune ville en base de données');
        }

        Logger.info(`Recherche dans ${villes.length} villes`);

        // Chercher dans les polygones
        const matchingPolygons = [];

        for (const v of villes) {
            if (v.polygon && Utils.isPointInPolygon(lat, lng, v.polygon)) {
                const area = Utils.polygonArea(v.polygon);
                matchingPolygons.push({ ville: v, area });
                Logger.debug(`Point dans polygon: ${v.nom}`);
            }
        }

        // Un seul match
        if (matchingPolygons.length === 1) {
            Logger.info('Résolution: point-in-polygon (unique)');
            return this.formatVilleResult(
                matchingPolygons[0].ville,
                'point-in-polygon'
            );
        }

        // Plusieurs matchs: choisir le plus petit
        if (matchingPolygons.length > 1) {
            matchingPolygons.sort((a, b) => a.area - b.area);
            const smallest = matchingPolygons[0];

            Logger.info(`Résolution: point-in-polygon (plus petit parmi ${matchingPolygons.length})`);
            return this.formatVilleResult(
                smallest.ville,
                'point-in-polygon-smallest',
                `Point dans ${matchingPolygons.length} polygones`
            );
        }

        // Aucun match
        throw new Error('Aucune ville trouvée pour ces coordonnées');
    },

    /**
     * Formate le résultat quartier
     */
    formatQuartierResult(quartier, method, details = null) {
        return {
            success: true,
            quartierId: quartier.id,
            quartierNom: quartier.nom,
            idVille: quartier.idVille,
            resolutionMethod: method,
            resolutionDetails: details,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Formate le résultat ville
     */
    formatVilleResult(ville, method, details = null) {
        return {
            success: true,
            villeId: ville.id,
            villeNom: ville.nom,
            codePostal: ville.codePostal,
            departement: ville.departement,
            resolutionMethod: method,
            resolutionDetails: details,
            timestamp: new Date().toISOString()
        };
    }
};