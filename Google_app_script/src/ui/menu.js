/**
 * Menu principal et fonctions d'affichage des dialogues
 */

/**
 * Crée le menu AMANA au chargement du Sheet
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();

    ui.createMenu('📦 AMANA')
        .addSubMenu(ui.createMenu('🗺️ Géolocalisation')
            .addItem('📍 Géocoder les quartiers', 'showGeocodeQuartiersDialog')
            .addItem('🏙️ Géocoder les villes', 'showGeocodeVillesDialog')
            .addItem('🔍 Trouver quartier', 'showFindQuartierDialog')
            .addSeparator()
            .addItem('📏 Calculer distance', 'showCalculateDistanceDialog')
            .addItem('🎯 Quartiers dans un rayon', 'showQuartiersInRadiusDialog')
        )
        .addSeparator()
        .addSubMenu(ui.createMenu('➕ Créer')
            .addItem('🏙️ Nouvelle ville', 'showCreateVilleDialog')
            .addItem('📍 Nouveau secteur', 'showCreateSecteurDialog')
            .addItem('🏘️ Nouveau quartier', 'showCreateQuartierDialog')
        )
        .addSeparator()
        .addItem('🔐 Gérer l\'authentification', 'showManageAuthDialog')
        .addSeparator()
        .addSubMenu(ui.createMenu('🧪 Tests & Outils')
            .addItem('✅ Lancer tous les tests', 'runAllTestsUI')
            .addItem('📊 Initialiser données de test', 'initTestDataUI')
            .addItem('🔄 Calculer centroïdes secteurs', 'showCalculateCentroidsDialog')
            .addItem('🧹 Nettoyer le cache', 'clearCacheUI')
            .addSeparator()
            .addItem('📈 Générer rapport géographique', 'showReportDialog')
        )
        .addSeparator()
        .addItem('⚙️ Configuration', 'showConfigDialog')
        .addItem('📖 Documentation', 'showDocumentationDialog')
        .addToUi();

    Logger.log('✅ Menu AMANA créé');
}

// ========================================
// FONCTIONS D'AFFICHAGE DES DIALOGUES
// ========================================

/**
 * Affiche le dialogue de géocodage des quartiers
 */
function showGeocodeQuartiersDialog() {
    showDialog('geocodeQuartiers', '📍 Géocoder les quartiers', 500, 550);
}

/**
 * Affiche le dialogue de géocodage des villes
 */
function showGeocodeVillesDialog() {
    showDialog('geocodeVilles', '🏙️ Géocoder les villes', 500, 550);
}

/**
 * Affiche le dialogue de recherche de quartier
 */
function showFindQuartierDialog() {
    showDialog('findQuartier', '🔍 Trouver un quartier', 500, 550);
}

/**
 * Affiche le dialogue de calcul de distance
 */
function showCalculateDistanceDialog() {
    showAlert(
        '📏 Calculer une distance',
        'Cette fonctionnalité sera disponible prochainement.\n\nEn attendant, utilisez l\'API:\nGET /exec?action=calculateDistance&lat1=...&lng1=...&lat2=...&lng2=...',
        SpreadsheetApp.getUi().ButtonSet.OK
    );
}

/**
 * Affiche le dialogue des quartiers dans un rayon
 */
function showQuartiersInRadiusDialog() {
    showDialog('quartiersInRadius', '🎯 Quartiers dans un rayon', 550, 600);
}

/**
 * Affiche le dialogue de création de ville
 */
function showCreateVilleDialog() {
    showDialog('createVille', '🏙️ Créer une nouvelle ville', 500, 450);
}

/**
 * Affiche le dialogue de création de secteur
 */
function showCreateSecteurDialog() {
    showDialog('createSecteur', '📍 Créer un nouveau secteur', 500, 550);
}

/**
 * Affiche le dialogue de création de quartier
 */
function showCreateQuartierDialog() {
    showDialog('createQuartier', '🏘️ Créer un nouveau quartier', 500, 650);
}

/**
 * Affiche le dialogue de calcul des centroïdes
 */
function showCalculateCentroidsDialog() {
    showDialog('calculateCentroids', '🔄 Calculer les centroïdes', 500, 350);
}

/**
 * Affiche le dialogue de génération de rapport
 */
function showReportDialog() {
    showDialog('generateReport', '📈 Générer un rapport géographique', 500, 450);
}

/**
 * Affiche la documentation
 */
function showDocumentationDialog() {
    const html = HtmlService.createHtmlOutputFromFile('Google_app_script/views/partials/documentation.html')
        .setWidth(600)
        .setHeight(500);

    SpreadsheetApp.getUi().showModalDialog(html, '📖 Documentation');
}

/**
 * Affiche l'interface de gestion de l'authentification
 */
function showManageAuthDialog() {
    showDialog('manageAuth', '🔐 Gestion de l\'authentification', 600, 600);
}