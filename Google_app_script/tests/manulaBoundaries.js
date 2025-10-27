/**
 * 🔧 FONCTION MANUELLE: Importer une boundary depuis JSON
 * 
 * Utilisation:
 * 1. Testez votre requête dans Postman et copiez la réponse JSON
 * 2. Appelez cette fonction avec l'ID de l'entité et le JSON
 * 3. La fonction extraira le polygon et le sauvegardera
 * 
 * @param {string} entityType - Type: 'villes', 'secteurs', ou 'quartiers'
 * @param {string} entityId - ID de l'entité (ex: 'VILLE_001')
 * @param {string} jsonResponse - Réponse JSON de Nominatim/Overpass
 */
function manuallySetBoundary(entityType, entityId, jsonResponse) {
    Logger.log(`🔧 Import manuel boundary pour ${entityType}/${entityId}`);

    // Valider le type d'entité
    const validTypes = ['villes', 'secteurs', 'quartiers'];
    if (!validTypes.includes(entityType)) {
        throw new Error(`Type invalide. Utilisez: ${validTypes.join(', ')}`);
    }

    // Parser le JSON
    let data;
    try {
        data = typeof jsonResponse === 'string' ? JSON.parse(jsonResponse) : jsonResponse;
    } catch (e) {
        throw new Error(`JSON invalide: ${e.message}`);
    }

    // Extraire le polygon
    const polygon = extractPolygonFromResponse(data);

    if (!polygon || polygon.length < 3) {
        throw new Error('Aucun polygon valide trouvé dans la réponse');
    }

    Logger.log(`✅ Polygon extrait: ${polygon.length} points`);

    // Simplifier si nécessaire
    let finalPolygon = polygon;
    if (polygon.length > 100) {
        Logger.log(`🔧 Simplification: ${polygon.length} → ~50 points`);
        finalPolygon = simplifyPolygon(polygon, 0.0002);
    }

    // Sauvegarder dans le sheet
    const success = saveBoundaryToSheet(entityType, entityId, finalPolygon);

    if (success) {
        // Calculer et mettre à jour le centroïde
        const centroid = polygonCentroid(finalPolygon);
        if (centroid.latitude) {
            updateCentroid(entityType, entityId, centroid);
            Logger.log(`✅ Centroïde mis à jour: ${centroid.latitude}, ${centroid.longitude}`);
        }

        Logger.log(`✅ Boundary importée avec succès pour ${entityType}/${entityId}`);
        return {
            success: true,
            entityType,
            entityId,
            polygonPoints: finalPolygon.length,
            centroid
        };
    }

    throw new Error('Échec de la sauvegarde');
}

/**
 * 🔍 Extrait un polygon depuis une réponse API (Nominatim ou Overpass)
 */
function extractPolygonFromResponse(data) {
    // CAS 1: Réponse Nominatim (array)
    if (Array.isArray(data) && data.length > 0) {
        const result = data[0];

        if (result.geojson) {
            if (result.geojson.type === 'Polygon') {
                return result.geojson.coordinates[0].map(c => [c[1], c[0]]);
            }

            if (result.geojson.type === 'MultiPolygon') {
                return result.geojson.coordinates[0][0].map(c => [c[1], c[0]]);
            }
        }
    }

    // CAS 2: Réponse Overpass (elements)
    if (data.elements && Array.isArray(data.elements) && data.elements.length > 0) {
        const element = data.elements[0];

        if (element.type === 'way' && element.geometry) {
            const coords = element.geometry.map(node => [node.lat, node.lon]);

            // Fermer le polygon si nécessaire
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                coords.push([first[0], first[1]]);
            }

            return coords;
        }

        if (element.type === 'relation' && element.members) {
            const outer = element.members.find(m => m.role === 'outer');
            if (outer && outer.geometry) {
                const coords = outer.geometry.map(node => [node.lat, node.lon]);

                // Fermer le polygon
                const first = coords[0];
                const last = coords[coords.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                    coords.push([first[0], first[1]]);
                }

                return coords;
            }
        }
    }

    // CAS 3: GeoJSON direct
    if (data.type === 'Polygon' && data.coordinates) {
        return data.coordinates[0].map(c => [c[1], c[0]]);
    }

    if (data.type === 'MultiPolygon' && data.coordinates) {
        return data.coordinates[0][0].map(c => [c[1], c[0]]);
    }

    return null;
}

/**
 * 💾 Sauvegarde la boundary dans le sheet
 */
