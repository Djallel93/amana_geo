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
    centreLatitude: row[CONFIG.COLUMNS.VILLE.CENTRE_LAT] || null,
    centreLongitude: row[CONFIG.COLUMNS.VILLE.CENTRE_LNG] || null,
    polygonFrontiere: row[CONFIG.COLUMNS.VILLE.POLYGON] || null,
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
  if (!codePostal) {
    return [];
  }

  const villes = getAllVilles();

  const normalizedSearch = String(codePostal).trim();

  return villes.filter(v => {
    const villeCodePostal = String(v.codePostal).trim();
    return villeCodePostal === normalizedSearch;
  });
}

/**
 * Recherche des villes par nom (partiel)
 * @param {string} nom - Nom de la ville (peut être partiel)
 * @returns {Array<Object>} Villes trouvées
 */
function searchVillesByName(nom) {
  if (!nom || typeof nom !== 'string') {
    return [];
  }

  const villes = getAllVilles();
  const searchTerm = nom.toLowerCase().trim();

  return villes.filter(v => {
    if (!v.nom || typeof v.nom !== 'string') {
      return false;
    }
    return v.nom.toLowerCase().includes(searchTerm);
  });
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

  console.log(`✅ Ville créée: ${ville.nom} (ID: ${newId})`);

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

  console.log(`✅ Ville ${id} mise à jour`);

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

  console.log(`✅ Ville ${id} supprimée`);

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

  console.log(`🔍 Géocodage ville: ${address}`);

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