/**
 * Fonctions de test pour le projet GEO
 * Permet de tester toutes les fonctionnalités
 */

/**
 * Test complet du géocodage
 */
function testGeocodage() {
  console.log('========== TEST GÉOCODAGE ==========');

  // Test 1: Adresse valide
  console.log('\n--- Test 1: Adresse valide ---');
  const result1 = geocodeAddress('34 Rue de la Paix, 44000 Nantes');
  console.log(JSON.stringify(result1, null, 2));

  // Test 2: Adresse invalide
  console.log('\n--- Test 2: Adresse invalide ---');
  const result2 = geocodeAddress('adressebidonquinexistepas123456');
  console.log(JSON.stringify(result2, null, 2));

  // Test 3: Validation d'adresse
  console.log('\n--- Test 3: Validation ---');
  const isValid = validateAddress('1 Place Bellecour, 69002 Lyon');
  console.log(`Adresse valide: ${isValid}`);

  // Test 4: Géocodage inversé
  console.log('\n--- Test 4: Géocodage inversé ---');
  const result4 = reverseGeocode(47.2173, -1.5536);
  console.log(JSON.stringify(result4, null, 2));

  console.log('\n✅ Tests géocodage terminés');
}

/**
 * Test des calculs de distance
 */
function testDistances() {
  console.log('========== TEST DISTANCES ==========');

  // Test 1: Distance simple
  console.log('\n--- Test 1: Distance simple ---');
  const distance = calculateDistance(
    48.8566, 2.3522,  // Paris
    47.2173, -1.5536  // Nantes
  );
  console.log(`Distance Paris-Nantes: ${distance} km`);

  // Test 2: Distances multiples
  console.log('\n--- Test 2: Distances multiples ---');
  const destinations = [
    { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
    { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
    { name: 'Bordeaux', lat: 44.8378, lng: -0.5792 }
  ];

  const distances = calculateDistances(48.8566, 2.3522, destinations);
  distances.forEach(d => {
    console.log(`${d.name}: ${d.distance} km`);
  });

  // Test 3: Point le plus proche
  console.log('\n--- Test 3: Point le plus proche ---');
  const nearest = findNearestPoint(48.8566, 2.3522, destinations);

  if (nearest) {
    console.log(`✅ Point found: ${nearest.name} (${nearest.distance} km)`);
  } else {
    console.log('⚠️ No points found');
  }

  // Test 4: Centroïde
  console.log('\n--- Test 4: Centroïde ---');
  const centroid = calculateCentroid(destinations);
  console.log(`Centroïde: ${centroid.latitude}, ${centroid.longitude}`);

  console.log('\n✅ Tests distances terminés');
}

/**
 * Test de la recherche de quartiers
 */
function testQuartiers() {
  console.log('========== TEST QUARTIERS ==========');

  // Test 1: Récupérer tous les quartiers
  console.log('\n--- Test 1: Tous les quartiers ---');
  const allQuartiers = getAllQuartiers();
  console.log(`${allQuartiers.length} quartiers en base`);
  if (allQuartiers.length > 0) {
    console.log(`Premier quartier: ${JSON.stringify(allQuartiers[0], null, 2)}`);
  }

  // Test 2: Trouver quartier le plus proche
  console.log('\n--- Test 2: Quartier le plus proche ---');
  if (allQuartiers.length > 0) {
    // Utiliser les coordonnées de Nantes comme exemple
    const nearest = findNearestQuartier(47.2173, -1.5536);
    if (nearest) {
      console.log(`Quartier trouvé: ${nearest.quartierName} à ${nearest.distance} km`);
    } else {
      console.log('Aucun quartier trouvé dans le rayon');
    }
  }

  // Test 3: Quartiers dans un rayon
  console.log('\n--- Test 3: Quartiers dans rayon 10km ---');
  if (allQuartiers.length > 0) {
    const inRadius = findQuartiersInRadius(47.2173, -1.5536, 10);
    console.log(`${inRadius.length} quartiers trouvés dans 10 km`);
    inRadius.slice(0, 3).forEach(q => {
      console.log(`- ${q.quartierName}: ${q.distance} km`);
    });
  }

  console.log('\n✅ Tests quartiers terminés');
}

/**
 * Test des villes
 */
function testVilles() {
  console.log('========== TEST VILLES ==========');

  // Test 1: Récupérer toutes les villes
  console.log('\n--- Test 1: Toutes les villes ---');
  const allVilles = getAllVilles();
  console.log(`${allVilles.length} villes en base`);
  if (allVilles.length > 0) {
    console.log(`Première ville: ${JSON.stringify(allVilles[0], null, 2)}`);
  }

  // Test 2: Recherche par code postal
  console.log('\n--- Test 2: Recherche par code postal ---');
  const villesByCP = getVillesByCodePostal('44000');
  console.log(`${villesByCP.length} ville(s) avec code postal 44000`);

  // Test 3: Recherche par nom
  console.log('\n--- Test 3: Recherche par nom ---');
  const villesByName = searchVillesByName('Nantes');
  console.log(`${villesByName.length} ville(s) contenant "Nantes"`);

  console.log('\n✅ Tests villes terminés');
}

/**
 * Test de l'API endpoint (simulation)
 */
function testAPIEndpoint() {
  console.log('========== TEST API ENDPOINT ==========');

  try {
    // Test 1: Géocodage via API
    console.log('\n--- Test 1: Géocodage via API ---');
    const mockRequest1 = {
      parameter: {
        action: 'geocode',
        address: '1 Place Bellecour, 69002 Lyon'
      }
    };

    const response1 = doGet(mockRequest1);
    console.log(response1.getContent());

    // Test 2: Trouver quartier
    console.log('\n--- Test 2: Trouver quartier via API ---');
    const mockRequest2 = {
      parameter: {
        action: 'findquartier',
        lat: '47.2173',
        lng: '-1.5536'
      }
    };

    const response2 = doGet(mockRequest2);
    console.log(response2.getContent());

    // Test 3: Ping
    console.log('\n--- Test 3: Ping API ---');
    const mockRequest3 = {
      parameter: {
        action: 'ping'
      }
    };

    const response3 = doGet(mockRequest3);
    console.log(response3.getContent());

    console.log('\n✅ Tests API terminés');
  } catch (e) {
    console.log(`❌ Erreur: ${e.message}`);
  }
}
/**
 * Test du cache
 */
function testCache() {
  console.log('========== TEST CACHE ==========');

  // Test 1: Mise en cache
  console.log('\n--- Test 1: Mise en cache ---');
  const testData = { message: 'Test cache', timestamp: new Date().toISOString() };
  setCache('test_key', testData, 600);
  console.log('Données mises en cache');

  // Test 2: Récupération du cache
  console.log('\n--- Test 2: Récupération ---');
  const cached = getCache('test_key');
  console.log(`Données récupérées: ${JSON.stringify(cached)}`);

  // Test 3: Cache miss
  console.log('\n--- Test 3: Cache miss ---');
  const notCached = getCache('key_inexistante');
  console.log(`Résultat: ${notCached}`);

  console.log('\n✅ Tests cache terminés');
}

/**
 * Test complet de création de données
 */
function testCreateData() {
  console.log('========== TEST CRÉATION DONNÉES ==========');

  try {
    // Test 1: Créer une ville
    console.log('\n--- Test 1: Créer une ville ---');
    const ville = createVille({
      nom: 'Nantes',
      codePostal: '44000',
      departement: 'Loire-Atlantique',
      pays: 'France'
    });
    console.log(`Ville créée: ${JSON.stringify(ville)}`);

    // Test 2: Créer un secteur
    console.log('\n--- Test 2: Créer un secteur ---');
    const secteur = createSecteur({
      nom: 'Centre',
      idVille: ville.id
    });
    console.log(`Secteur créé: ${JSON.stringify(secteur)}`);

    // Test 3: Créer un quartier
    console.log('\n--- Test 3: Créer un quartier ---');
    const quartier = createQuartier({
      nom: 'Centre-Ville',
      latitude: 47.2173,
      longitude: -1.5536,
      idSecteur: secteur.id
    });
    console.log(`Quartier créé: ${JSON.stringify(quartier)}`);

    console.log('\n✅ Tests création terminés');

  } catch (e) {
    console.log(`❌ Erreur: ${e.message}`);
  }
}

/**
 * Test de géocodage batch
 */
function testBatchGeocode() {
  console.log('========== TEST BATCH GÉOCODAGE ==========');

  const addresses = [
    '1 Place Bellecour, Lyon',
    '1 Rue de la République, Marseille',
    'Place du Capitole, Toulouse',
    'Place Stanislas, Nancy',
    'Grand Place, Lille'
  ];

  console.log(`Géocodage de ${addresses.length} adresses...`);

  const results = geocodeAddressesBatch(addresses);

  results.forEach(result => {
    if (result.isValid) {
      console.log(`✅ ${result.address}`);
      console.log(`   → ${result.coordinates.latitude}, ${result.coordinates.longitude}`);
    } else {
      console.log(`❌ ${result.address}: ${result.error}`);
    }
  });

  console.log('\n✅ Test batch terminé');
}

/**
 * Test de géocodage d'un quartier
 */
function testGeocodeQuartier() {
  console.log('========== TEST GÉOCODAGE QUARTIER ==========');

  // Récupérer le premier quartier
  const quartiers = getAllQuartiers();

  if (quartiers.length === 0) {
    console.log('⚠️ Aucun quartier en base pour tester');
    return;
  }

  const quartier = quartiers[0];
  console.log(`Test avec quartier: ${quartier.nom} (ID: ${quartier.id})`);

  try {
    const result = geocodeQuartier(quartier.id);
    console.log(`Résultat: ${JSON.stringify(result, null, 2)}`);
    console.log('\n✅ Géocodage quartier réussi');
  } catch (e) {
    console.log(`❌ Erreur: ${e.message}`);
  }
}

/**
 * Test de performance
 */
function testPerformance() {
  console.log('========== TEST PERFORMANCE ==========');

  // Test 1: Géocodage sans cache
  console.log('\n--- Test 1: Géocodage (premier appel) ---');
  const start1 = new Date().getTime();
  geocodeAddress('1 Place Bellecour, Lyon');
  const duration1 = new Date().getTime() - start1;
  console.log(`Durée: ${duration1}ms`);

  // Test 2: Géocodage avec cache
  console.log('\n--- Test 2: Géocodage (avec cache) ---');
  const start2 = new Date().getTime();
  geocodeAddress('1 Place Bellecour, Lyon');
  const duration2 = new Date().getTime() - start2;
  console.log(`Durée: ${duration2}ms`);
  console.log(`Amélioration: ${Math.round((1 - duration2 / duration1) * 100)}%`);

  // Test 3: Calcul de distances multiples
  console.log('\n--- Test 3: 100 calculs de distance ---');
  const destinations = [];
  for (let i = 0; i < 100; i++) {
    destinations.push({
      lat: 45 + Math.random() * 5,
      lng: -2 + Math.random() * 5
    });
  }

  const start3 = new Date().getTime();
  calculateDistances(47.2173, -1.5536, destinations);
  const duration3 = new Date().getTime() - start3;
  console.log(`Durée pour 100 calculs: ${duration3}ms`);
  console.log(`Moyenne: ${(duration3 / 100).toFixed(2)}ms par calcul`);

  console.log('\n✅ Tests performance terminés');
}

/**
 * Initialise des données de test dans les sheets
 */
function initTestData() {
  console.log('========== INITIALISATION DONNÉES TEST ==========');

  try {
    // Créer quelques villes
    console.log('\n📍 Création des villes...');
    const villes = [
      { nom: 'Nantes', codePostal: '44000', departement: 'Loire-Atlantique', pays: 'France' },
      { nom: 'Saint-Nazaire', codePostal: '44600', departement: 'Loire-Atlantique', pays: 'France' },
      { nom: 'Rezé', codePostal: '44400', departement: 'Loire-Atlantique', pays: 'France' }
    ];

    const villesCreated = [];
    villes.forEach(v => {
      const ville = createVille(v);
      villesCreated.push(ville);
      console.log(`✅ ${ville.nom} créée (ID: ${ville.id})`);
    });

    // Créer des secteurs pour chaque ville
    console.log('\n📍 Création des secteurs...');
    const secteurNames = ['Centre', 'Nord', 'Sud', 'Est', 'Ouest'];
    const secteursCreated = [];

    villesCreated.forEach(ville => {
      secteurNames.forEach(nom => {
        const secteur = createSecteur({
          nom: nom,
          idVille: ville.id
        });
        secteursCreated.push(secteur);
        console.log(`✅ ${ville.nom} - ${nom} créé (ID: ${secteur.id})`);
      });
    });

    // Créer quelques quartiers de test
    console.log('\n📍 Création des quartiers...');
    const quartiers = [
      { nom: 'Bouffay', lat: 47.2121, lng: -1.5555, secteurId: secteursCreated[0].id },
      { nom: 'Graslin', lat: 47.2135, lng: -1.5656, secteurId: secteursCreated[0].id },
      { nom: 'Île de Nantes', lat: 47.2058, lng: -1.5447, secteurId: secteursCreated[1].id },
      { nom: 'Chantenay', lat: 47.2059, lng: -1.5894, secteurId: secteursCreated[4].id }
    ];

    quartiers.forEach(q => {
      const quartier = createQuartier({
        nom: q.nom,
        latitude: q.lat,
        longitude: q.lng,
        idSecteur: q.secteurId
      });
      console.log(`✅ ${quartier.nom} créé (ID: ${quartier.id})`);
    });

    console.log('\n✅ Initialisation terminée avec succès !');
    console.log(`${villesCreated.length} villes, ${secteursCreated.length} secteurs, ${quartiers.length} quartiers`);

  } catch (e) {
    console.log(`❌ Erreur lors de l'initialisation: ${e.message}`);
  }
}

/**
 * Lance tous les tests
 */
function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   SUITE DE TESTS COMPLÈTE - GEO API   ║');
  console.log('╚════════════════════════════════════════╝\n');

  testCache();
  testDistances();
  testGeocodage();
  testVilles();
  testQuartiers();
  testAPIEndpoint();
  testPerformance();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║      TOUS LES TESTS SONT TERMINÉS      ║');
  console.log('╚════════════════════════════════════════╝');
}

/**
 * Nettoie toutes les données de test
 */
function cleanTestData() {
  console.log('⚠️ ATTENTION: Cette fonction va supprimer TOUTES les données !');
  console.log('Commentez cette ligne si vous êtes sûr:');
  return;

  // Décommenter pour exécuter
  /*
  const sheets = [CONFIG.SHEETS.QUARTIERS, CONFIG.SHEETS.SECTEURS, CONFIG.SHEETS.VILLES];
  
  sheets.forEach(sheetName => {
    const sheet = getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
      console.log(`✅ ${sheetName} nettoyé`);
    }
  });
  
  console.log('✅ Nettoyage terminé');
  */
}