/**
 * Menu principal et fonctions d'affichage des dialogues
 */

/**
 * Crée le menu AMANA au chargement du Sheet
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();

    const quickStartMenu = ui.createMenu('🚀 Quick Start')
        .addSubMenu(ui.createMenu('1️⃣ Configuration Initiale')
            .addItem('1.1 - Initialiser authentification', 'step1_setupAuthentication')
            .addItem('1.2 - Autoriser mon compte', 'step2_authorizeYourself')
            .addItem('1.3 - Générer token API', 'step3_generateAPIToken')
        )
        .addSeparator()
        .addSubMenu(ui.createMenu('2️⃣ Vérification')
            .addItem('2.1 - Vérifier authentification', 'step4_checkAuthStatus')
            .addItem('2.2 - Vérifier optimisations', 'step5_verifyOptimizations')
        )
        .addSeparator()
        .addSubMenu(ui.createMenu('3️⃣ Tests Avancés')
            .addItem('3.1 - Lancer tous les tests', 'step6_runAllTests')
            .addItem('3.2 - Benchmark performance', 'step7_benchmarkPerformance')
            .addItem('3.3 - Tester API REST', 'testAPIEndpoint')
        )
        .addSeparator()
        .addSubMenu(ui.createMenu('4️⃣ Maintenance')
            .addItem('4.1 - Nettoyer cache', 'step8_cleanCache')
            .addItem('4.2 - Nettoyer tokens expirés', 'step9_cleanupTokens')
            .addItem('4.3 - Rapport de santé', 'step10_healthReport')
        )
        .addSeparator()
        .addSubMenu(ui.createMenu('⚙️ Configuration Avancée')
            .addItem('Configurer triggers automatiques', 'setupAutomaticTriggers')
            .addItem('Ajouter emails supplémentaires', 'showAddEmailsDialog')
            .addItem('Générer tokens multiples', 'generateMultipleTokens')
            .addItem('Créer dashboard', 'createDashboard')
        )
        .addSeparator()
        .addItem('🎯 CONFIGURATION AUTO (tout en 1)', 'quickStart')
        .addItem('📖 Afficher le guide', 'showQuickStartGuide');

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

    const testsMenu = ui.createMenu('🧪 Tests & Outils')
        .addItem('✅ Lancer tous les tests', 'runAllTestsUI')
        .addItem('📊 Initialiser données de test', 'initTestDataUI')
        .addItem('🔄 Calculer centroïdes secteurs', 'showCalculateCentroidsDialog')
        .addItem('🧹 Nettoyer le cache', 'clearCacheUI')
        .addSeparator()
        .addItem('📈 Générer rapport géographique', 'showReportDialog');

    ui.createMenu('📦 AMANA')
        .addSubMenu(quickStartMenu)
        .addSeparator()
        .addSubMenu(geolocMenu)
        .addSeparator()
        .addSubMenu(createMenu)
        .addSeparator()
        .addItem('🔐 Gérer l\'authentification', 'showManageAuthDialog')
        .addSeparator()
        .addSubMenu(testsMenu)
        .addSeparator()
        .addItem('⚙️ Configuration', 'showConfigDialog')
        .addItem('📖 Documentation', 'showDocumentationDialog')
        .addToUi();

    Logger.log('✅ Menu AMANA créé');
}

// ========================================
// FONCTIONS D'AFFICHAGE DES DIALOGUES
// ========================================

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
    showAlert(
        '📏 Calculer une distance',
        'Cette fonctionnalité sera disponible prochainement.\n\nEn attendant, utilisez l\'API:\nGET /exec?action=calculateDistance&lat1=...&lng1=...&lat2=...&lng2=...',
        SpreadsheetApp.getUi().ButtonSet.OK
    );
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

function showReportDialog() {
    showDialog('generateReport', '📈 Générer un rapport géographique', 500, 450);
}

function showDocumentationDialog() {
    const html = HtmlService.createHtmlOutputFromFile('Google_app_script/views/partials/documentation.html')
        .setWidth(600)
        .setHeight(500);

    SpreadsheetApp.getUi().showModalDialog(html, '📖 Documentation');
}

function showManageAuthDialog() {
    showDialog('manageAuth', '🔐 Gestion de l\'authentification', 600, 600);
}
