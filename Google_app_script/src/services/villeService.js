/**
 * Service de gestion des villes et secteurs
 * CRUD + recherche + géocodage
 */

// ========== VILLE ==========

/**
 * Récupère toutes les villes
 * @returns {Array<Object>} Liste des villes
 */
function getAllVilles() {
  const sheet = getSheet(CONFIG.SHEETS.VILLE);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const villes = data.slice(1).map(row => ({
    id: row[CONFIG.COLUMNS.VILLE.ID],
    nom: row[CONFIG.COLUMNS.VILLE.NOM],
    codePostal: row[CONFIG.COLUMNS.VILLE.CODE_POSTAL],
    departement: row[CONFIG.COLUMNS.VILLE.DEPARTEMENT],
    pays: row[CONFIG.COLUMNS.VILLE.PAYS]
  })).filter(v => v.id);

  console.log(`🏙️ ${villes.length} villes chargées`);

  return villes;
}

/**
 * Récupère une ville par son ID
 * @param {number} id - ID de la ville
 * @returns {Object|null} Ville ou null
 */
function getVilleById(id) {
  const villes = getAllVilles();
  return villes.find(v => v.id == id) || null;
}

/**
 * Recherche des villes par code postal
 * @param {string} codePostal - Code postal
 * @returns {Array<Object>} Villes trouvées
 */
function getVillesByCodePostal(codePostal) {
  const villes = getAllVilles();
  return villes.filter(v => v.codePostal === codePostal);
}

/**
 * Recherche des villes par nom (partiel)
 * @param {string} nom - Nom de la ville (peut être partiel)
 * @returns {Array<Object>} Villes trouvées
 */
function searchVillesByName(nom) {
  const villes = getAllVilles();
  const searchTerm = nom.toLowerCase().trim();

  return villes.filter(v =>
    v.nom.toLowerCase().includes(searchTerm)
  );
}

/**
 * Crée une nouvelle ville
 * @param {Object} ville - {nom, codePostal, departement, pays}
 * @returns {Object} Ville créée avec ID
 */
function createVille(ville) {
  if (!ville.nom || !ville.codePostal) {
    throw new Error(CONFIG.ERRORS.MISSING_PARAMETERS);
  }

  const sheet = getSheet(CONFIG.SHEETS.VILLE);
  const lastRow = sheet.getLastRow();

  const newId = lastRow;

  sheet.appendRow([
    newId,
    ville.nom,
    ville.codePostal,
    ville.departement || '',
    ville.pays || 'France'
  ]);

  console.log(`✅ Ville créée: ${ville.nom} (ID: ${newId})`, 'INFO');

  return {
    id: newId,
    ...ville,
    pays: ville.pays || 'France'
  };
}

/**
 * Met à jour une ville
 * @param {number} id - ID de la ville
 * @param {Object} updates - Champs à mettre à jour
 * @returns {boolean} True si succès
 */
function updateVille(id, updates) {
  const sheet = getSheet(CONFIG.SHEETS.VILLE);
  const data = sheet.getDataRange().getValues();

  const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.VILLE.ID] == id);

  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error(CONFIG.ERRORS.VILLE_NOT_FOUND);
  }

  const actualRow = rowIndex + 1;

  if (updates.nom) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.VILLE.NOM + 1).setValue(updates.nom);
  }
  if (updates.codePostal) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.VILLE.CODE_POSTAL + 1).setValue(updates.codePostal);
  }
  if (updates.departement) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.VILLE.DEPARTEMENT + 1).setValue(updates.departement);
  }
  if (updates.pays) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.VILLE.PAYS + 1).setValue(updates.pays);
  }

  console.log(`✅ Ville ${id} mise à jour`, 'INFO');

  return true;
}

/**
 * Supprime une ville
 * @param {number} id - ID de la ville
 * @returns {boolean} True si succès
 */
function deleteVille(id) {
  const sheet = getSheet(CONFIG.SHEETS.VILLE);
  const data = sheet.getDataRange().getValues();

  const rowIndex = data.findIndex(row => row[CONFIG.COLUMNS.VILLE.ID] == id);

  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error(CONFIG.ERRORS.VILLE_NOT_FOUND);
  }

  sheet.deleteRow(rowIndex + 1);

  console.log(`✅ Ville ${id} supprimée`, 'INFO');

  return true;
}

/**
 * Géocode une ville (trouve son centre géographique)
 * @param {number} id - ID de la ville
 * @returns {Object} Coordonnées du centre de la ville
 */
function geocodeVille(id) {
  const ville = getVilleById(id);

  if (!ville) {
    throw new Error(CONFIG.ERRORS.VILLE_NOT_FOUND);
  }

  const address = `${ville.nom}, ${ville.codePostal}, ${ville.pays || 'France'}`;

  console.log(`🔍 Géocodage ville: ${address}`, 'INFO');

  const result = geocodeAddress(address);

  if (!result.isValid) {
    return {
      success: false,
      villeId: id,
      villeName: ville.nom,
      ...result
    };
  }

  return {
    success: true,
    villeId: id,
    villeName: ville.nom,
    ...result
  };
}

// ========== SECTEUR ==========

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
    latitude: parseFloat(row[CONFIG.COLUMNS.SECTEUR.LATITUDE]) || null,
    longitude: parseFloat(row[CONFIG.COLUMNS.SECTEUR.LONGITUDE]) || null,
    idVille: row[CONFIG.COLUMNS.SECTEUR.ID_VILLE]
  })).filter(s => s.id);

  console.log(`📍 ${secteurs.length} secteurs chargés`);

  return secteurs;
}

/**
 * Récupère un secteur par son ID
 * @param {number} id - ID du secteur
 * @returns {Object|null} Secteur ou null
 */
function getSecteurById(id) {
  const secteurs = getAllSecteurs();
  return secteurs.find(s => s.id == id) || null;
}

/**
 * Récupère tous les secteurs d'une ville
 * @param {number} idVille - ID de la ville
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

  // Les coordonnées sont optionnelles au départ
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

  console.log(`✅ Secteur créé: ${secteur.nom} (ID: ${newId})`, 'INFO');

  return {
    id: newId,
    ...secteur,
    latitude: lat,
    longitude: lng
  };
}

/**
 * Met à jour un secteur
 * @param {number} id - ID du secteur
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
  if (updates.latitude) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.SECTEUR.LATITUDE + 1).setValue(updates.latitude);
  }
  if (updates.longitude) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.SECTEUR.LONGITUDE + 1).setValue(updates.longitude);
  }
  if (updates.idVille) {
    sheet.getRange(actualRow, CONFIG.COLUMNS.SECTEUR.ID_VILLE + 1).setValue(updates.idVille);
  }

  console.log(`✅ Secteur ${id} mis à jour`, 'INFO');

  return true;
}

/**
 * Supprime un secteur
 * @param {number} id - ID du secteur
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

  console.log(`✅ Secteur ${id} supprimé`, 'INFO');

  return true;
}

/**
 * Calcule le centroïde d'un secteur à partir de ses quartiers
 * @param {number} id - ID du secteur
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

  // Mettre à jour le secteur
  updateSecteur(id, {
    latitude: centroid.latitude,
    longitude: centroid.longitude
  });

  console.log(`✅ Centroïde secteur ${id} calculé: ${centroid.latitude}, ${centroid.longitude}`, 'INFO');

  return {
    secteurId: id,
    ...centroid,
    quartiersCount: quartiers.length
  };
}