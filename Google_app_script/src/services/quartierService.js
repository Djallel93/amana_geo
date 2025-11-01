/**
 * Service de gestion des quartiers optimisé
 */

const QuartierService = {

    /**
     * Trouve le quartier le plus proche
     */
    findNearestQuartier(lat, lng, maxDistance = null) {
        if (!Utils.isValidCoordinates(lat, lng)) {
            throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
        }

        const cacheKey = CacheManager.getQuartierKey(lat, lng);
        const cached = CacheManager.get(cacheKey);

        if (cached) return cached;

        const maxDist = maxDistance || CONFIG.GEO.DISTANCE_MAX_KM;
        const quartiers = DataService.loadAll('QUARTIERS');

        if (quartiers.length === 0) {
            Logger.warn('Aucun quartier en base');
            return null;
        }

        Logger.info(`Recherche quartier proche de ${lat}, ${lng}`);

        // Optimisation: bounding box pour pré-filtrage
        const bounds = Utils.calculateBoundingBox(lat, lng, maxDist);
        const nearbyQuartiers = quartiers.filter(q =>
            Utils.isPointInBounds(q.centreLatitude, q.centreLongitude, bounds)
        );

        if (nearbyQuartiers.length === 0) {
            Logger.warn('Aucun quartier dans la bounding box');
            return null;
        }

        let minDistance = Infinity;
        let nearest = null;

        for (const q of nearbyQuartiers) {
            const distance = Utils.calculateDistance(
                lat, lng,
                q.centreLatitude, q.centreLongitude
            );

            if (distance < minDistance && distance <= maxDist) {
                minDistance = distance;
                nearest = q;
            }
        }

        if (!nearest) {
            Logger.warn(`Quartier trop éloigné: > ${maxDist} km`);
            return null;
        }

        const result = {
            quartierId: nearest.id,
            quartierName: nearest.nom,
            distance: Utils.roundTo(minDistance, 3),
            quartierLatitude: nearest.centreLatitude,
            quartierLongitude: nearest.centreLongitude,
            idSecteur: nearest.idSecteur
        };

        CacheManager.set(cacheKey, result);
        Logger.success(`Quartier trouvé: ${result.quartierName} (${result.distance} km)`);

        return result;
    },

    /**
     * Trouve tous les quartiers dans un rayon
     */
    findQuartiersInRadius(lat, lng, radiusKm) {
        if (!Utils.isValidCoordinates(lat, lng)) {
            throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
        }

        const quartiers = DataService.loadAll('QUARTIERS');
        const bounds = Utils.calculateBoundingBox(lat, lng, radiusKm);

        const nearbyQuartiers = quartiers.filter(q =>
            Utils.isPointInBounds(q.centreLatitude, q.centreLongitude, bounds)
        );

        const results = [];

        for (const q of nearbyQuartiers) {
            const distance = Utils.calculateDistance(
                lat, lng,
                q.centreLatitude, q.centreLongitude
            );

            if (distance <= radiusKm) {
                results.push({
                    quartierId: q.id,
                    quartierName: q.nom,
                    distance: Utils.roundTo(distance, 3),
                    quartierLatitude: q.centreLatitude,
                    quartierLongitude: q.centreLongitude,
                    idSecteur: q.idSecteur
                });
            }
        }

        results.sort((a, b) => a.distance - b.distance);

        return results;
    },

    /**
     * Récupère les quartiers par secteur
     */
    getQuartiersBySecteur(idSecteur) {
        return DataService.loadAll('QUARTIERS')
            .filter(q => q.idSecteur == idSecteur);
    },

    /**
     * Récupère les quartiers par ville
     */
    getQuartiersByVille(idVille) {
        const secteurs = DataService.loadAll('SECTEURS')
            .filter(s => s.idVille == idVille);

        const secteurIds = new Set(secteurs.map(s => s.id));

        return DataService.loadAll('QUARTIERS')
            .filter(q => secteurIds.has(q.idSecteur));
    }
};