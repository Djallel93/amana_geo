/**
 * Fonctions d'aide pour l'interface utilisateur
 * Gestion des dialogues HTML et interactions
 */

/**
 * Charge un fichier HTML et injecte le CSS commun
 * @param {string} filename - Nom du fichier HTML (sans extension)
 * @returns {HtmlOutput} Template HTML avec CSS
 */
function loadHtmlTemplate(filename) {
    // Charger le fichier HTML
    const html = HtmlService.createTemplateFromFile(`views/dialogs/${filename}.html`);

    // Évaluer le template
    const output = html.evaluate();

    // Définir la largeur et hauteur par défaut
    output.setWidth(500).setHeight(550);

    return output;
}

/**
 * Inclut le contenu d'un fichier (pour use avec <?!= include('file') ?> dans HTML)
 * @param {string} filename - Nom du fichier à inclure
 * @returns {string} Contenu du fichier
 */
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Charge et affiche un dialogue HTML
 * @param {string} filename - Nom du fichier HTML
 * @param {string} title - Titre du dialogue
 * @param {number} width - Largeur (optionnel)
 * @param {number} height - Hauteur (optionnel)
 */
function showDialog(filename, title, width, height) {
    const html = loadHtmlTemplate(filename);

    if (width) html.setWidth(width);
    if (height) html.setHeight(height);

    SpreadsheetApp.getUi().showModalDialog(html, title);
}

/**
 * Affiche un message d'alerte
 * @param {string} title - Titre
 * @param {string} message - Message
 * @param {ButtonSet} buttonSet - Type de boutons
 * @returns {Button} Bouton cliqué
 */
function showAlert(title, message, buttonSet) {
    const ui = SpreadsheetApp.getUi();
    buttonSet = buttonSet || ui.ButtonSet.OK;
    return ui.alert(title, message, buttonSet);
}

/**
 * Affiche un message de succès
 * @param {string} message - Message de succès
 */
function showSuccess(message) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('✅ Succès', message, ui.ButtonSet.OK);
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
function showError(message) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('❌ Erreur', message, ui.ButtonSet.OK);
}

/**
 * Demande confirmation à l'utilisateur
 * @param {string} title - Titre
 * @param {string} message - Message
 * @returns {boolean} True si l'utilisateur confirme
 */
function confirm(title, message) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(title, message, ui.ButtonSet.YES_NO);
    return response === ui.Button.YES;
}

// ========================================
// FONCTIONS BACKEND POUR LES DIALOGUES
// ========================================

/**
 * Géocode les quartiers (backend pour dialogue)
 */
function geocodeQuartiersUI(villeId, secteurId, skipExisting, batchSize) {
    let quartiers;

    if (secteurId) {
        console.log("getQuartiersBySecteur");
        quartiers = getQuartiersBySecteur(secteurId, false);
    } else if (villeId) {
        console.log("getQuartiersByVille");
        quartiers = getQuartiersByVille(villeId, false);
    } else {
        console.log("getAllQuartiers");
        quartiers = getAllQuartiers(false);
    }

    if (skipExisting) {
        quartiers = quartiers.filter(q => !q.latitude || !q.longitude);
    }

    let success = 0;
    let errors = 0;
    for (let i = 0; i < quartiers.length; i++) {
        if (i > 0 && i % batchSize === 0) {
            Utilities.sleep(2000);
        }

        try {
            console.log(quartiers[i]);
            geocodeQuartier(quartiers[i].id);
            success++;
        } catch (e) {
            console.log(`Erreur quartier ${quartiers[i].id}: ${e.message}`);
            errors++;
        }

        if (i < quartiers.length - 1) {
            Utilities.sleep(500);
        }
    }

    return { success, errors, total: quartiers.length };
}

/**
 * Géocode les villes (backend pour dialogue)
 */
function geocodeVillesUI(villeIds) {
    let success = 0;

    villeIds.forEach((id, index) => {
        try {
            geocodeVille(id);
            success++;
        } catch (e) {
            console.log(`Erreur ville ${id}: ${e.message}`);
        }

        if (index < villeIds.length - 1) {
            Utilities.sleep(1000);
        }
    });

    return { success, total: villeIds.length };
}

