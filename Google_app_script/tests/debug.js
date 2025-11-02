/**
 * Inspecte le contenu brut du Google Sheet "villes"
 */
function debugSheetRawContent() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     INSPECTION BRUTE DU GOOGLE SHEET "villes"           ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        console.log(`\n✅ Spreadsheet ouvert: "${ss.getName()}"`);

        const sheet = ss.getSheetByName('villes');
        
        if (!sheet) {
            console.log('\n❌ ERREUR: Feuille "villes" introuvable!');
            console.log('\n📋 Feuilles disponibles:');
            ss.getSheets().forEach(s => console.log(`   - ${s.getName()}`));
            return;
        }

        console.log(`\n✅ Feuille "villes" trouvée`);

        const data = sheet.getDataRange().getValues();
        console.log(`\n📊 Dimensions:`);
        console.log(`   Lignes: ${data.length}`);
        console.log(`   Colonnes: ${data[0]?.length || 0}`);

        // Afficher l'en-tête
        console.log('\n📋 EN-TÊTE (première ligne):');
        if (data.length > 0) {
            data[0].forEach((header, index) => {
                const letter = String.fromCharCode(65 + index); // A, B, C, etc.
                console.log(`   Colonne ${letter} (index ${index}): "${header}"`);
            });
        }

        // Configuration attendue
        console.log('\n⚙️  CONFIGURATION (config.js):');
        console.log(`   VILLES.ID: ${CONFIG.COLUMNS.VILLES.ID} (attendu: colonne A)`);
        console.log(`   VILLES.NOM: ${CONFIG.COLUMNS.VILLES.NOM} (attendu: colonne B)`);
        console.log(`   VILLES.POLYGON: ${CONFIG.COLUMNS.VILLES.POLYGON} (attendu: colonne C)`);
        console.log(`   VILLES.CODE_POSTAL: ${CONFIG.COLUMNS.VILLES.CODE_POSTAL} (attendu: colonne D)`);
        console.log(`   VILLES.DEPARTEMENT: ${CONFIG.COLUMNS.VILLES.DEPARTEMENT} (attendu: colonne E)`);

        // Vérifier la correspondance
        console.log('\n🔍 VÉRIFICATION CORRESPONDANCE:');
        const expectedHeaders = ['id', 'nom', 'polygon', 'codePostal', 'departement'];
        let mismatch = false;

        expectedHeaders.forEach((expected, index) => {
            const actual = data[0]?.[index]?.toString().toLowerCase().trim();
            const match = actual === expected.toLowerCase();
            const icon = match ? '✅' : '❌';
            console.log(`   ${icon} Colonne ${index}: attendu "${expected}", trouvé "${data[0]?.[index]}"`);
            if (!match) mismatch = true;
        });

        if (mismatch) {
            console.log('\n⚠️  ATTENTION: Les en-têtes ne correspondent pas à la configuration!');
        }

        // Afficher les 3 premières lignes de données
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('CONTENU DES 3 PREMIÈRES LIGNES:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
            const row = data[i];
            console.log(`\n🏙️  LIGNE ${i}:`);

            // Colonne A: ID
            console.log(`   Colonne A (ID):`);
            console.log(`      Valeur: "${row[0]}"`);
            console.log(`      Type: ${typeof row[0]}`);
            console.log(`      Vide: ${!row[0] ? '❌ OUI' : '✅ NON'}`);

            // Colonne B: Nom
            console.log(`   Colonne B (Nom):`);
            console.log(`      Valeur: "${row[1]}"`);
            console.log(`      Type: ${typeof row[1]}`);
            console.log(`      Vide: ${!row[1] ? '❌ OUI' : '✅ NON'}`);

            // Colonne C: Polygon (LE PLUS IMPORTANT)
            console.log(`   Colonne C (Polygon):`);
            console.log(`      Type: ${typeof row[2]}`);
            console.log(`      Vide: ${!row[2] || row[2].toString().trim() === '' ? '❌ OUI' : '✅ NON'}`);
            console.log(`      Longueur: ${row[2] ? row[2].toString().length : 0} caractères`);
            
            if (row[2] && row[2].toString().length > 0) {
                const polygonStr = row[2].toString();
                console.log(`      Premiers 100 caractères: "${polygonStr.substring(0, 100)}"`);
                
                // Tenter de parser
                try {
                    const parsed = JSON.parse(polygonStr);
                    console.log(`      ✅ JSON valide`);
                    console.log(`      Type GeoJSON: ${parsed.type}`);
                    console.log(`      A des coordonnées: ${parsed.coordinates ? '✅ OUI' : '❌ NON'}`);
                    
                    if (parsed.coordinates) {
                        const coordCount = parsed.type === 'Polygon' 
                            ? parsed.coordinates[0].length 
                            : parsed.coordinates[0][0].length;
                        console.log(`      Nombre de points: ${coordCount}`);
                    }
                } catch (e) {
                    console.log(`      ❌ JSON invalide: ${e.message}`);
                }
            } else {
                console.log(`      ❌❌❌ COLONNE VIDE - C'EST LE PROBLÈME! ❌❌❌`);
            }

            // Colonnes D et E
            console.log(`   Colonne D (Code Postal): "${row[3]}"`);
            console.log(`   Colonne E (Département): "${row[4]}"`);
        }

        // Statistiques globales
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('STATISTIQUES GLOBALES:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        let totalRows = data.length - 1; // Sans header
        let rowsWithPolygon = 0;
        let rowsEmptyPolygon = 0;

        for (let i = 1; i < data.length; i++) {
            const polygonCell = data[i][2];
            if (polygonCell && polygonCell.toString().trim().length > 0) {
                rowsWithPolygon++;
            } else {
                rowsEmptyPolygon++;
            }
        }

        console.log(`\n   Total lignes (sans header): ${totalRows}`);
        console.log(`   Avec polygon: ${rowsWithPolygon} (${(rowsWithPolygon/totalRows*100).toFixed(1)}%)`);
        console.log(`   Sans polygon: ${rowsEmptyPolygon} (${(rowsEmptyPolygon/totalRows*100).toFixed(1)}%)`);

        if (rowsEmptyPolygon === totalRows) {
            console.log('\n❌❌❌ PROBLÈME CRITIQUE ❌❌❌');
            console.log('AUCUNE ligne n\'a de polygon dans la colonne C!');
            console.log('\n💡 SOLUTIONS:');
            console.log('   1. Vérifier que les polygons sont bien dans la colonne C');
            console.log('   2. Si les polygons sont dans une autre colonne, ajuster CONFIG.COLUMNS.VILLES.POLYGON');
            console.log('   3. Vérifier que les cellules contiennent bien du GeoJSON valide');
            console.log('   4. Importer les données GeoJSON si elles sont manquantes');
        } else if (rowsEmptyPolygon > 0) {
            console.log(`\n⚠️  ${rowsEmptyPolygon} lignes n'ont pas de polygon`);
            console.log('Lister les villes sans polygon...');
            
            console.log('\n🏙️  Villes SANS polygon:');
            for (let i = 1; i < data.length; i++) {
                const polygonCell = data[i][2];
                if (!polygonCell || polygonCell.toString().trim().length === 0) {
                    console.log(`   - ${data[i][1]} (ID: ${data[i][0]})`);
                }
            }
        } else {
            console.log('\n✅ Toutes les villes ont un polygon!');
        }

    } catch (error) {
        console.log('\n❌ ERREUR FATALE:');
        console.log(`   Message: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
    }
}

/**
 * Test si Utils.parseGeoJSONPolygon fonctionne
 */
function testParseGeoJSON() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     TEST: Utils.parseGeoJSONPolygon                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    // Test avec un GeoJSON valide
    const testGeoJSON = {
        "type": "Polygon",
        "coordinates": [[
            [-1.5536, 47.2173],
            [-1.5500, 47.2200],
            [-1.5400, 47.2150],
            [-1.5536, 47.2173]
        ]]
    };

    const testString = JSON.stringify(testGeoJSON);
    console.log('\n📝 GeoJSON de test:');
    console.log(testString.substring(0, 200));

    const result = Utils.parseGeoJSONPolygon(testString);

    if (result) {
        console.log('\n✅ Parsing réussi');
        console.log(`   Nombre de points: ${result.length}`);
        console.log(`   Premier point: [${result[0]}] (format [lat, lng])`);
        console.log(`   Note: les coordonnées ont été inversées de [lng, lat] à [lat, lng]`);
    } else {
        console.log('\n❌ Parsing échoué');
    }

    // Test avec null
    console.log('\n\n📝 Test avec null:');
    const nullResult = Utils.parseGeoJSONPolygon(null);
    console.log(`   Résultat: ${nullResult === null ? '✅ null' : '❌ ' + nullResult}`);

    // Test avec string vide
    console.log('\n📝 Test avec string vide:');
    const emptyResult = Utils.parseGeoJSONPolygon('');
    console.log(`   Résultat: ${emptyResult === null ? '✅ null' : '❌ ' + emptyResult}`);
}

/**
 * Affiche toutes les feuilles du spreadsheet
 */
function listAllSheets() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     LISTE DES FEUILLES DU SPREADSHEET                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    console.log(`\n📊 ${sheets.length} feuille(s) trouvée(s):\n`);

    sheets.forEach((sheet, index) => {
        const name = sheet.getName();
        const rows = sheet.getLastRow();
        const cols = sheet.getLastColumn();
        
        const isExpected = ['villes', 'secteurs', 'quartiers'].includes(name.toLowerCase());
        const icon = isExpected ? '✅' : '  ';
        
        console.log(`${icon} ${index + 1}. "${name}"`);
        console.log(`      Dimensions: ${rows} lignes × ${cols} colonnes`);
    });

    console.log('\n📋 Feuilles attendues:');
    ['villes', 'secteurs', 'quartiers'].forEach(expected => {
        const found = sheets.find(s => s.getName().toLowerCase() === expected);
        console.log(`   ${found ? '✅' : '❌'} ${expected}`);
    });
}

/**
 * Lance tous les tests de diagnostic
 */
function runSheetDiagnostics() {
    console.log('🔬 DIAGNOSTIC COMPLET DU GOOGLE SHEET\n');
    
    console.log('1️⃣  Liste des feuilles...\n');
    listAllSheets();
    
    console.log('\n\n2️⃣  Contenu brut de la feuille "villes"...\n');
    debugSheetRawContent();
    
    console.log('\n\n3️⃣  Test de la fonction de parsing...\n');
    testParseGeoJSON();
}