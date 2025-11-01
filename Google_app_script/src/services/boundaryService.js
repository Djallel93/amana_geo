/**
 * Service d'acquisition de boundaries depuis OpenStreetMap
 */

const BoundaryService = {

    /**
     * Configure les boundaries pour toutes les entités
     */
    setupBoundariesForAll() {
        Logger.info('Début acquisition boundaries');

        const results = {
            villes: this.setupBoundariesForSheet('VILLES'),
            quartiers: this.setupBoundariesForSheet('QUARTIERS')
        };

        Logger.success('Acquisition boundaries terminée', results);
        return results;
    },

    /**
     * Télécharge boundaries pour une feuille
     */
    setupBoundariesForSheet(entityType) {
        const sheet = getSheet(CONFIG.SHEETS[entityType]);
        const data = sheet.getDataRange().getValues();

        if (data.length <= 1) {
            Logger.warn(`${entityType}: aucune donnée`);
            return { success: 0, failed: 0, skipped: 0 };
        }

        const stats = { success: 0, failed: 0, skipped: 0 };
        const columns = CONFIG.COLUMNS[entityType];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const nom = row[columns.NOM];
            const existingPolygon = row[columns.POLYGON];

            if (existingPolygon && existingPolygon.trim().length > 0) {
                Logger.debug(`[${i}/${data.length - 1}] ${nom}: polygon existant, ignoré`);
                stats.skipped++;
                continue;
            }

            Logger.info(`[${i}/${data.length - 1}] Recherche boundary: ${nom}`);

            const context = this.buildGeographicContext(entityType, row);
            const boundary = this.fetchBoundaryFromOSM(nom, context);

            if (boundary) {
                const written = Utils.writePolygonToSheet(
                    sheet,
                    i + 1,
                    columns.POLYGON + 1,
                    boundary
                );

                if (written) {
                    const centroid = Utils.polygonCentroid(boundary);

                    if (centroid.latitude) {
                        sheet.getRange(i + 1, columns.CENTRE_LAT + 1).setValue(centroid.latitude);
                        sheet.getRange(i + 1, columns.CENTRE_LNG + 1).setValue(centroid.longitude);
                    }

                    Logger.success(`${nom}: ${boundary.length} points écrits`);
                    stats.success++;
                } else {
                    stats.failed++;
                }
            } else {
                Logger.warn(`${nom}: aucune boundary trouvée`);
                stats.failed++;
            }

            if (i < data.length - 1) {
                Utilities.sleep(2000); // Rate limiting
            }
        }

        return stats;
    },

    /**
     * Construit le contexte géographique pour la recherche
     */
    buildGeographicContext(entityType, row) {
        const columns = CONFIG.COLUMNS[entityType];

        const context = {
            name: row[columns.NOM],
            lat: row[columns.CENTRE_LAT],
            lng: row[columns.CENTRE_LNG]
        };

        if (entityType === 'VILLES') {
            context.codePostal = row[CONFIG.COLUMNS.VILLES.CODE_POSTAL];
            context.departement = row[CONFIG.COLUMNS.VILLES.DEPARTEMENT];
        } else if (entityType === 'QUARTIERS') {
            const idSecteur = row[columns.ID_SECTEUR];
            const secteur = DataService.findById('SECTEURS', idSecteur);

            if (secteur) {
                const ville = DataService.findById('VILLES', secteur.idVille);

                if (ville) {
                    context.ville = ville.nom;
                    context.codePostal = ville.codePostal;
                }
            }
        }

        return context;
    },

    /**
     * Recherche boundary depuis OSM (multi-stratégie)
     */
    fetchBoundaryFromOSM(name, context) {
        let boundary = this.fetchFromNominatim(name, context);

        if (!boundary) {
            Logger.info('Tentative Overpass API');
            boundary = this.fetchFromOverpass(name, context);
        }

        if (boundary && boundary.length > 100) {
            Logger.info(`Simplification: ${boundary.length} → ~50 points`);
            boundary = this.simplifyPolygon(boundary, 0.0002);
        }

        return boundary;
    },

    /**
     * Méthode 1: Nominatim
     */
    fetchFromNominatim(name, context) {
        try {
            const searchTerms = [name];
            if (context.ville) searchTerms.push(context.ville);
            if (context.codePostal) searchTerms.push(context.codePostal);
            if (context.departement) searchTerms.push(context.departement);
            searchTerms.push('France');

            const query = searchTerms.join(',');

            const url = 'https://nominatim.openstreetmap.org/search?' +
                `q=${encodeURIComponent(query)}&` +
                'format=json&' +
                'polygon_geojson=1&' +
                'limit=5';

            const options = {
                headers: { 'User-Agent': CONFIG.GEO.USER_AGENT }
            };

            const response = UrlFetchApp.fetch(url, options);

            if (response.getResponseCode() !== 200) {
                Logger.warn(`HTTP ${response.getResponseCode()}`);
                return null;
            }

            const results = JSON.parse(response.getContentText());

            for (const result of results) {
                if (result.geojson && result.geojson.type === 'Polygon') {
                    return result.geojson.coordinates[0].map(c => [c[1], c[0]]);
                }

                if (result.geojson && result.geojson.type === 'MultiPolygon') {
                    return result.geojson.coordinates[0][0].map(c => [c[1], c[0]]);
                }
            }

            return null;

        } catch (e) {
            Logger.error(`Erreur Nominatim pour ${name}`, { error: e.message });
            return null;
        }
    },

    /**
     * Méthode 2: Overpass API
     */
    fetchFromOverpass(name, context) {
        try {
            const searchLat = context.lat || 47.2;
            const searchLng = context.lng || -1.5;
            const radius = 5000;

            const query = `
                [out:json][timeout:25];
                (
                way["name"="${name}"]["boundary"](around:${radius},${searchLat},${searchLng});
                relation["name"="${name}"]["boundary"](around:${radius},${searchLat},${searchLng});
                way["name"="${name}"]["place"](around:${radius},${searchLat},${searchLng});
                relation["name"="${name}"]["place"](around:${radius},${searchLat},${searchLng});
                );
                out geom;`;

            const url = 'https://overpass-api.de/api/interpreter';
            const options = {
                method: 'post',
                payload: 'data=' + encodeURIComponent(query),
                muteHttpExceptions: true
            };

            const response = UrlFetchApp.fetch(url, options);
            const data = JSON.parse(response.getContentText());

            if (!data.elements || data.elements.length === 0) {
                return null;
            }

            const element = data.elements[0];
            let coords = [];

            if (element.type === 'way' && element.geometry) {
                coords = element.geometry.map(node => [node.lat, node.lon]);
            } else if (element.type === 'relation' && element.members) {
                const outer = element.members.find(m => m.role === 'outer');
                if (outer && outer.geometry) {
                    coords = outer.geometry.map(node => [node.lat, node.lon]);
                }
            }

            // Fermer le polygon
            if (coords.length > 0) {
                const first = coords[0];
                const last = coords[coords.length - 1];

                if (first[0] !== last[0] || first[1] !== last[1]) {
                    coords.push([first[0], first[1]]);
                }
            }

            return coords.length >= 3 ? coords : null;

        } catch (e) {
            Logger.error(`Erreur Overpass`, { error: e.message });
            return null;
        }
    },

    /**
     * Algorithme Douglas-Peucker pour simplification
     */
    simplifyPolygon(coords, tolerance = 0.0002) {
        if (coords.length < 3) return coords;

        let maxDist = 0;
        let maxIndex = 0;
        const first = coords[0];
        const last = coords[coords.length - 1];

        for (let i = 1; i < coords.length - 1; i++) {
            const dist = this.perpendicularDistance(coords[i], first, last);

            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }

        if (maxDist > tolerance) {
            const left = this.simplifyPolygon(coords.slice(0, maxIndex + 1), tolerance);
            const right = this.simplifyPolygon(coords.slice(maxIndex), tolerance);
            return left.slice(0, -1).concat(right);
        }

        return [first, last];
    },

    /**
     * Distance perpendiculaire point-ligne
     */
    perpendicularDistance(point, lineStart, lineEnd) {
        const [x, y] = point;
        const [x1, y1] = lineStart;
        const [x2, y2] = lineEnd;

        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? dot / lenSq : -1;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }
};