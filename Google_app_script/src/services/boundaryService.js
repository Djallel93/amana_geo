// ============================================================================
// FICHIER: boundaryService.js
// Description: Acquisition de polygones depuis OpenStreetMap (Nominatim + Overpass)
// ============================================================================

/**
 * 🌍 Service d'acquisition de boundaries depuis OSM
 * Endpoints utilisés:
 * - Nominatim: https://nominatim.openstreetmap.org (recherche + géométrie)
 * - Overpass API: https://overpass-api.de/api/interpreter (données détaillées)
 * 
 * ⚠️ Rate limiting: 1 req/sec Nominatim, 2 sec pause entre batches Overpass
 */

/**
 * 🔄 Fonction principale: télécharge boundaries pour toutes les entités
 */
function setupBoundariesForAll() {
    Logger.log('🚀 Début acquisition boundaries...');

    const results = {
        villes: setupBoundariesForSheet(CONFIG.SHEETS.VILLES),
        // secteurs: setupBoundariesForSheet(CONFIG.SHEETS.SECTEURS),
        quartiers: setupBoundariesForSheet(CONFIG.SHEETS.QUARTIERS)
    };

    Logger.log(`✅ Terminé: ${JSON.stringify(results)}`);
    return results;
}

/**
 * 📋 Télécharge boundaries pour une feuille donnée
 */
function setupBoundariesForSheet(sheetName) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
        Logger.log(`⚠️ ${sheetName}: aucune donnée`);
        return { success: 0, failed: 0, skipped: 0 };
    }

    const stats = { success: 0, failed: 0, skipped: 0 };
    const headers = data[0];
    const polygonColIndex = headers.indexOf('polygon_frontiere');

    if (polygonColIndex === -1) {
        throw new Error(`❌ Colonne "polygon_frontiere" introuvable dans ${sheetName}`);
    }

    // Traiter chaque ligne
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const nom = row[CONFIG.COLUMNS[sheetName.toUpperCase()].NOM];
        const existingPolygon = row[polygonColIndex];

        // Skip si déjà un polygone
        if (existingPolygon && existingPolygon.trim().length > 0) {
            Logger.log(`⏭️ [${i}/${data.length - 1}] ${nom}: polygon déjà présent, ignoré`);
            stats.skipped++;
            continue;
        }

        Logger.log(`🔍 [${i}/${data.length - 1}] Recherche boundary: ${nom}`);

        // Construire contexte géographique pour meilleure recherche
        const context = buildGeographicContext(sheetName, row);
        const boundary = fetchBoundaryFromOSM(nom, context);

        if (boundary) {
            const written = writePolygonToSheet(sheet, i + 1, polygonColIndex + 1, boundary);

            if (written) {
                // Mettre à jour centroïde aussi
                const centroid = polygonCentroid(boundary);
                if (centroid.latitude) {
                    sheet.getRange(i + 1, CONFIG.COLUMNS[sheetName.toUpperCase()].CENTRE_LAT + 1)
                        .setValue(centroid.latitude);
                    sheet.getRange(i + 1, CONFIG.COLUMNS[sheetName.toUpperCase()].CENTRE_LNG + 1)
                        .setValue(centroid.longitude);
                }

                Logger.log(`✅ ${nom}: ${boundary.length} points écrits`);
                stats.success++;
            } else {
                stats.failed++;
            }
        } else {
            Logger.log(`⚠️ ${nom}: aucune boundary trouvée`);
            stats.failed++;
        }

        // Rate limiting: 2 sec entre requêtes
        if (i < data.length - 1) {
            Utilities.sleep(2000);
        }
    }

    return stats;
}

/**
 * 🏙️ Construit le contexte géographique pour recherche OSM
 */
function buildGeographicContext(sheetName, row) {
    const context = {
        name: row[CONFIG.COLUMNS[sheetName.toUpperCase()].NOM],
        lat: row[CONFIG.COLUMNS[sheetName.toUpperCase()].CENTRE_LAT],
        lng: row[CONFIG.COLUMNS[sheetName.toUpperCase()].CENTRE_LNG]
    };

    // Ajouter ville/département selon le type
    if (sheetName === CONFIG.SHEETS.VILLES) {
        context.codePostal = row[CONFIG.COLUMNS.VILLES.CODE_POSTAL];
        context.departement = row[CONFIG.COLUMNS.VILLES.DEPARTEMENT];
    } else if (sheetName === CONFIG.SHEETS.SECTEURS) {
        const idVille = row[CONFIG.COLUMNS.SECTEURS.ID_VILLE];
        const ville = getVilleById(idVille);
        if (ville) {
            context.ville = ville.nom;
            context.codePostal = ville.codePostal;
        }
    } else if (sheetName === CONFIG.SHEETS.QUARTIERS) {
        const idSecteur = row[CONFIG.COLUMNS.QUARTIERS.ID_SECTEUR];
        const secteur = getSecteurById(idSecteur);
        if (secteur) {
            const ville = getVilleById(secteur.idVille);
            if (ville) {
                context.ville = ville.nom;
                context.codePostal = ville.codePostal;
            }
        }
    }

    return context;
}

