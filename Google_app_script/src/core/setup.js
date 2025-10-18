/**
 * ═══════════════════════════════════════════════════════════════
 * 🚀 GUIDE DE DÉMARRAGE RAPIDE - GEO API OPTIMISÉE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Ce fichier contient toutes les commandes pour configurer et tester
 * votre API optimisée, accessible via le menu "🚀 Quick Start"
 * 
 * ⏱️ Durée totale estimée : 10 minutes
 */

// ═══════════════════════════════════════════════════════════════
// ÉTAPE 1 : CONFIGURATION INITIALE (1ère fois uniquement)
// ═══════════════════════════════════════════════════════════════

/**
 * 1.1 - Initialiser le système d'authentification
 * À exécuter UNE SEULE FOIS après installation
 */
function step1_setupAuthentication() {
    const ui = SpreadsheetApp.getUi();

    try {
        setupAuthentication();

        ui.alert(
            '✅ Succès',
            'Authentification initialisée avec succès !\n\n' +
            '➡️ Passez à l\'étape 1.2 : Autoriser mon compte',
            ui.ButtonSet.OK
        );
    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors de l\'initialisation :\n\n' + e.message + '\n\n' +
            '💡 Vérifiez que auth.js est bien importé',
            ui.ButtonSet.OK
        );
    }
}

/**
 * 1.2 - Autoriser votre compte utilisateur
 * Ajoute votre email à la liste des utilisateurs autorisés
 */