/**
 * Trouve un quartier par adresse (backend pour dialogue)
 */
function findQuartierByAddressUI(address, maxDistance) {
    const geocode = geocodeAddress(address);

    if (!geocode.isValid) {
        throw new Error('Adresse invalide');
    }

    const quartier = findNearestQuartier(
        geocode.coordinates.latitude,
        geocode.coordinates.longitude,
        maxDistance
    );

    if (!quartier) {
        throw new Error('Aucun quartier trouvé dans le rayon spécifié');
    }

    return quartier;
}

/**
 * Trouve un quartier par coordonnées (backend pour dialogue)
 */
function findQuartierByCoordsUI(lat, lng, maxDistance) {
    const quartier = findNearestQuartier(lat, lng, maxDistance);

    if (!quartier) {
        throw new Error('Aucun quartier trouvé dans le rayon spécifié');
    }

    return quartier;
}

/**
 * Trouve les quartiers dans un rayon (backend pour dialogue)
 */
function findQuartiersInRadiusUI(address, radius) {
    const geocode = geocodeAddress(address);

    if (!geocode.isValid) {
        throw new Error('Adresse invalide');
    }

    const quartiers = findQuartiersInRadius(
        geocode.coordinates.latitude,
        geocode.coordinates.longitude,
        radius
    );

    return {
        address: geocode.formattedAddress,
        center: geocode.coordinates,
        radius,
        quartiers
    };
}

/**
 * Crée une ville (backend pour dialogue)
 */
function createVilleUI(nom, codePostal, departement, pays) {
    return createVille({
        nom,
        codePostal,
        departement: departement || '',
        pays: pays || 'France'
    });
}

/**
 * Crée un secteur (backend pour dialogue)
 */
function createSecteurUI(nom, idVille, latitude, longitude) {
    return createSecteur({
        nom,
        idVille,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
    });
}

/**
 * Crée un quartier (backend pour dialogue)
 */
function createQuartierUI(nom, idSecteur, latitude, longitude) {
    return createQuartier({
        nom,
        idSecteur,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
    });
}

/**
 * Calcule les centroïdes des secteurs (backend pour dialogue)
 */
function calculateCentroidsUI(villeId) {
    let secteurs;

    if (villeId) {
        secteurs = getSecteursByVille(villeId);
    } else {
        secteurs = getAllSecteurs();
    }

    let success = 0;
    let errors = 0;

    secteurs.forEach(secteur => {
        try {
            calculateSecteurCentroid(secteur.id);
            success++;
        } catch (e) {
            console.log(`Erreur secteur ${secteur.id}: ${e.message}`);
            errors++;
        }
    });

    return { success, errors, total: secteurs.length };
}

/**
 * Génère un rapport géographique (backend pour dialogue)
 */
function generateReportUI(options) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Supprimer l'ancien rapport
    const oldSheet = ss.getSheetByName('Rapport_GEO');
    if (oldSheet) {
        ss.deleteSheet(oldSheet);
    }

    // Créer la nouvelle feuille
    const sheet = ss.insertSheet('Rapport_GEO');

    let row = 1;

    // Titre
    sheet.getRange(row, 1).setValue('📊 RAPPORT GÉOGRAPHIQUE AMANA');
    sheet.getRange(row, 1).setFontSize(18).setFontWeight('bold');
    row += 2;

    sheet.getRange(row, 1).setValue(`Généré le: ${new Date().toLocaleString('fr-FR')}`);
    row += 3;

    // Statistiques globales
    sheet.getRange(row, 1).setValue('STATISTIQUES GLOBALES');
    sheet.getRange(row, 1, 1, 4)
        .setFontWeight('bold')
        .setBackground('#4285F4')
        .setFontColor('white');
    row++;

    const villes = getAllVilles();
    const secteurs = getAllSecteurs();
    const quartiers = getAllQuartiers();

    sheet.getRange(row, 1, 3, 2).setValues([
        ['Total Villes:', villes.length],
        ['Total Secteurs:', secteurs.length],
        ['Total Quartiers:', quartiers.length]
    ]);
    row += 4;

    // Distribution par ville
    if (options.includeVilles) {
        sheet.getRange(row, 1).setValue('DISTRIBUTION PAR VILLE');
        sheet.getRange(row, 1, 1, 5)
            .setFontWeight('bold')
            .setBackground('#34A853')
            .setFontColor('white');
        row++;

        sheet.getRange(row, 1, 1, 5).setValues([
            ['Ville', 'Code Postal', 'Secteurs', 'Quartiers', '% Total']
        ]).setFontWeight('bold');
        row++;

        villes.forEach(ville => {
            const villeSecteurs = getSecteursByVille(ville.id);
            const villeQuartiers = getQuartiersByVille(ville.id);
            const pourcentage = ((villeQuartiers.length / quartiers.length) * 100).toFixed(1);

            sheet.getRange(row, 1, 1, 5).setValues([[
                ville.nom,
                ville.codePostal,
                villeSecteurs.length,
                villeQuartiers.length,
                pourcentage + '%'
            ]]);
            row++;
        });
        row += 2;
    }

    // Auto-ajuster les colonnes
    sheet.autoResizeColumns(1, 6);

    // Créer des graphiques si demandé
    if (options.includeCharts) {
        createReportCharts(sheet, villes, quartiers);
    }

    console.log('✅ Rapport généré avec succès');
}

