/**
 * Menu principal simplifié
 * VERSION SANS AUTH
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

    ui.createMenu('📦 AMANA')
        .addSubMenu(geolocMenu)
        .addSeparator()
        .addSubMenu(createMenu)
        .addSeparator()
        .addSubMenu(toolsMenu)
        .addSeparator()
        .addItem('📖 Documentation', 'showDocumentationDialog')
        .addToUi();

    console.log('✅ Menu AMANA créé');
}


function showGeocodeQuartiersDialog() {
    showDialog('geocodeQuartiers', '📍 Géocoder les quartiers', 500, 550);
}

function showGeocodeVillesDialog() {
    showDialog('geocodeVilles', '🏙️ Géocoder les villes', 500, 550);
}

function showFindQuartierDialog() {
    showDialog('findQuartier', '🔍 Trouver un quartier', 500, 550);
}

function showCalculateDistanceDialog() {
    showDialog('calculateDistance', '📏 Calculer une distance', 500, 450);
}

function showQuartiersInRadiusDialog() {
    showDialog('quartiersInRadius', '🎯 Quartiers dans un rayon', 550, 600);
}

function showCreateVilleDialog() {
    showDialog('createVille', '🏙️ Créer une nouvelle ville', 500, 450);
}

function showCreateSecteurDialog() {
    showDialog('createSecteur', '📍 Créer un nouveau secteur', 500, 550);
}

function showCreateQuartierDialog() {
    showDialog('createQuartier', '🏘️ Créer un nouveau quartier', 500, 650);
}

function showCalculateCentroidsDialog() {
    showDialog('calculateCentroids', '🔄 Calculer les centroïdes', 500, 350);
}

function showDocumentationDialog() {
    const html = HtmlService.createHtmlOutputFromFile('views/partials/documentation.html')
        .setWidth(600)
        .setHeight(500);

    SpreadsheetApp.getUi().showModalDialog(html, '📖 Documentation');
}

function showDialog(filename, title, width, height) {
    const html = HtmlService.createTemplateFromFile(`views/dialogs/${filename}.html`);
    const output = html.evaluate()
        .setWidth(width)
        .setHeight(height);

    SpreadsheetApp.getUi().showModalDialog(output, title);
}
