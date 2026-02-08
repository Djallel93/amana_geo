/**
 * Tests des fonctionnalités de traitement par lot (Batch)
 */

// ========================================
// TESTS BATCH GEOCODE
// ========================================

function testBatchGeocode() {
    console.log('\n========== TEST: Batch Geocode ==========');

    const testAdresses = [
        {
            adresse: '10 Rue de Rivoli',
            ville: 'Paris',
            codePostal: '75001'
        },
        {
            adresse: 'Avenue des Champs-Élysées',
            ville: 'Paris',
            codePostal: '75008'
        },
        {
            adresse: 'Tour Eiffel',
            ville: 'Paris'
        },
        {
            adresse: 'Adresse invalide inexistante xyz123',
            ville: 'Ville Fictive'
        }
    ];

    try {
        const response = BatchService.batchGeocode(testAdresses);
        const result = JSON.parse(response.getContent());

        console.log(`✅ Batch géocodage terminé`);
        console.log(`   Total traité: ${result.totalProcessed}`);
        console.log(`   Succès: ${result.successCount}`);
        console.log(`   Échecs: ${result.failureCount}`);

        console.log('\n📋 Détail des résultats:');
        result.results.forEach((item, idx) => {
            if (item.success) {
                console.log(`   ${idx + 1}. ✅ ${item.input.adresse}`);
                console.log(`      Coords: [${item.result.coordinates.latitude}, ${item.result.coordinates.longitude}]`);
            } else {
                console.log(`   ${idx + 1}. ❌ ${item.input.adresse}`);
                console.log(`      Erreur: ${item.error || item.result.error}`);
            }
        });

        return { success: true, result };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TESTS BATCH RESOLVE LOCATION
// ========================================

function testBatchResolveLocation() {
    console.log('\n========== TEST: Batch Resolve Location ==========');

    // Coordonnées de test - ADAPTEZ selon vos données réelles
    const testCoordinates = [
        { lat: 48.8566, lng: 2.3522 },  // Paris centre
        { lat: 48.8606, lng: 2.3376 },  // Arc de Triomphe
        { lat: 48.8584, lng: 2.2945 },  // Tour Eiffel
        { lat: 48.8738, lng: 2.2950 }   // La Défense
    ];

    try {
        const response = BatchService.batchResolveLocation(testCoordinates);
        const result = JSON.parse(response.getContent());

        console.log(`✅ Batch résolution terminé`);
        console.log(`   Total traité: ${result.totalProcessed}`);
        console.log(`   Succès: ${result.successCount}`);
        console.log(`   Échecs: ${result.failureCount}`);

        console.log('\n📋 Détail des résultats:');
        result.results.forEach((item, idx) => {
            if (item.success) {
                console.log(`   ${idx + 1}. ✅ [${item.input.lat}, ${item.input.lng}]`);
                console.log(`      Ville: ${item.result.ville.nom}`);
                console.log(`      Secteur: ${item.result.secteur.nom}`);
                console.log(`      Quartier: ${item.result.quartier.nom}`);
            } else {
                console.log(`   ${idx + 1}. ❌ [${item.input.lat}, ${item.input.lng}]`);
                console.log(`      Erreur: ${item.error}`);
            }
        });

        return { success: true, result };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TESTS BATCH CALCULATE DISTANCE
// ========================================

function testBatchCalculateDistance() {
    console.log('\n========== TEST: Batch Calculate Distance ==========');

    // Point de référence: Tour Eiffel
    const reference = { lat: 48.8584, lng: 2.2945 };

    // Points à mesurer
    const testCoordinates = [
        { lat: 48.8566, lng: 2.3522, label: 'Notre-Dame' },
        { lat: 48.8606, lng: 2.3376, label: 'Arc de Triomphe' },
        { lat: 48.8738, lng: 2.2950, label: 'La Défense' },
        { lat: 48.8530, lng: 2.3499, label: 'Bastille' }
    ];

    try {
        const response = BatchService.batchCalculateDistance(testCoordinates, reference);
        const result = JSON.parse(response.getContent());

        console.log(`✅ Batch distance terminé`);
        console.log(`   Référence: [${result.reference.latitude}, ${result.reference.longitude}]`);
        console.log(`   Total traité: ${result.totalProcessed}`);
        console.log(`   Succès: ${result.successCount}`);

        console.log('\n📋 Distances calculées:');
        result.results.forEach((item, idx) => {
            if (item.success) {
                const label = testCoordinates[idx].label || 'Point';
                console.log(`   ${idx + 1}. ${label}: ${item.distance} km`);
            } else {
                console.log(`   ${idx + 1}. ❌ Erreur: ${item.error}`);
            }
        });

        // Tri par distance
        const sorted = [...result.results].sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        console.log('\n📊 Classement par distance:');
        sorted.forEach((item, idx) => {
            if (item.success) {
                const label = testCoordinates[item.index].label || 'Point';
                console.log(`   ${idx + 1}. ${label}: ${item.distance} km`);
            }
        });

        return { success: true, result };
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        console.log(e.stack);
        return { success: false, error: e.message };
    }
}

// ========================================
// TEST DE LIMITE BATCH
// ========================================

function testBatchLimit() {
    console.log('\n========== TEST: Limite Batch ==========');

    // Créer plus que la limite autorisée
    const maxItems = CONFIG.BATCH.MAX_ITEMS;
    console.log(`Limite configurée: ${maxItems} items`);

    const tooManyItems = [];
    for (let i = 0; i < maxItems + 10; i++) {
        tooManyItems.push({ lat: 48.8566, lng: 2.3522 });
    }

    try {
        const response = BatchService.batchResolveLocation(tooManyItems);
        const result = JSON.parse(response.getContent());

        if (result.error && result.error.code === 'BATCH_LIMIT_EXCEEDED') {
            console.log(`✅ Limite correctement appliquée`);
            console.log(`   Message: ${result.error.message}`);
            return { success: true };
        } else {
            console.log(`❌ La limite n'a pas été appliquée!`);
            return { success: false, error: 'Limite non appliquée' };
        }
    } catch (e) {
        console.log(`❌ ERREUR: ${e.message}`);
        return { success: false, error: e.message };
    }
}

// ========================================
// TEST DE PERFORMANCE
// ========================================

function testBatchPerformance() {
    console.log('\n========== TEST: Performance Batch ==========');

    const sizes = [10, 25, 50];

    sizes.forEach(size => {
        console.log(`\n📊 Test avec ${size} items:`);

        const coords = [];
        for (let i = 0; i < size; i++) {
            coords.push({
                lat: 48.8566 + (Math.random() - 0.5) * 0.1,
                lng: 2.3522 + (Math.random() - 0.5) * 0.1
            });
        }

        const start = new Date().getTime();
        try {
            const response = BatchService.batchResolveLocation(coords);
            const end = new Date().getTime();
            const duration = (end - start) / 1000;

            const result = JSON.parse(response.getContent());

            console.log(`   Durée: ${duration.toFixed(2)}s`);
            console.log(`   Succès: ${result.successCount}/${size}`);
            console.log(`   Temps moyen par item: ${(duration / size).toFixed(3)}s`);
        } catch (e) {
            console.log(`   ❌ Erreur: ${e.message}`);
        }
    });
}

// ========================================
// SUITE DE TESTS BATCH COMPLÈTE
// ========================================

function runBatchTests() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   GEO API v5.1 - TESTS BATCH PROCESSING   ║');
    console.log('╚═══════════════════════════════════════════╝');

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    // Test 1: Batch Geocode
    results.total++;
    console.log('\n1️⃣  Test Batch Geocode...');
    const t1 = testBatchGeocode();
    if (t1.success) results.passed++; else { results.failed++; results.errors.push('BatchGeocode: ' + t1.error); }

    // Test 2: Batch Resolve
    results.total++;
    console.log('\n2️⃣  Test Batch Resolve Location...');
    const t2 = testBatchResolveLocation();
    if (t2.success) results.passed++; else { results.failed++; results.errors.push('BatchResolve: ' + t2.error); }

    // Test 3: Batch Distance
    results.total++;
    console.log('\n3️⃣  Test Batch Calculate Distance...');
    const t3 = testBatchCalculateDistance();
    if (t3.success) results.passed++; else { results.failed++; results.errors.push('BatchDistance: ' + t3.error); }

    // Test 4: Limite
    results.total++;
    console.log('\n4️⃣  Test Limite Batch...');
    const t4 = testBatchLimit();
    if (t4.success) results.passed++; else { results.failed++; results.errors.push('BatchLimit: ' + t4.error); }

    // Test 5: Performance
    console.log('\n5️⃣  Test Performance...');
    testBatchPerformance();

    // Résumé
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║         RÉSUMÉ DES TESTS BATCH            ║');
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