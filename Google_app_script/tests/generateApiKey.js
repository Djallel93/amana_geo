function generateApiKey() {
  const key = Utilities.getUuid();

  // Enregistre la clé dans les Script Properties
  const props = PropertiesService.getScriptProperties();
  props.setProperty('API_KEY', key);

  console.log('🔑 Nouvelle API Key générée et enregistrée avec succès :');
  testApiKey();
}

function testApiKey() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('API_KEY');

  if (key) {
    console.log('✅ API Key configurée correctement');
    console.log('Longueur : ' + key.length + ' caractères');
  } else {
    console.log('❌ API Key non trouvée');
  }
}
