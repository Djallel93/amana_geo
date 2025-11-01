/**
 * Service de géocodage optimisé avec résolution polygonale
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
     * Résolution quartier depuis coordonnées avec polygones
     */
    resolveQuartierFromCoordinates(lat, lng) {
        const quartiers = this.loadQuartiersWithPolygons();

        if (quartiers.length === 0) {
            throw new Error('Aucun quartier en base de données');
        }

        // Étape 1: Chercher dans les polygones
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

        // Étape 2: Recherche par centroïde proche
        Logger.info('Point hors polygons, recherche par centroïde');

        const threshold = CONFIG.GEO.SEUIL_PROXIMITE_M / 1000;
        let nearestCentroid = null;
        let minDistance = Infinity;

        for (const q of quartiers) {
            if (!Utils.isValidCoordinates(q.centreLatitude, q.centreLongitude)) continue;

            const distance = Utils.calculateDistance(
                lat, lng,
                q.centreLatitude, q.centreLongitude
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestCentroid = q;
            }
        }

        // Centroïde dans le seuil
        if (nearestCentroid && minDistance <= threshold) {
            Logger.info(`Résolution: nearest-centroid (${(minDistance * 1000).toFixed(0)}m)`);
            return this.formatQuartierResult(
                nearestCentroid,
                'nearest-centroid-within-threshold',
                `Distance: ${(minDistance * 1000).toFixed(0)}m`
            );
        }

        // Étape 3: Fallback secteur
        if (nearestCentroid) {
            Logger.warn(`Distance trop grande (${(minDistance * 1000).toFixed(0)}m), fallback secteur`);

            const fallback = this.findFallbackSecteur(lat, lng, nearestCentroid);

            if (fallback) {
                return this.formatQuartierResult(
                    fallback,
                    'fallback-to-secteur-centroid',
                    `Secteur: ${fallback.secteurNom}`
                );
            }
        }

        throw new Error(`Aucun quartier trouvé (distance minimale: ${(minDistance * 1000).toFixed(0)}m)`);
    },

    /**
     * Fallback: utiliser le centroïde du secteur
     */
    findFallbackSecteur(lat, lng, nearestQuartier) {
        const secteur = DataService.findById('SECTEURS', nearestQuartier.idSecteur);

        if (!secteur) return null;

        if (Utils.isValidCoordinates(secteur.centreLatitude, secteur.centreLongitude)) {
            return {
                ...nearestQuartier,
                centreLatitude: secteur.centreLatitude,
                centreLongitude: secteur.centreLongitude,
                secteurNom: secteur.nom
            };
        }

        // Fallback niveau 2: moyenne des quartiers du secteur
        const quartiers = DataService.loadAll('QUARTIERS')
            .filter(q => q.idSecteur === nearestQuartier.idSecteur);

        if (quartiers.length > 0) {
            const avgLat = quartiers.reduce((sum, q) => sum + (q.centreLatitude || 0), 0) / quartiers.length;
            const avgLng = quartiers.reduce((sum, q) => sum + (q.centreLongitude || 0), 0) / quartiers.length;

            return {
                ...nearestQuartier,
                centreLatitude: avgLat,
                centreLongitude: avgLng,
                secteurNom: secteur.nom
            };
        }

        return null;
    },

    /**
     * Charge tous les quartiers avec polygones
     */
    loadQuartiersWithPolygons() {
        const sheet = getSheet(CONFIG.SHEETS.QUARTIERS);
        const data = sheet.getDataRange().getValues();

        if (data.length <= 1) return [];

        const columns = CONFIG.COLUMNS.QUARTIERS;
        const quartiers = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            const quartier = {
                id: row[columns.ID],
                nom: row[columns.NOM],
                centreLatitude: parseFloat(row[columns.CENTRE_LAT]),
                centreLongitude: parseFloat(row[columns.CENTRE_LNG]),
                idSecteur: row[columns.ID_SECTEUR],
                polygon: Utils.parseGeoJSONPolygon(row[columns.POLYGON])
            };

            if (isNaN(quartier.centreLatitude)) quartier.centreLatitude = null;
            if (isNaN(quartier.centreLongitude)) quartier.centreLongitude = null;

            quartiers.push(quartier);
        }

        return quartiers;
    },

    /**
     * Formate le résultat final
     */
    formatQuartierResult(quartier, method, details = null) {
        return {
            success: true,
            quartierId: quartier.id,
            quartierNom: quartier.nom,
            centreLat: quartier.centreLatitude,
            centreLng: quartier.centreLongitude,
            idSecteur: quartier.idSecteur,
            resolutionMethod: method,
            resolutionDetails: details,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Géocode un quartier et met à jour ses coordonnées
     */
    geocodeQuartier(quartierId) {
        const quartier = DataService.findById('QUARTIERS', quartierId);

        if (!quartier) {
            throw new Error(`Quartier ${quartierId} introuvable`);
        }

        const secteur = DataService.findById('SECTEURS', quartier.idSecteur);
        if (!secteur) {
            throw new Error('Secteur introuvable');
        }

        const ville = DataService.findById('VILLES', secteur.idVille);
        if (!ville) {
            throw new Error('Ville introuvable');
        }

        const searchAddress = `${quartier.nom}, ${ville.nom}, ${ville.codePostal}, France`;
        Logger.info(`Géocodage: ${searchAddress}`);

        const result = this.geocodeAddress(searchAddress);

        if (!result.isValid) {
            return {
                success: false,
                quartierId,
                quartierNom: quartier.nom,
                error: result.error
            };
        }

        // Mettre à jour les coordonnées
        DataService.update('QUARTIERS', quartierId, {
            centreLatitude: result.coordinates.latitude,
            centreLongitude: result.coordinates.longitude
        });

        Logger.success(`Quartier ${quartierId} géocodé`);

        return {
            success: true,
            quartierId,
            quartierNom: quartier.nom,
            coordinates: result.coordinates,
            formattedAddress: result.formattedAddress
        };
    },

    /**
     * Géocode tous les quartiers d'une ville
     */
    geocodeQuartiersOfVille(villeId, options = {}) {
        const {
            skipExisting = true,
            batchSize = 10,
            pauseMs = 1000
        } = options;

        const secteurs = DataService.loadAll('SECTEURS')
            .filter(s => s.idVille == villeId);

        const secteurIds = secteurs.map(s => s.id);

        let quartiers = DataService.loadAll('QUARTIERS', false)
            .filter(q => secteurIds.includes(q.idSecteur));

        if (skipExisting) {
            quartiers = quartiers.filter(q =>
                !Utils.isValidCoordinates(q.centreLatitude, q.centreLongitude)
            );
        }

        Logger.info(`Géocodage: ${quartiers.length} quartiers`);

        const results = {
            total: quartiers.length,
            success: 0,
            failed: 0,
            details: []
        };

        quartiers.forEach((q, index) => {
            if (index > 0 && index % batchSize === 0) {
                Logger.info(`Pause après ${index} géocodages`);
                Utilities.sleep(2000);
            }

            try {
                const result = this.geocodeQuartier(q.id);

                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                }

                results.details.push(result);

                if (index < quartiers.length - 1) {
                    Utilities.sleep(pauseMs);
                }

            } catch (e) {
                results.failed++;
                results.details.push({
                    success: false,
                    quartierId: q.id,
                    quartierNom: q.nom,
                    error: e.message
                });
            }
        });

        Logger.success(`Géocodage terminé: ${results.success} succès, ${results.failed} échecs`);
        return results;
    }
};