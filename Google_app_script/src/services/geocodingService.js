/**
 * Service de géocodage - Résolution optimisée avec hiérarchie Ville > Secteur > Quartier
 * Version sans cache - Suffisant pour usage modéré
 */

const GeocodingService = {

    /**
     * Géocode une adresse composée
     */
    geocodeAddress(adresse, ville = null, codePostal = null, pays = null) {
        // Construire l'adresse complète
        const parts = [adresse, ville, codePostal, pays || CONFIG.GEO.PAYS_DEFAUT].filter(p => p);
        const fullAddress = parts.join(', ');

        Logger.debug(`Géocodage: ${fullAddress}`);

        try {
            const geocoder = Maps.newGeocoder();
            geocoder.setRegion(pays || 'fr');
            geocoder.setLanguage('fr');

            const response = geocoder.geocode(fullAddress);

            if (!response.results || response.results.length === 0) {
                return {
                    isValid: false,
                    exists: false,
                    error: 'Adresse introuvable'
                };
            }

            const result = response.results[0];
            const location = result.geometry.location;

            return {
                isValid: true,
                exists: true,
                coordinates: {
                    latitude: location.lat,
                    longitude: location.lng
                },
                formattedAddress: result.formatted_address,
                locationType: result.geometry.location_type
            };

        } catch (e) {
            Logger.error(`Erreur géocodage: ${e.message}`, { adresse, ville, codePostal });
            return { isValid: false, exists: false, error: e.message };
        }
    },

    /**
     * Géocodage inversé (coordonnées → adresse)
     */
    reverseGeocode(lat, lng) {
        if (!Utils.isValidCoordinates(lat, lng)) {
            return { isValid: false, exists: false, error: CONFIG.ERRORS.INVALID_COORDINATES };
        }

        Logger.debug(`Géocodage inversé: [${lat}, ${lng}]`);

        try {
            const geocoder = Maps.newGeocoder();
            const response = geocoder.reverseGeocode(lat, lng);

            if (!response.results || response.results.length === 0) {
                return { isValid: false, exists: false, error: 'Aucune adresse trouvée' };
            }

            return {
                isValid: true,
                exists: true,
                address: response.results[0].formatted_address,
                coordinates: { latitude: lat, longitude: lng }
            };

        } catch (e) {
            Logger.error(`Erreur géocodage inversé: ${e.message}`, { lat, lng });
            return { isValid: false, exists: false, error: e.message };
        }
    },

    /**
     * Résolution optimisée avec hiérarchie Ville > Secteur > Quartier
     * Secteur est déduit du quartier (pas de polygone pour secteur)
     */
    resolveLocation(lat, lng) {
        Logger.info(`🎯 Résolution hiérarchique pour [${lat}, ${lng}]`);

        const hierarchy = DataService.loadHierarchy();

        // ÉTAPE 1: Trouver la ville
        Logger.info(`📍 Recherche ville parmi ${hierarchy.villes.length} villes`);
        const ville = this._findInPolygons(lat, lng, hierarchy.villes);

        if (!ville) {
            throw new Error('Aucune ville trouvée pour ces coordonnées');
        }

        Logger.success(`✅ Ville trouvée: ${ville.nom}`);

        // ÉTAPE 2: Filtrer quartiers de cette ville uniquement
        const quartiersInVille = hierarchy.quartiers.filter(q => q.idVille === ville.id);
        Logger.info(`📍 Recherche quartier parmi ${quartiersInVille.length} quartiers (ville ${ville.nom})`);

        const quartier = this._findInPolygons(lat, lng, quartiersInVille);

        if (!quartier) {
            throw new Error(`Aucun quartier trouvé dans ${ville.nom}`);
        }

        Logger.success(`✅ Quartier trouvé: ${quartier.nom}`);

        // ÉTAPE 3: Le secteur est déduit du quartier (pas de test de polygone)
        const secteur = hierarchy.secteurMap[quartier.idSecteur];

        if (!secteur) {
            Logger.warn(`⚠️ Secteur ${quartier.idSecteur} non trouvé pour quartier ${quartier.nom}`);
            throw new Error(`Secteur associé au quartier introuvable`);
        }

        Logger.success(`✅ Secteur déduit: ${secteur.nom}`);

        return {
            success: true,
            exists: true,
            ville: {
                id: ville.id,
                nom: ville.nom,
                codePostal: ville.codePostal,
                departement: ville.departement
            },
            secteur: {
                id: secteur.id,
                nom: secteur.nom
            },
            quartier: {
                id: quartier.id,
                nom: quartier.nom
            },
            coordinates: {
                latitude: lat,
                longitude: lng
            },
            resolutionMethod: 'hierarchical-polygon-ville-quartier',
            resolutionDetails: 'Secteur déduit du quartier (logique uniquement)',
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Trouve l'entité la plus petite contenant le point
     */
    _findInPolygons(lat, lng, entities) {
        const matches = [];

        for (const entity of entities) {
            if (entity.polygon && Utils.isPointInPolygon(lat, lng, entity.polygon)) {
                const area = Utils.polygonArea(entity.polygon);
                matches.push({ entity, area });
            }
        }

        if (matches.length === 0) return null;
        if (matches.length === 1) return matches[0].entity;

        // Plusieurs matchs: retourner le plus petit
        matches.sort((a, b) => a.area - b.area);
        Logger.debug(`Multiple matches found, selecting smallest (${matches.length} candidates)`);
        return matches[0].entity;
    },

    /**
     * Valide si un quartier existe
     */
    validateQuartier(quartierId) {
        const quartier = DataService.findById('QUARTIERS', quartierId);
        return {
            exists: !!quartier,
            quartier: quartier ? DataService.stripPolygons(quartier) : null
        };
    },

    /**
     * Valide si un secteur existe
     */
    validateSecteur(secteurId) {
        const secteur = DataService.findById('SECTEURS', secteurId);
        return {
            exists: !!secteur,
            secteur: secteur ? DataService.stripPolygons(secteur) : null
        };
    },

    /**
     * Valide si une ville existe
     */
    validateVille(villeId) {
        const ville = DataService.findById('VILLES', villeId);
        return {
            exists: !!ville,
            ville: ville ? DataService.stripPolygons(ville) : null
        };
    }
};