/**
 * 🌍 Recherche boundary depuis OSM (stratégie multi-méthodes)
 */
function fetchBoundaryFromOSM(name, context) {
    // Méthode 1: Nominatim search avec polygon
    let boundary = fetchFromNominatim(name, context);

    if (!boundary) {
        // Méthode 2: Overpass API (plus précis)
        Logger.log('  ↪️ Tentative Overpass API...');
        boundary = fetchFromOverpass(name, context);
    }

    // Simplifier si trop de points (>100)
    if (boundary && boundary.length > 100) {
        Logger.log(`  🔧 Simplification: ${boundary.length} → ~50 points`);
        boundary = simplifyPolygon(boundary, 0.0002);
    }

    return boundary;
}

/**
 * 📍 Méthode 1: Nominatim (meilleur pour zones nommées)
 */
function fetchFromNominatim(name, context) {
    try {
        // Add delay to respect rate limiting (1 req/sec)

        // Construire query avec contexte
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
            headers: {
                'User-Agent': CONFIG.GEO.USER_AGENT
            }
            // muteHttpExceptions: true,
            // validateHttpsCertificates: true
        };

        Logger.log(`Fetching: ${url}`);
        const response = UrlFetchApp.fetch(url, options);

        // Check response code
        const responseCode = response.getResponseCode();
        if (responseCode !== 200) {
            Logger.log(`  ⚠️ HTTP ${responseCode}: ${response.getContentText()}`);
            return null;
        }

        const results = JSON.parse(response.getContentText());

        // Trouver meilleur résultat avec polygon
        for (const result of results) {
            if (result.geojson && result.geojson.type === 'Polygon') {
                const coords = result.geojson.coordinates[0];
                return coords.map(c => [c[1], c[0]]);
            }

            if (result.geojson && result.geojson.type === 'MultiPolygon') {
                const coords = result.geojson.coordinates[0][0];
                return coords.map(c => [c[1], c[0]]);
            }
        }

        return null;

    } catch (e) {
        Logger.log(`  ❌ Nominatim error for ${name}: ${e.message}`);
        return null;
    }
}
/**
 * 🔍 Méthode 2: Overpass API (données OSM brutes)
 */
function fetchFromOverpass(name, context) {
    try {
        const searchLat = context.lat || 47.2;
        const searchLng = context.lng || -1.5;
        const radius = 5000; // 5km radius

        // Query Overpass: rechercher boundaries ou places avec ce nom
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

        // Extraire géométrie du premier élément
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

        // Assurer polygon fermé
        if (coords.length > 0) {
            const first = coords[0];
            const last = coords[coords.length - 1];

            if (first[0] !== last[0] || first[1] !== last[1]) {
                coords.push([first[0], first[1]]);
            }
        }

        return coords.length >= 3 ? coords : null;

    } catch (e) {
        Logger.log(`  ❌ Overpass error: ${e.message}`);
        return null;
    }
}

/**
 * 🔧 Algorithme Douglas-Peucker pour simplification de polygones
 * Source: https://en.wikipedia.org/wiki/Ramer–Douglas–Peucker_algorithm
 */
function simplifyPolygon(coords, tolerance = 0.0002) {
    if (coords.length < 3) return coords;

    let maxDist = 0;
    let maxIndex = 0;
    const first = coords[0];
    const last = coords[coords.length - 1];

    // Trouver point le plus éloigné de la ligne first-last
    for (let i = 1; i < coords.length - 1; i++) {
        const dist = perpendicularDistance(coords[i], first, last);
        if (dist > maxDist) {
            maxDist = dist;
            maxIndex = i;
        }
    }

    // Récursion si écart significatif
    if (maxDist > tolerance) {
        const left = simplifyPolygon(coords.slice(0, maxIndex + 1), tolerance);
        const right = simplifyPolygon(coords.slice(maxIndex), tolerance);
        return left.slice(0, -1).concat(right);
    }

    return [first, last];
}

/**
 * 📏 Distance perpendiculaire point-ligne
 */
function perpendicularDistance(point, lineStart, lineEnd) {
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

/**
 * 🎯 UI: Lancer acquisition boundaries
 */
function setupBoundariesUI() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '🌍 Télécharger boundaries OSM',
        'Cette opération va télécharger les frontières géographiques depuis OpenStreetMap.\n\n' +
        '⚠️ Durée estimée: 2-5 min par feuille\n' +
        '📡 Rate limiting: 2 sec entre requêtes\n\n' +
        'Continuer?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        try {
            const results = setupBoundariesForAll();

            ui.alert(
                '✅ Acquisition terminée',
                `Villes: ${results.villes.success} réussies, ${results.villes.failed} échouées\n` +
                `Secteurs: ${results.secteurs.success} réussies, ${results.secteurs.failed} échouées\n` +
                `Quartiers: ${results.quartiers.success} réussies, ${results.quartiers.failed} échouées`,
                ui.ButtonSet.OK
            );
        } catch (e) {
            ui.alert('❌ Erreur', e.message, ui.ButtonSet.OK);
        }
    }
}