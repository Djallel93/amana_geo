/**
 * Fonctions de test pour GEO API v5.0
 */

// ========================================
// TESTS DE CHARGEMENT DES DONNÉES
// ========================================

function testLoadVilles() {
    console.log('\n========== TEST: Chargement Villes ==========');

    try {
        const villes = DataService.loadAll('VILLES');

        console.log(`✅ ${villes.length} villes chargées`);

        if (villes.length > 0) {
            console.log('\n📋 Première ville:');
            console.log(JSON.stringify(villes[0], null, 2));

            // Vérifier la structure
            const v = villes[0];
            console.log('\n🔍 Validation structure:');
            console.log(`  - ID: ${v.id ? '✅' : '❌'}`);
            console.log(`  - Nom: ${v.nom ? '✅' : '❌'}`);
            console.log(`  - Polygon: ${v.polygon ? '✅' : '❌'}`);
            console.log(`  - Code Postal: ${v.codePostal ? '✅' : '❌'}`);
            console.log(`  - Département: ${v.departement ? '✅' : '❌'}`);
        }

        return { success: true, count: villes.length };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

function testLoadSecteurs() {
    console.log('\n========== TEST: Chargement Secteurs ==========');

    try {
        const secteurs = DataService.loadAll('SECTEURS');

        console.log(`✅ ${secteurs.length} secteurs chargés`);

        if (secteurs.length > 0) {
            console.log('\n📋 Premier secteur:');
            console.log(JSON.stringify(secteurs[0], null, 2));

            // Vérifier la structure
            const s = secteurs[0];
            console.log('\n🔍 Validation structure:');
            console.log(`  - ID: ${s.id ? '✅' : '❌'}`);
            console.log(`  - Nom: ${s.nom ? '✅' : '❌'}`);
            console.log(`  - Polygon: ${s.polygon === undefined ? '✅ pas de polygon (normal)' : '⚠️ polygon présent (devrait être absent)'}`);
            console.log(`  - ID Ville: ${s.idVille ? '✅' : '❌'}`);

            // Vérifier que la ville existe
            const ville = DataService.findById('VILLES', s.idVille);
            console.log(`  - Ville existe: ${ville ? '✅ ' + ville.nom : '❌'}`);
        }

        return { success: true, count: secteurs.length };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

function testLoadQuartiers() {
    console.log('\n========== TEST: Chargement Quartiers ==========');

    try {
        const quartiers = DataService.loadAll('QUARTIERS');

        console.log(`✅ ${quartiers.length} quartiers chargés`);

        if (quartiers.length > 0) {
            console.log('\n📋 Premier quartier:');
            console.log(JSON.stringify(quartiers[0], null, 2));

            // Vérifier la structure
            const q = quartiers[0];
            console.log('\n🔍 Validation structure:');
            console.log(`  - ID: ${q.id ? '✅' : '❌'}`);
            console.log(`  - Nom: ${q.nom ? '✅' : '❌'}`);
            console.log(`  - Polygon: ${q.polygon ? '✅' : '❌'}`);
            console.log(`  - ID Secteur: ${q.idSecteur ? '✅' : '❌'}`);

            // Vérifier que le secteur existe
            const secteur = DataService.findById('SECTEURS', q.idSecteur);
            console.log(`  - Secteur existe: ${secteur ? '✅ ' + secteur.nom : '❌'}`);

            if (secteur) {
                const ville = DataService.findById('VILLES', secteur.idVille);
                console.log(`  - Ville existe: ${ville ? '✅ ' + ville.nom : '❌'}`);
            }
        }

        return { success: true, count: quartiers.length };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TESTS DE HIÉRARCHIE
// ========================================

function testHierarchy() {
    console.log('\n========== TEST: Hiérarchie Complète ==========');

    try {
        const hierarchy = DataService.loadHierarchy();

        console.log(`✅ Hiérarchie chargée avec succès`);
        console.log(`  - ${hierarchy.villes.length} villes`);
        console.log(`  - ${hierarchy.secteurs.length} secteurs`);
        console.log(`  - ${hierarchy.quartiers.length} quartiers`);

        // Vérifier les enrichissements
        if (hierarchy.quartiers.length > 0) {
            const q = hierarchy.quartiers[0];
            console.log('\n📋 Premier quartier enrichi:');
            console.log(`  - ID: ${q.id}`);
            console.log(`  - Nom: ${q.nom}`);
            console.log(`  - Secteur: ${q.secteurNom || '❌ manquant'}`);
            console.log(`  - Ville: ${q.villeNom || '❌ manquant'}`);
            console.log(`  - Code Postal: ${q.codePostal || '❌ manquant'}`);
        }

        // Statistiques par ville
        console.log('\n📊 Distribution par ville:');
        const villeStats = {};

        hierarchy.secteurs.forEach(s => {
            if (!villeStats[s.idVille]) {
                villeStats[s.idVille] = { nom: s.villeNom, secteurs: 0, quartiers: 0 };
            }
            villeStats[s.idVille].secteurs++;
        });

        hierarchy.quartiers.forEach(q => {
            if (villeStats[q.idVille]) {
                villeStats[q.idVille].quartiers++;
            }
        });

        Object.entries(villeStats).forEach(([id, stats]) => {
            console.log(`  ${stats.nom}: ${stats.secteurs} secteurs, ${stats.quartiers} quartiers`);
        });

        return { success: true, hierarchy };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TESTS DE RÉSOLUTION
// ========================================

function testResolveLocation(lat, lng) {
    console.log(`\n========== TEST: Résolution Location [${lat}, ${lng}] ==========`);

    try {
        const result = GeocodingService.resolveLocation(lat, lng);

        console.log(`✅ Résolution réussie`);
        console.log(`\n📍 Résultat:`);
        console.log(`  Ville: ${result.ville.nom} (${result.ville.codePostal})`);
        console.log(`  Secteur: ${result.secteur.nom}`);
        console.log(`  Quartier: ${result.quartier.nom}`);
        console.log(`  Méthode: ${result.resolutionMethod}`);

        return { success: true, result };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TESTS DE GÉOCODAGE
// ========================================

function testGeocode(adresse, ville, codePostal) {
    console.log(`\n========== TEST: Géocodage ==========`);
    console.log(`Adresse: ${adresse}`);
    console.log(`Ville: ${ville || 'non spécifiée'}`);
    console.log(`Code Postal: ${codePostal || 'non spécifié'}`);

    try {
        const result = GeocodingService.geocodeAddress(adresse, ville, codePostal);

        if (result.isValid) {
            console.log(`✅ Géocodage réussi`);
            console.log(`  Exists: ${result.exists}`);
            console.log(`  Coordonnées: ${result.coordinates.latitude}, ${result.coordinates.longitude}`);
            console.log(`  Adresse formatée: ${result.formattedAddress}`);
        } else {
            console.log(`❌ Géocodage échoué: ${result.error}`);
        }

        return { success: result.isValid, result };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TESTS DE VALIDATION
// ========================================

function testValidations() {
    console.log('\n========== TEST: Validations ==========');

    try {
        // Test avec IDs existants (vous devrez ajuster selon vos données)
        console.log('\n🔍 Test validation ville:');
        const villes = DataService.loadAll('VILLES');
        if (villes.length > 0) {
            const villeResult = GeocodingService.validateVille(villes[0].id);
            console.log(`  ID ${villes[0].id}: ${villeResult.exists ? '✅ existe' : '❌ n\'existe pas'}`);
        }

        console.log('\n🔍 Test validation secteur:');
        const secteurs = DataService.loadAll('SECTEURS');
        if (secteurs.length > 0) {
            const secteurResult = GeocodingService.validateSecteur(secteurs[0].id);
            console.log(`  ID ${secteurs[0].id}: ${secteurResult.exists ? '✅ existe' : '❌ n\'existe pas'}`);
        }

        console.log('\n🔍 Test validation quartier:');
        const quartiers = DataService.loadAll('QUARTIERS');
        if (quartiers.length > 0) {
            const quartierResult = GeocodingService.validateQuartier(quartiers[0].id);
            console.log(`  ID ${quartiers[0].id}: ${quartierResult.exists ? '✅ existe' : '❌ n\'existe pas'}`);
        }

        // Test avec ID inexistant
        console.log('\n🔍 Test validation ID inexistant:');
        const fakeResult = GeocodingService.validateVille('ID_INEXISTANT_999');
        console.log(`  ID inexistant: ${fakeResult.exists ? '❌ BUG: devrait être false' : '✅ existe = false'}`);

        return { success: true };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TESTS DE POLYGONES
// ========================================

function testPolygonRemoval() {
    console.log('\n========== TEST: Suppression Polygones ==========');

    try {
        const villes = DataService.loadAll('VILLES');
        const villesNoPolygon = DataService.stripPolygons(villes);

        console.log(`✅ ${villes.length} villes traitées`);

        if (villesNoPolygon.length > 0) {
            const hasPolygon = villesNoPolygon.some(v => v.polygon !== undefined);
            console.log(`  Polygones supprimés: ${!hasPolygon ? '✅' : '❌ ERREUR'}`);

            console.log('\n📋 Exemple ville sans polygon:');
            console.log(JSON.stringify(villesNoPolygon[0], null, 2));
        }

        return { success: true };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// SUITE DE TESTS COMPLÈTE
// ========================================

function runAllTests() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  GEO API v5.0 - SUITE DE TESTS COMPLÈTE  ║');
    console.log('╚═══════════════════════════════════════════╝');

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    // Test 1: Chargement villes
    results.total++;
    const t1 = testLoadVilles();
    if (t1.success) results.passed++; else { results.failed++; results.errors.push('LoadVilles: ' + t1.error); }

    // Test 2: Chargement secteurs
    results.total++;
    const t2 = testLoadSecteurs();
    if (t2.success) results.passed++; else { results.failed++; results.errors.push('LoadSecteurs: ' + t2.error); }

    // Test 3: Chargement quartiers
    results.total++;
    const t3 = testLoadQuartiers();
    if (t3.success) results.passed++; else { results.failed++; results.errors.push('LoadQuartiers: ' + t3.error); }

    // Test 4: Hiérarchie
    results.total++;
    const t4 = testHierarchy();
    if (t4.success) results.passed++; else { results.failed++; results.errors.push('Hierarchy: ' + t4.error); }

    // Test 5: Validations
    results.total++;
    const t5 = testValidations();
    if (t5.success) results.passed++; else { results.failed++; results.errors.push('Validations: ' + t5.error); }

    // Test 6: Suppression polygones
    results.total++;
    const t6 = testPolygonRemoval();
    if (t6.success) results.passed++; else { results.failed++; results.errors.push('PolygonRemoval: ' + t6.error); }

    // Résumé
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║            RÉSUMÉ DES TESTS               ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`Total: ${results.total}`);
    console.log(`✅ Réussis: ${results.passed}`);
    console.log(`❌ Échoués: ${results.failed}`);

    if (results.errors.length > 0) {
        console.log('\n⚠️ Erreurs détectées:');
        results.errors.forEach(err => console.log(`  - ${err}`));
    }

    return results;
}

// ========================================
// TESTS INDIVIDUELS RAPIDES
// ========================================

function quickTestData() {
    console.log('\n========== QUICK TEST: Données ==========');
    runAllTests();
}

function quickTestGeocode() {
    console.log('\n========== QUICK TEST: Géocodage ==========');
    // Exemple - adaptez selon vos données
    testGeocode('10 rue de Rivoli', 'Paris', '75001');
}

function quickTestResolve() {
    console.log('\n========== QUICK TEST: Résolution ==========');
    // Exemple - adaptez selon vos coordonnées
    // Paris: 48.8566, 2.3522
    testResolveLocation(48.8566, 2.3522);
}