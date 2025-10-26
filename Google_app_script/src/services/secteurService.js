/**
 * Récupère tous les secteurs
 * @returns {Array<Object>} Liste des secteurs
 */
function getAllSecteurs() {
    const sheet = getSheet(CONFIG.SHEETS.SECTEUR);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
        return [];
    }

    const secteurs = data.slice(1).map(row => ({
        id: row[CONFIG.COLUMNS.SECTEUR.ID],
        nom: row[CONFIG.COLUMNS.SECTEUR.NOM],
        centreLatitude: row[CONFIG.COLUMNS.VILLE.CENTRE_LAT] || null,
        centreLongitude: row[CONFIG.COLUMNS.VILLE.CENTRE_LNG] || null,
        polygonFrontiere: row[CONFIG.COLUMNS.VILLE.POLYGON] || null,
        idVille: row[CONFIG.COLUMNS.SECTEUR.ID_VILLE]
    })).filter(s => s.id);

    console.log(`📍 ${secteurs.length} secteurs chargés`);

    return secteurs;
}

/**
 * Récupère un secteur par son ID
 * @param {number|string} id - ID du secteur
 * @returns {Object|null} Secteur ou null
 */
function getSecteurById(id) {
    const secteurs = getAllSecteurs();
    return secteurs.find(s => s.id == id) || null;
}

/**
 * Récupère tous les secteurs d'une ville
 * @param {number|string} idVille - ID de la ville
 * @returns {Array<Object>} Secteurs de la ville
 */
function getSecteursByVille(idVille) {
    const secteurs = getAllSecteurs();
    return secteurs.filter(s => s.idVille == idVille);
}

/**
 * Crée un nouveau secteur
 * @param {Object} secteur - {nom, latitude, longitude, idVille}
 * @returns {Object} Secteur créé avec ID
 */
function createSecteur(secteur) {
    if (!secteur.nom || !secteur.idVille) {
        throw new Error(CONFIG.ERRORS.MISSING_PARAMETERS);
    }

    const lat = secteur.latitude || null;
    const lng = secteur.longitude || null;

    if (lat && lng && !isValidCoordinates(lat, lng)) {
        throw new Error(CONFIG.ERRORS.INVALID_COORDINATES);
    }

    const sheet = getSheet(CONFIG.SHEETS.SECTEUR);
    const lastRow = sheet.getLastRow();

    const newId = lastRow;

    sheet.appendRow([
        newId,
        secteur.nom,
        lat || '',
        lng || '',
        secteur.idVille
    ]);

    console.log(`✅ Secteur créé: ${secteur.nom} (ID: ${newId})`);

    return {
        id: newId,
        ...secteur,
        latitude: lat,
        longitude: lng
    };
}

/**
 * Met à jour un secteur
 * @param {number|string} id - ID du secteur
 * @param {Object} updates - Champs à mettre à jour
 * @returns {boolean} True si succès
 */
function updateSecteur(id, updates) {
    const sheet = getSheet(CONFIG.SHEETS.SECTEUR);
    const data = sheet.getDataRange().getValues();

    const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.SECTEUR.ID] == id);

    if (rowIndex === -1 || rowIndex === 0) {
        throw new Error('Secteur introuvable');
    }

    const actualRow = rowIndex + 1;

    if (updates.nom) {
        sheet.getRange(actualRow, CONFIG.COLUMNS.SECTEUR.NOM + 1).setValue(updates.nom);
    }
    if (updates.latitude !== undefined) {
        sheet.getRange(actualRow, CONFIG.COLUMNS.SECTEUR.LATITUDE + 1).setValue(updates.latitude);
    }
    if (updates.longitude !== undefined) {
        sheet.getRange(actualRow, CONFIG.COLUMNS.SECTEUR.LONGITUDE + 1).setValue(updates.longitude);
    }
    if (updates.idVille) {
        sheet.getRange(actualRow, CONFIG.COLUMNS.SECTEUR.ID_VILLE + 1).setValue(updates.idVille);
    }

    console.log(`✅ Secteur ${id} mis à jour`);

    return true;
}

/**
 * Supprime un secteur
 * @param {number|string} id - ID du secteur
 * @returns {boolean} True si succès
 */
function deleteSecteur(id) {
    const sheet = getSheet(CONFIG.SHEETS.SECTEUR);
    const data = sheet.getDataRange().getValues();

    const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.SECTEUR.ID] == id);

    if (rowIndex === -1 || rowIndex === 0) {
        throw new Error('Secteur introuvable');
    }

    sheet.deleteRow(rowIndex + 1);

    console.log(`✅ Secteur ${id} supprimé`);

    return true;
}

/**
 * Calcule le centroïde d'un secteur à partir de ses quartiers
 * @param {number|string} id - ID du secteur
 * @returns {Object} Coordonnées du centroïde
 */
function calculateSecteurCentroid(id) {
    const quartiers = getQuartiersBySecteur(id);

    if (quartiers.length === 0) {
        throw new Error('Aucun quartier trouvé pour ce secteur');
    }

    const coordinates = quartiers.map(q => ({
        latitude: q.latitude,
        longitude: q.longitude
    }));

    const centroid = calculateCentroid(coordinates);

    updateSecteur(id, {
        latitude: centroid.latitude,
        longitude: centroid.longitude
    });

    console.log(`✅ Centroïde secteur ${id} calculé: ${centroid.latitude}, ${centroid.longitude}`);

    return {
        secteurId: id,
        ...centroid,
        quartiersCount: quartiers.length
    };
}