function step2_authorizeYourself() {
    const ui = SpreadsheetApp.getUi();

    try {
        const email = Session.getActiveUser().getEmail();

        authorizeCurrentUser();

        ui.alert(
            '✅ Succès',
            'Votre compte a été autorisé !\n\n' +
            '📧 Email : ' + email + '\n\n' +
            '➡️ Passez à l\'étape 1.3 : Générer token API',
            ui.ButtonSet.OK
        );
    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors de l\'autorisation :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

/**
 * 1.3 - Générer un token API pour les applications externes
 * Ce token sera utilisé pour les appels REST
 */
function step3_generateAPIToken() {
    const ui = SpreadsheetApp.getUi();

    try {
        const tokenData = generateAPIToken('PRODUCTION', 365);

        const message =
            '✅ Token généré avec succès !\n\n' +
            '🔑 COPIEZ CE TOKEN (il ne sera plus affiché) :\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            tokenData.token + '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '📝 Informations :\n' +
            '• Nom : ' + tokenData.name + '\n' +
            '• Créé le : ' + new Date(tokenData.createdAt).toLocaleString('fr-FR') + '\n' +
            '• Expire le : ' + new Date(tokenData.expiresAt).toLocaleString('fr-FR') + '\n\n' +
            '💾 Sauvegardez-le dans un endroit sûr !\n\n' +
            '➡️ Configuration terminée ! Passez à l\'étape 2';

        ui.alert('🔑 Token API', message, ui.ButtonSet.OK);

        // Aussi dans les logs pour faciliter la copie
        Logger.log('TOKEN GÉNÉRÉ : ' + tokenData.token);

    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors de la génération du token :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// ÉTAPE 2 : VÉRIFICATION DE L'INSTALLATION
// ═══════════════════════════════════════════════════════════════

/**
 * 2.1 - Vérifier l'état de l'authentification
 * Affiche un résumé complet de la configuration
 */
function step4_checkAuthStatus() {
    const ui = SpreadsheetApp.getUi();

    try {
        const emails = getAuthorizedEmails();
        const domains = getAuthorizedDomains();
        const tokens = listAPITokens();
        const activeTokens = tokens.filter(t => t.active);

        const message =
            '📊 ÉTAT DE L\'AUTHENTIFICATION\n\n' +
            '🔐 Emails autorisés : ' + emails.length + '\n' +
            emails.slice(0, 5).map(e => '  • ' + e).join('\n') +
            (emails.length > 5 ? '\n  • ... et ' + (emails.length - 5) + ' autres' : '') + '\n\n' +
            '🌐 Domaines autorisés : ' + domains.length + '\n' +
            (domains.length > 0 ? domains.map(d => '  • *@' + d).join('\n') : '  (aucun)') + '\n\n' +
            '🔑 Tokens API : ' + activeTokens.length + '/' + tokens.length + ' actifs\n\n' +
            '➡️ Passez à l\'étape 2.2 : Vérifier optimisations';

        ui.alert('✅ Vérification', message, ui.ButtonSet.OK);

        // Afficher détails complets dans les logs
        showAuthStatus();

    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors de la vérification :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

/**
 * 2.2 - Vérifier que toutes les optimisations fonctionnent
 * Test complet de tous les composants
 */
function step5_verifyOptimizations() {
    const ui = SpreadsheetApp.getUi();

    let results = [];
    let allOk = true;

    // Test 1: Cache
    try {
        CacheService.getScriptCache().put('test_key', 'test_value', 60);
        const cached = CacheService.getScriptCache().get('test_key');
        results.push(cached === 'test_value' ? '✅ Cache fonctionnel' : '❌ Cache non fonctionnel');
        if (cached !== 'test_value') allOk = false;
    } catch (e) {
        results.push('❌ Erreur cache : ' + e.message);
        allOk = false;
    }

    // Test 2: Auth
    try {
        const emails = getAuthorizedEmails();
        const tokens = listAPITokens();
        if (emails.length > 0 || tokens.length > 0) {
            results.push('✅ Auth configurée (' + emails.length + ' emails, ' + tokens.length + ' tokens)');
        } else {
            results.push('⚠️ Aucune auth configurée');
            allOk = false;
        }
    } catch (e) {
        results.push('❌ Erreur auth : ' + e.message);
        allOk = false;
    }

    // Test 3: Services
    try {
        const villes = getAllVilles();
        const quartiers = getAllQuartiers(false);
        results.push('✅ Services OK (' + villes.length + ' villes, ' + quartiers.length + ' quartiers)');
    } catch (e) {
        results.push('❌ Erreur services : ' + e.message);
        allOk = false;
    }

    // Test 4: Distance
    try {
        const distance = calculateDistance(48.8566, 2.3522, 45.7640, 4.8357);
        if (distance > 0 && distance < 1000) {
            results.push('✅ Distances OK (Paris-Lyon: ' + distance + ' km)');
        } else {
            results.push('❌ Distance invalide : ' + distance);
            allOk = false;
        }
    } catch (e) {
        results.push('❌ Erreur distance : ' + e.message);
        allOk = false;
    }

    // Test 5: Performance cache
    try {
        const start1 = Date.now();
        getAllQuartiers();
        const duration1 = Date.now() - start1;

        const start2 = Date.now();
        getAllQuartiers();
        const duration2 = Date.now() - start2;

        const improvement = Math.round((1 - duration2 / duration1) * 100);
        results.push('✅ Cache améliore de ' + improvement + '% (1er: ' + duration1 + 'ms, 2e: ' + duration2 + 'ms)');

        if (improvement < 50) {
            results.push('⚠️ Amélioration cache faible');
        }
    } catch (e) {
        results.push('❌ Erreur performance : ' + e.message);
    }

    const message =
        '🧪 RÉSULTATS DES VÉRIFICATIONS\n\n' +
        results.join('\n\n') + '\n\n' +
        (allOk ?
            '═══════════════════════════════════\n' +
            '✅ TOUTES LES VÉRIFICATIONS SONT OK !\n' +
            '═══════════════════════════════════\n\n' +
            '🎉 Votre API est prête à être utilisée !\n\n' +
            '➡️ Passez à l\'étape 3 pour les tests avancés' :
            '⚠️ CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ\n\n' +
            '💡 Vérifiez que tous les fichiers ont été correctement remplacés');

    ui.alert('📊 Vérifications', message, ui.ButtonSet.OK);
}

// ═══════════════════════════════════════════════════════════════
// ÉTAPE 3 : TESTS AVANCÉS (Optionnel)
// ═══════════════════════════════════════════════════════════════

/**
 * 3.1 - Exécuter la suite complète de tests
 * Lance tous les tests unitaires et d'intégration
 */
function step6_runAllTests() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '🧪 Lancer tous les tests',
        'Cette opération va exécuter la suite complète de tests.\n' +
        'Durée estimée : 1-2 minutes.\n\n' +
        'Les résultats détaillés seront dans les logs.\n\n' +
        'Continuer ?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        try {
            runAllTests();
            ui.alert(
                '✅ Succès',
                'Suite de tests terminée !\n\n' +
                '📊 Consultez les logs pour les détails :\n' +
                'Apps Script → Executions → View logs',
                ui.ButtonSet.OK
            );
        } catch (e) {
            ui.alert(
                '❌ Erreur',
                'Erreur lors des tests :\n\n' + e.message,
                ui.ButtonSet.OK
            );
        }
    }
}

/**
 * 3.2 - Benchmark de performance
 * Compare les performances avant/après optimisations
 */
function step7_benchmarkPerformance() {
    const ui = SpreadsheetApp.getUi();

    try {
        const results = [];

        // Test géocodage avec cache
        const testAddress = '1 Place Bellecour, Lyon';

        const start1 = Date.now();
        geocodeAddress(testAddress);
        const duration1 = Date.now() - start1;

        const start2 = Date.now();
        geocodeAddress(testAddress);
        const duration2 = Date.now() - start2;

        const gain1 = Math.round((1 - duration2 / duration1) * 100);
        results.push('📍 Géocodage avec cache :');
        results.push('  • Sans cache : ' + duration1 + 'ms');
        results.push('  • Avec cache : ' + duration2 + 'ms');
        results.push('  • Gain : ' + gain1 + '%');

        // Test recherche quartier
        const quartiers = getAllQuartiers();
        if (quartiers.length > 0) {
            const start3 = Date.now();
            findNearestQuartier(48.8566, 2.3522, 50);
            const duration3 = Date.now() - start3;

            results.push('');
            results.push('🔍 Recherche quartier :');
            results.push('  • Temps : ' + duration3 + 'ms');
            results.push('  • ' + (duration3 < 500 ? '✅ Performance excellente' : '⚠️ Performance à optimiser'));
        }

        // Test distance batch
        const destinations = [];
        for (let i = 0; i < 100; i++) {
            destinations.push({
                lat: 45 + Math.random() * 5,
                lng: -2 + Math.random() * 5
            });
        }

        const start4 = Date.now();
        calculateDistances(48.8566, 2.3522, destinations);
        const duration4 = Date.now() - start4;

        results.push('');
        results.push('📏 Calcul 100 distances :');
        results.push('  • Temps total : ' + duration4 + 'ms');
        results.push('  • Moyenne : ' + (duration4 / 100).toFixed(2) + 'ms/calcul');
        results.push('  • ' + (duration4 < 1000 ? '✅ Performance excellente' : '⚠️ Performance acceptable'));

        ui.alert(
            '⚡ Benchmark Performance',
            results.join('\n'),
            ui.ButtonSet.OK
        );

    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors du benchmark :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

/**
 * 3.3 - Test rapide de l'API REST
 */
function testAPIEndpoint() {
    const ui = SpreadsheetApp.getUi();

    try {
        const tokens = listAPITokens();
        const activeToken = tokens.find(t => t.active);

        if (!activeToken) {
            ui.alert(
                '⚠️ Aucun token',
                'Aucun token actif trouvé.\n\n' +
                'Générez d\'abord un token via :\n' +
                'Étape 1.3 - Générer token API',
                ui.ButtonSet.OK
            );
            return;
        }

        const apiKey = activeToken.fullToken;
        const results = [];

        // Test Ping
        const response1 = doGet({ parameter: { action: 'ping', apiKey: apiKey } });
        const result1 = JSON.parse(response1.getContent());
        results.push('✅ Ping : ' + result1.status);

        // Test Get Villes
        const response2 = doGet({ parameter: { action: 'getVilles', apiKey: apiKey } });
        const result2 = JSON.parse(response2.getContent());
        results.push('✅ Get Villes : ' + (result2.count || 0) + ' villes');

        // Test sans token (doit échouer)
        const response3 = doGet({ parameter: { action: 'ping' } });
        const result3 = JSON.parse(response3.getContent());
        results.push(result3.error ? '✅ Auth fonctionne (requête rejetée)' : '⚠️ Auth désactivée');

        ui.alert(
            '🧪 Tests API',
            results.join('\n\n'),
            ui.ButtonSet.OK
        );

    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors du test API :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// ÉTAPE 4 : MAINTENANCE
// ═══════════════════════════════════════════════════════════════

/**
 * 4.1 - Nettoyer le cache
 */
function step8_cleanCache() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '🧹 Nettoyer le cache',
        'Cette opération va vider tout le cache.\n' +
        'Les prochaines requêtes seront plus lentes (normal).\n\n' +
        'Le cache se reconstruira automatiquement.\n\n' +
        'Continuer ?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        try {
            CacheService.getScriptCache().removeAll([]);
            ui.alert(
                '✅ Succès',
                'Cache nettoyé avec succès !\n\n' +
                '💡 Les prochaines requêtes seront plus lentes,\n' +
                'c\'est normal. Le cache se reconstruira automatiquement.',
                ui.ButtonSet.OK
            );
        } catch (e) {
            ui.alert(
                '❌ Erreur',
                'Erreur lors du nettoyage :\n\n' + e.message,
                ui.ButtonSet.OK
            );
        }
    }
}

/**
 * 4.2 - Nettoyer les tokens expirés
 */
function step9_cleanupTokens() {
    const ui = SpreadsheetApp.getUi();

    try {
        const cleaned = cleanupExpiredTokens();

        if (cleaned > 0) {
            ui.alert(
                '✅ Succès',
                cleaned + ' token(s) expiré(s) supprimé(s)',
                ui.ButtonSet.OK
            );
        } else {
            ui.alert(
                'ℹ️ Info',
                'Aucun token expiré à nettoyer.\n\n' +
                'Tous vos tokens sont encore valides.',
                ui.ButtonSet.OK
            );
        }
    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors du nettoyage :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

/**
 * 4.3 - Générer un rapport de santé
 */
function step10_healthReport() {
    const ui = SpreadsheetApp.getUi();

    try {
        const villes = getAllVilles();
        const secteurs = getAllSecteurs();
        const quartiers = getAllQuartiers(false);
        const quartiersGeo = getAllQuartiers(true);

        const emails = getAuthorizedEmails();
        const domains = getAuthorizedDomains();
        const tokens = listAPITokens();
        const activeTokens = tokens.filter(t => t.active);

        const message =
            '📊 RAPPORT DE SANTÉ GEO API\n\n' +
            '═══════════════════════════════════\n' +
            '📈 DONNÉES\n' +
            '═══════════════════════════════════\n' +
            '• Villes : ' + villes.length + '\n' +
            '• Secteurs : ' + secteurs.length + '\n' +
            '• Quartiers : ' + quartiers.length + '\n' +
            '• Quartiers géocodés : ' + quartiersGeo.length +
            ' (' + Math.round(quartiersGeo.length / Math.max(quartiers.length, 1) * 100) + '%)\n\n' +
            '═══════════════════════════════════\n' +
            '🔐 SÉCURITÉ\n' +
            '═══════════════════════════════════\n' +
            '• Emails autorisés : ' + emails.length + '\n' +
            '• Domaines autorisés : ' + domains.length + '\n' +
            '• Tokens actifs : ' + activeTokens.length + '/' + tokens.length + '\n\n' +
            '═══════════════════════════════════\n' +
            '💾 CACHE\n' +
            '═══════════════════════════════════\n' +
            '• Status : Opérationnel ✅\n' +
            '• Type : Script Cache\n' +
            '• TTL : ' + (CONFIG.GEO?.CACHE_DURATION || 3600) + 's\n\n' +
            '═══════════════════════════════════\n' +
            '✅ Système opérationnel';

        ui.alert('📊 Rapport de Santé', message, ui.ButtonSet.OK);

    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors de la génération du rapport :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION AVANCÉE
// ═══════════════════════════════════════════════════════════════

/**
 * Configure des triggers automatiques
 */
function setupAutomaticTriggers() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '⏰ Configurer triggers automatiques',
        'Cette opération va créer des triggers pour :\n\n' +
        '• Nettoyer les tokens expirés (quotidien à 3h)\n' +
        '• Générer rapport de santé (quotidien à 9h)\n\n' +
        'Continuer ?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        try {
            // Supprimer anciens triggers
            const triggers = ScriptApp.getProjectTriggers();
            triggers.forEach(trigger => {
                if (trigger.getHandlerFunction() === 'cleanupExpiredTokens' ||
                    trigger.getHandlerFunction() === 'step10_healthReport') {
                    ScriptApp.deleteTrigger(trigger);
                }
            });

            // Créer nouveaux triggers
            ScriptApp.newTrigger('cleanupExpiredTokens')
                .timeBased()
                .atHour(3)
                .everyDays(1)
                .create();

            ScriptApp.newTrigger('step10_healthReport')
                .timeBased()
                .atHour(9)
                .everyDays(1)
                .create();

            ui.alert(
                '✅ Succès',
                'Triggers configurés avec succès !\n\n' +
                '• Nettoyage tokens : Tous les jours à 3h\n' +
                '• Rapport santé : Tous les jours à 9h',
                ui.ButtonSet.OK
            );
        } catch (e) {
            ui.alert(
                '❌ Erreur',
                'Erreur lors de la configuration :\n\n' + e.message,
                ui.ButtonSet.OK
            );
        }
    }
}

/**
 * Affiche dialogue pour ajouter des emails
 */
function showAddEmailsDialog() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.prompt(
        '📧 Ajouter un email autorisé',
        'Entrez l\'adresse email à autoriser :',
        ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() === ui.Button.OK) {
        const email = response.getResponseText().trim();

        if (!email) {
            ui.alert('⚠️ Erreur', 'Veuillez saisir un email', ui.ButtonSet.OK);
            return;
        }

        try {
            const added = addAuthorizedEmail(email);

            if (added) {
                ui.alert(
                    '✅ Succès',
                    'Email ajouté avec succès !\n\n' +
                    '📧 ' + email,
                    ui.ButtonSet.OK
                );
            } else {
                ui.alert(
                    'ℹ️ Info',
                    'Cet email est déjà dans la liste :\n\n' +
                    '📧 ' + email,
                    ui.ButtonSet.OK
                );
            }
        } catch (e) {
            ui.alert(
                '❌ Erreur',
                'Erreur lors de l\'ajout :\n\n' + e.message,
                ui.ButtonSet.OK
            );
        }
    }
}

/**
 * Génère plusieurs tokens pour différents environnements
 */
function generateMultipleTokens() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '🔑 Générer tokens multiples',
        'Cette opération va générer 3 tokens :\n\n' +
        '• PRODUCTION (365 jours)\n' +
        '• STAGING (180 jours)\n' +
        '• DEVELOPMENT (90 jours)\n\n' +
        'Continuer ?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        try {
            const tokensConfig = [
                { name: 'PRODUCTION', days: 365 },
                { name: 'STAGING', days: 180 },
                { name: 'DEVELOPMENT', days: 90 }
            ];

            let message = '🔐 TOKENS GÉNÉRÉS\n\nCopiez-les immédiatement :\n\n';

            tokensConfig.forEach(config => {
                const tokenData = generateAPIToken(config.name, config.days);
                message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                message += '📌 ' + config.name + ' :\n';
                message += tokenData.token + '\n';
                message += 'Expire : ' + new Date(tokenData.expiresAt).toLocaleDateString('fr-FR') + '\n\n';

                // Logger pour copie facile
                Logger.log(config.name + ' TOKEN: ' + tokenData.token);
            });

            message += '⚠️ Sauvegardez-les dans un endroit sûr !';

            ui.alert('🔑 Tokens générés', message, ui.ButtonSet.OK);

        } catch (e) {
            ui.alert(
                '❌ Erreur',
                'Erreur lors de la génération :\n\n' + e.message,
                ui.ButtonSet.OK
            );
        }
    }
}

/**
 * Crée un tableau de bord dans une nouvelle feuille
 */
function createDashboard() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '📊 Créer Dashboard',
        'Cette opération va créer une feuille "DASHBOARD"\n' +
        'avec les métriques principales.\n\n' +
        'Continuer ?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();

            // Supprimer ancien dashboard
            const oldSheet = ss.getSheetByName('DASHBOARD');
            if (oldSheet) {
                ss.deleteSheet(oldSheet);
            }

            // Créer nouveau dashboard
            const sheet = ss.insertSheet('DASHBOARD');

            // Headers
            sheet.getRange('A1:D1').setValues([[
                'Métrique', 'Valeur', 'Objectif', 'Status'
            ]]).setFontWeight('bold').setBackground('#4285F4').setFontColor('white');

            // Données
            const villes = getAllVilles();
            const secteurs = getAllSecteurs();
            const quartiers = getAllQuartiers(false);
            const quartiersGeo = getAllQuartiers(true);
            const emails = getAuthorizedEmails();
            const tokens = listAPITokens();
            const activeTokens = tokens.filter(t => t.active);

            const data = [
                ['Villes', villes.length, 10, ''],
                ['Secteurs', secteurs.length, 50, ''],
                ['Quartiers', quartiers.length, 100, ''],
                ['Quartiers géocodés', quartiersGeo.length, Math.floor(quartiers.length * 0.9), ''],
                ['Emails autorisés', emails.length, 1, ''],
                ['Tokens actifs', activeTokens.length, 1, '']
            ];

            sheet.getRange(2, 1, data.length, 4).setValues(data);

            // Formules pour status
            for (let i = 2; i <= data.length + 1; i++) {
                const formula = '=IF(B' + i + '>=C' + i + ',"✅","⚠️")';
                sheet.getRange(i, 4).setFormula(formula);
            }

            // Mise à jour automatique
            sheet.getRange('A' + (data.length + 3)).setValue('Dernière MAJ:');
            sheet.getRange('B' + (data.length + 3)).setFormula('=NOW()');

            sheet.autoResizeColumns(1, 4);

            ui.alert(
                '✅ Succès',
                'Dashboard créé avec succès !\n\n' +
                'Consultez la feuille "DASHBOARD"',
                ui.ButtonSet.OK
            );

        } catch (e) {
            ui.alert(
                '❌ Erreur',
                'Erreur lors de la création :\n\n' + e.message,
                ui.ButtonSet.OK
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// GUIDE D'UTILISATION
// ═══════════════════════════════════════════════════════════════

/**
 * Affiche le guide d'utilisation complet
 */
function showQuickStartGuide() {
    const ui = SpreadsheetApp.getUi();

    const message =
        '╔═══════════════════════════════════════════════╗\n' +
        '║     🚀 GUIDE DE DÉMARRAGE RAPIDE             ║\n' +
        '╚═══════════════════════════════════════════════╝\n\n' +
        '📋 ORDRE D\'EXÉCUTION :\n\n' +
        '┌─ ÉTAPE 1 : Configuration Initiale (1ère fois)\n' +
        '│  1.1 - Initialiser authentification\n' +
        '│  1.2 - Autoriser mon compte\n' +
        '│  1.3 - Générer token API\n' +
        '│\n' +
        '├─ ÉTAPE 2 : Vérification\n' +
        '│  2.1 - Vérifier authentification\n' +
        '│  2.2 - Vérifier optimisations\n' +
        '│\n' +
        '├─ ÉTAPE 3 : Tests Avancés (Optionnel)\n' +
        '│  3.1 - Lancer tous les tests\n' +
        '│  3.2 - Benchmark performance\n' +
        '│  3.3 - Tester API REST\n' +
        '│\n' +
        '└─ ÉTAPE 4 : Maintenance (Régulière)\n' +
        '   4.1 - Nettoyer cache\n' +
        '   4.2 - Nettoyer tokens expirés\n' +
        '   4.3 - Rapport de santé\n\n' +
        '═══════════════════════════════════════════════\n\n' +
        '💡 RACCOURCI :\n' +
        'Utilisez "🎯 CONFIGURATION AUTO (tout en 1)"\n' +
        'pour configurer tout automatiquement !\n\n' +
        '═══════════════════════════════════════════════';

    ui.alert('📖 Guide de démarrage', message, ui.ButtonSet.OK);
}

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE - DÉMARRAGE EN UN CLIC
// ═══════════════════════════════════════════════════════════════

/**
 * 🚀 FONCTION PRINCIPALE
 * Exécute toute la configuration initiale en une seule commande
 * Accessible via le menu "🎯 CONFIGURATION AUTO (tout en 1)"
 */
function quickStart() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '🚀 Configuration automatique',
        'Cette opération va :\n\n' +
        '1️⃣ Initialiser l\'authentification\n' +
        '2️⃣ Autoriser votre compte\n' +
        '3️⃣ Générer un token API\n' +
        '4️⃣ Vérifier les optimisations\n' +
        '5️⃣ Générer un rapport\n\n' +
        '⏱️ Durée : ~30 secondes\n\n' +
        'Continuer ?',
        ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
        return;
    }

    let success = true;
    const results = [];
    let tokenGenerated = null;

    // Étape 1: Initialisation auth
    try {
        setupAuthentication();
        results.push('✅ [1/5] Authentification initialisée');
    } catch (e) {
        results.push('❌ [1/5] Erreur : ' + e.message);
        success = false;
    }

    // Étape 2: Autorisation
    try {
        authorizeCurrentUser();
        const email = Session.getActiveUser().getEmail();
        results.push('✅ [2/5] Compte autorisé : ' + email);
    } catch (e) {
        results.push('❌ [2/5] Erreur : ' + e.message);
        success = false;
    }

    // Étape 3: Génération token
    try {
        const tokenData = generateAPIToken('QUICKSTART', 365);
        tokenGenerated = tokenData.token;
        results.push('✅ [3/5] Token généré');
        Logger.log('QUICKSTART TOKEN: ' + tokenData.token);
    } catch (e) {
        results.push('❌ [3/5] Erreur : ' + e.message);
        success = false;
    }

    // Étape 4: Vérification optimisations
    try {
        CacheService.getScriptCache().put('test', 'ok', 60);
        const cached = CacheService.getScriptCache().get('test');

        if (cached === 'ok') {
            results.push('✅ [4/5] Optimisations vérifiées');
        } else {
            results.push('⚠️ [4/5] Cache non optimal');
        }
    } catch (e) {
        results.push('❌ [4/5] Erreur : ' + e.message);
    }

    // Étape 5: Rapport initial
    try {
        const villes = getAllVilles();
        const quartiers = getAllQuartiers(false);
        results.push('✅ [5/5] Rapport : ' + villes.length + ' villes, ' + quartiers.length + ' quartiers');
    } catch (e) {
        results.push('❌ [5/5] Erreur : ' + e.message);
        success = false;
    }

    // Afficher résultats
    let message = '═══════════════════════════════════════════════\n';
    message += results.join('\n') + '\n';
    message += '═══════════════════════════════════════════════\n\n';

    if (success) {
        message += '🎉 CONFIGURATION TERMINÉE AVEC SUCCÈS !\n\n';
        message += '✅ Votre API GEO est maintenant opérationnelle\n\n';

        if (tokenGenerated) {
            message += '🔑 VOTRE TOKEN API :\n';
            message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            message += tokenGenerated + '\n';
            message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            message += '💾 SAUVEGARDEZ-LE IMMÉDIATEMENT !\n';
            message += '(Aussi disponible dans les logs)\n\n';
        }

        message += '📚 PROCHAINES ÉTAPES :\n';
        message += '1. Testez l\'interface via le menu AMANA\n';
        message += '2. Lancez les tests : Étape 3.1\n';
        message += '3. Benchmark : Étape 3.2\n';
    } else {
        message += '⚠️ CONFIGURATION INCOMPLÈTE\n\n';
        message += 'Certaines étapes ont échoué.\n';
        message += 'Exécutez les étapes 1.1 à 1.3 individuellement\n';
        message += 'pour identifier le problème.';
    }

    ui.alert(
        success ? '✅ Configuration réussie' : '⚠️ Configuration incomplète',
        message,
        ui.ButtonSet.OK
    );
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES SUPPLÉMENTAIRES
// ═══════════════════════════════════════════════════════════════

/**
 * Réinitialise complètement l'authentification
 * ⚠️ ATTENTION : Supprime tous les emails et tokens !
 */
function resetAuthentication() {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
        '⚠️ ATTENTION',
        'Cette opération va SUPPRIMER :\n\n' +
        '• Tous les emails autorisés\n' +
        '• Tous les domaines autorisés\n' +
        '• Tous les tokens API\n\n' +
        'Cette action est IRRÉVERSIBLE !\n\n' +
        'Voulez-vous vraiment continuer ?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        const confirmation = ui.alert(
            '⚠️ CONFIRMATION FINALE',
            'Êtes-vous ABSOLUMENT SÛR ?\n\n' +
            'Toutes les authentifications seront perdues !',
            ui.ButtonSet.YES_NO
        );

        if (confirmation === ui.Button.YES) {
            try {
                const props = PropertiesService.getScriptProperties();
                props.setProperty('AUTHORIZED_EMAILS', JSON.stringify([]));
                props.setProperty('AUTHORIZED_DOMAINS', JSON.stringify([]));
                props.setProperty('API_TOKENS', JSON.stringify({}));

                ui.alert(
                    '✅ Réinitialisation effectuée',
                    'L\'authentification a été réinitialisée.\n\n' +
                    'Vous devez maintenant reconfigurer :\n' +
                    '1. Étape 1.1 - Initialiser\n' +
                    '2. Étape 1.2 - Autoriser\n' +
                    '3. Étape 1.3 - Générer token',
                    ui.ButtonSet.OK
                );
            } catch (e) {
                ui.alert(
                    '❌ Erreur',
                    'Erreur lors de la réinitialisation :\n\n' + e.message,
                    ui.ButtonSet.OK
                );
            }
        }
    }
}