function saveBoundaryToSheet(entityType, entityId, polygon) {
    const sheet = getSheet(CONFIG.SHEETS[entityType.toUpperCase()]);
    const data = sheet.getDataRange().getValues();

    // Trouver la ligne de l'entité
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == entityId) { // Colonne ID
            rowIndex = i;
            break;
        }
    }

    if (rowIndex === -1) {
        throw new Error(`Entité ${entityId} introuvable dans ${entityType}`);
    }

    // Déterminer la colonne du polygon
    const columnMapping = {
        'villes': CONFIG.COLUMNS.VILLES.POLYGON,
        'secteurs': CONFIG.COLUMNS.SECTEURS.POLYGON,
        'quartiers': CONFIG.COLUMNS.QUARTIERS.POLYGON
    };

    const polygonCol = columnMapping[entityType] + 1; // +1 car getRange est 1-indexed

    // Écrire le polygon
    return writePolygonToSheet(sheet, rowIndex + 1, polygonCol, polygon);
}

/**
 * 🎯 Met à jour le centroïde
 */
function updateCentroid(entityType, entityId, centroid) {
    const sheet = getSheet(CONFIG.SHEETS[entityType.toUpperCase()]);
    const data = sheet.getDataRange().getValues();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == entityId) {
            rowIndex = i;
            break;
        }
    }

    if (rowIndex === -1) {
        Logger.log(`⚠️ ID ${entityId} introuvable dans ${entityType}`);
        return false;
    }

    // Les colonnes sont identiques pour les 3 types d'entités
    const latCol = 3; // centre_latitude (index 2, donc colonne 3 en 1-based)
    const lngCol = 4; // centre_longitude (index 3, donc colonne 4 en 1-based)

    Logger.log(`📍 Mise à jour centroïde ligne ${rowIndex + 1}: ${centroid.latitude}, ${centroid.longitude}`);

    sheet.getRange(rowIndex + 1, latCol).setValue(centroid.latitude);
    sheet.getRange(rowIndex + 1, lngCol).setValue(centroid.longitude);

    Logger.log(`✅ Centroïde sauvegardé`);
    return true;
}

/**
 * 📋 BATCH: Importer plusieurs boundaries à la fois
 * 
 * @param {Array} boundaries - Array d'objets: [{type, id, json}, ...]
 */
function batchImportBoundaries(boundaries) {
    Logger.log(`📦 Import en batch: ${boundaries.length} boundaries`);

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    boundaries.forEach((item, index) => {
        Logger.log(`\n[${index + 1}/${boundaries.length}] Import ${item.type}/${item.id}`);

        try {
            manuallySetBoundary(item.type, item.id, item.json);
            results.success++;
        } catch (e) {
            Logger.log(`❌ Erreur: ${e.message}`);
            results.failed++;
            results.errors.push({
                type: item.type,
                id: item.id,
                error: e.message
            });
        }
    });

    Logger.log(`\n✅ Terminé: ${results.success} succès, ${results.failed} échecs`);
    return results;
}

/**
 * 📝 EXEMPLE D'UTILISATION
 * 
 * Copiez cette fonction et modifiez-la avec vos données
 */
function EXEMPLE_importerMesBoundaries() {
    // EXEMPLE 1: Import simple d'une ville
    const nantesJson = `{
    "type": "Polygon",
    "coordinates": [
      [
        [-1.5536, 47.2173],
        [-1.5600, 47.2200],
        [-1.5500, 47.2250],
        [-1.5536, 47.2173]
      ]
    ]
  }`;

    try {
        const result = manuallySetBoundary('villes', 'VILLE_001', nantesJson);
        Logger.log('✅ Succès:', result);
    } catch (e) {
        Logger.log('❌ Erreur:', e.message);
    }

    // EXEMPLE 2: Import en batch
    const boundaries = [
        {
            type: 'villes',
            id: 'VILLE_001',
            json: nantesJson
        },
        {
            type: 'secteurs',
            id: 'SECTEUR_001',
            json: `{"type":"Polygon","coordinates":[[...]]}`
        }
    ];

    // batchImportBoundaries(boundaries);
}

/**
 * 🔍 Helper: Afficher les IDs d'une feuille
 * Utile pour savoir quel ID utiliser
 */
function listerIDsDisponibles(entityType) {
    const sheet = getSheet(CONFIG.SHEETS[entityType.toUpperCase()]);
    const data = sheet.getDataRange().getValues();

    Logger.log(`\n📋 IDs disponibles pour ${entityType}:`);
    Logger.log('━'.repeat(50));

    for (let i = 1; i < data.length; i++) {
        const id = data[i][0];
        const nom = data[i][1];
        const hasPolygon = data[i][4] ? '✅' : '❌';

        Logger.log(`${hasPolygon} ID: ${id} | Nom: ${nom}`);
    }

    Logger.log('━'.repeat(50));
    Logger.log(`Total: ${data.length - 1} entités\n`);
}


function importerMaVille() {
    const jsonDePostman = ``;

    manuallySetBoundary('villes', 17, jsonDePostman);
}