/**
 * Menu principal de l'application
 */

function onOpen() {
    const ui = SpreadsheetApp.getUi();

    const geolocMenu = ui.createMenu('🗺️ Géolocalisation')
        .addItem('📍 Géocoder les quartiers', 'showGeocodeQuartiersDialog')
        .addItem('🏙️ Géocoder les villes', 'showGeocodeVillesDialog')
        .addItem('🔍 Trouver quartier', 'showFindQuartierDialog')
        .addSeparator()
        .addItem('📏 Calculer distance', 'showCalculateDistanceDialog')
        .addItem('🎯 Quartiers dans un rayon', 'showQuartiersInRadiusDialog');

    const createMenu = ui.createMenu('➕ Créer')
        .addItem('🏙️ Nouvelle ville', 'showCreateVilleDialog')
        .addItem('📍 Nouveau secteur', 'showCreateSecteurDialog')
        .addItem('🏘️ Nouveau quartier', 'showCreateQuartierDialog');

    const toolsMenu = ui.createMenu('🧪 Outils')
        .addItem('🔄 Calculer centroïdes secteurs', 'showCalculateCentroidsDialog')
        .addItem('🧹 Vider le cache', 'clearCacheUI');

    const boundariesMenu = ui.createMenu('🗺️ Boundaries')
        .addItem('🔄 Télécharger boundaries OSM', 'setupBoundariesUI')
        .addItem('🔍 Tester géocodage avec polygones', 'testGeocodeWithPolygonsUI')
        .addItem('🧹 Vider cache', 'clearCacheUI');

    ui.createMenu('📦 AMANA')
        .addSubMenu(geolocMenu)
        .addSeparator()
        .addSubMenu(createMenu)
        .addSeparator()
        .addSubMenu(toolsMenu)
        .addSeparator()
        .addSubMenu(boundariesMenu)
        .addSeparator()
        .addItem('📖 Documentation', 'showDocumentationDialog')
        .addToUi();

    Logger.success('Menu AMANA créé');
}

// ========== DIALOGUES ==========

function showGeocodeQuartiersDialog() {
    UIManager.showDialog('geocodeQuartiers', '📍 Géocoder les quartiers', 500, 550);
}

function showGeocodeVillesDialog() {
    UIManager.showDialog('geocodeVilles', '🏙️ Géocoder les villes', 500, 550);
}

function showFindQuartierDialog() {
    UIManager.showDialog('findQuartier', '🔍 Trouver un quartier', 500, 550);
}

function showCalculateDistanceDialog() {
    UIManager.showDialog('calculateDistance', '📏 Calculer une distance', 500, 450);
}

function showQuartiersInRadiusDialog() {
    UIManager.showDialog('quartiersInRadius', '🎯 Quartiers dans un rayon', 550, 600);
}

function showCreateVilleDialog() {
    UIManager.showDialog('createVille', '🏙️ Créer une nouvelle ville', 500, 450);
}

function showCreateSecteurDialog() {
    UIManager.showDialog('createSecteur', '📍 Créer un nouveau secteur', 500, 550);
}

function showCreateQuartierDialog() {
    UIManager.showDialog('createQuartier', '🏘️ Créer un nouveau quartier', 500, 650);
}

function showCalculateCentroidsDialog() {
    UIManager.showDialog('calculateCentroids', '🔄 Calculer les centroïdes', 500, 350);
}

function showDocumentationDialog() {
    const html = HtmlService.createHtmlOutputFromFile('views/partials/documentation.html')
        .setWidth(600)
        .setHeight(500);

    SpreadsheetApp.getUi().showModalDialog(html, '📖 Documentation');
}

// ========== ACTIONS UI ==========

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
            const results = BoundaryService.setupBoundariesForAll();

            ui.alert(
                '✅ Acquisition terminée',
                `Villes: ${results.villes.success} réussies, ${results.villes.failed} échouées\n` +
                `Quartiers: ${results.quartiers.success} réussies, ${results.quartiers.failed} échouées`,
                ui.ButtonSet.OK
            );
        } catch (e) {
            ui.alert('❌ Erreur', e.message, ui.ButtonSet.OK);
        }
    }
}

function testGeocodeWithPolygonsUI() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.prompt(
        '🔍 Tester géocodage',
        'Entrez une adresse à géocoder:',
        ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() === ui.Button.OK) {
        const address = response.getResponseText();

        try {
            const result = GeocodingService.findQuartierFromAddress(address);

            ui.alert(
                '✅ Quartier trouvé',
                `Quartier: ${result.quartierNom}\n` +
                `ID: ${result.quartierId}\n` +
                `Méthode: ${result.resolutionMethod}\n` +
                `${result.resolutionDetails ? 'Détails: ' + result.resolutionDetails : ''}`,
                ui.ButtonSet.OK
            );

        } catch (e) {
            ui.alert('❌ Erreur', e.message, ui.ButtonSet.OK);
        }
    }
}

function clearCacheUI() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '🧹 Vider cache',
        'Vider tout le cache de géocodage?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        CacheManager.clear();
        ui.alert('✅ Cache vidé', 'Le cache a été nettoyé avec succès.', ui.ButtonSet.OK);
    }
}