/**
 * Crée les graphiques pour le rapport
 */
function createReportCharts(sheet, villes, quartiers) {
    const chartData = [['Ville', 'Nombre de quartiers']];

    villes.forEach(ville => {
        const villeQuartiers = getQuartiersByVille(ville.id);
        chartData.push([ville.nom, villeQuartiers.length]);
    });

    const dataRange = sheet.getRange(1, 8, chartData.length, 2);
    dataRange.setValues(chartData);

    const chart = sheet.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(dataRange)
        .setPosition(5, 8, 0, 0)
        .setOption('title', 'Distribution des quartiers par ville')
        .setOption('width', 500)
        .setOption('height', 300)
        .build();

    sheet.insertChart(chart);
}

/**
 * Lance tous les tests (backend pour dialogue)
 */
function runAllTestsUI() {
    if (confirm(
        '🧪 Lancer tous les tests',
        'Cette opération va exécuter la suite complète de tests. Voulez-vous continuer ?'
    )) {
        try {
            runAllTests();
            showSuccess('Tous les tests ont été exécutés. Consultez les logs pour les résultats détaillés.');
        } catch (e) {
            showError('Une erreur est survenue : ' + e.message);
        }
    }
}

/**
 * Initialise les données de test (backend pour dialogue)
 */
function initTestDataUI() {
    if (confirm(
        '📊 Initialiser données de test',
        'Cette opération va créer des villes, secteurs et quartiers de démonstration. Continuer ?'
    )) {
        try {
            initTestData();
            showSuccess('Les données de test ont été initialisées avec succès.');
        } catch (e) {
            showError('Une erreur est survenue : ' + e.message);
        }
    }
}

/**
 * Nettoie le cache (backend pour dialogue)
 */
function clearCacheUI() {
    if (confirm(
        '🧹 Nettoyer le cache',
        'Cette opération va vider tout le cache. Les prochaines requêtes seront plus lentes. Continuer ?'
    )) {
        try {
            CacheService.getScriptCache().removeAll([]);
            showSuccess('Le cache a été nettoyé avec succès.');
        } catch (e) {
            showError('Une erreur est survenue : ' + e.message);
        }
    }
}

/**
 * Affiche la configuration (backend pour dialogue)
 */
function showConfigDialog() {
    const props = PropertiesService.getScriptProperties().getProperties();

    let configText = '⚙️ CONFIGURATION GEO API\n\n';
    configText += 'SHEET_ID: ' + (props.SHEET_ID || 'Non configuré') + '\n';
    configText += 'MAX_DISTANCE_KM: ' + (props.MAX_DISTANCE_KM || '50') + '\n';
    configText += 'CACHE_DURATION: ' + (props.CACHE_DURATION || '3600') + ' secondes\n';
    configText += 'ENABLE_AUTH: ' + (props.ENABLE_AUTH || 'false') + '\n';
    configText += 'API_KEY: ' + (props.API_KEY ? '***configurée***' : 'Non configurée');

    showAlert('⚙️ Configuration', configText, SpreadsheetApp.getUi().ButtonSet.OK);
}