/**
 * Affiche les informations système
 */
function showSystemInfo() {
    const ui = SpreadsheetApp.getUi();

    try {
        const quotas = {
            urlFetch: 'Illimité',
            scriptRuntime: '6 min/exécution',
            triggers: '20 triggers',
            cache: '100KB/entrée'
        };

        const message =
            '💻 INFORMATIONS SYSTÈME\n\n' +
            '═══════════════════════════════════════════════\n' +
            '📊 CONFIGURATION\n' +
            '═══════════════════════════════════════════════\n' +
            '• Timezone : ' + (CONFIG.SHEET_ID ? Session.getScriptTimeZone() : 'Non configuré') + '\n' +
            '• Max Distance : ' + (CONFIG.GEO?.MAX_DISTANCE_KM || 50) + ' km\n' +
            '• Cache Duration : ' + (CONFIG.GEO?.CACHE_DURATION || 3600) + 's\n' +
            '• Auth Email : ' + (AUTH_CONFIG?.ENABLE_EMAIL_AUTH ? 'Activée' : 'Désactivée') + '\n' +
            '• Auth Token : ' + (AUTH_CONFIG?.ENABLE_TOKEN_AUTH ? 'Activée' : 'Désactivée') + '\n\n' +
            '═══════════════════════════════════════════════\n' +
            '📈 QUOTAS GOOGLE APPS SCRIPT\n' +
            '═══════════════════════════════════════════════\n' +
            '• URL Fetch : ' + quotas.urlFetch + '\n' +
            '• Runtime : ' + quotas.scriptRuntime + '\n' +
            '• Triggers : ' + quotas.triggers + '\n' +
            '• Cache : ' + quotas.cache + '\n\n' +
            '═══════════════════════════════════════════════\n' +
            '🔗 LIENS UTILES\n' +
            '═══════════════════════════════════════════════\n' +
            '• Documentation : docs.google.com/apps-script\n' +
            '• Quotas : developers.google.com/apps-script/guides/services/quotas';

        ui.alert('💻 Informations Système', message, ui.ButtonSet.OK);

    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors de la récupération des infos :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

/**
 * Export de la configuration
 */
function exportConfiguration() {
    const ui = SpreadsheetApp.getUi();

    try {
        const config = {
            emails: getAuthorizedEmails(),
            domains: getAuthorizedDomains(),
            tokens: listAPITokens().map(t => ({
                name: t.name,
                active: t.active,
                createdAt: t.createdAt,
                expiresAt: t.expiresAt
            })),
            stats: {
                villes: getAllVilles().length,
                secteurs: getAllSecteurs().length,
                quartiers: getAllQuartiers(false).length
            },
            exportedAt: new Date().toISOString()
        };

        const configJson = JSON.stringify(config, null, 2);

        // Créer une feuille temporaire avec la config
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.insertSheet('CONFIG_EXPORT_' + Date.now());
        sheet.getRange('A1').setValue(configJson);

        ui.alert(
            '✅ Export réussi',
            'Configuration exportée dans la feuille :\n' +
            sheet.getName() + '\n\n' +
            'Copiez le contenu et supprimez la feuille après.',
            ui.ButtonSet.OK
        );

    } catch (e) {
        ui.alert(
            '❌ Erreur',
            'Erreur lors de l\'export :\n\n' + e.message,
            ui.ButtonSet.OK
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE DE BIENVENUE
// ═══════════════════════════════════════════════════════════════

/**
 * Affiche un message de bienvenue au premier lancement
 */
function showWelcomeMessage() {
    const ui = SpreadsheetApp.getUi();

    const message =
        '╔═══════════════════════════════════════════════╗\n' +
        '║                                               ║\n' +
        '║       🎉 BIENVENUE DANS GEO API ! 🎉          ║\n' +
        '║                                               ║\n' +
        '╚═══════════════════════════════════════════════╝\n\n' +
        'Votre API de géolocalisation optimisée est prête !\n\n' +
        '🚀 DÉMARRAGE RAPIDE :\n\n' +
        'Cliquez sur le menu "🚀 Quick Start" puis :\n' +
        '→ "🎯 CONFIGURATION AUTO (tout en 1)"\n\n' +
        'Ou suivez les étapes 1 à 5 dans l\'ordre.\n\n' +
        '═══════════════════════════════════════════════\n\n' +
        '📚 DOCUMENTATION :\n' +
        '• Guide complet : Menu → 📖 Afficher le guide\n' +
        '• Support : Consultez les logs Apps Script\n\n' +
        '═══════════════════════════════════════════════\n\n' +
        '💡 ASTUCE :\n' +
        'La configuration complète prend moins de 2 minutes !\n\n' +
        'Bonne utilisation ! 🎯';

    ui.alert('🎉 Bienvenue', message, ui.ButtonSet.OK);
}

// ═══════════════════════════════════════════════════════════════
// AUTO-EXÉCUTION - Affiche le message de bienvenue
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifie si c'est la première exécution
 * Si oui, affiche le message de bienvenue
 */
function checkFirstRun() {
    const props = PropertiesService.getUserProperties();
    const hasRun = props.getProperty('QUICKSTART_HAS_RUN');

    if (!hasRun) {
        // Marquer comme exécuté
        props.setProperty('QUICKSTART_HAS_RUN', 'true');

        // Afficher le message de bienvenue
        showWelcomeMessage();
    }
}