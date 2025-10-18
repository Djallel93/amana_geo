# 🗺️ GEO API - Documentation Complète

## Vue d'ensemble

**GEO API** est une API Web Google Apps Script pour gérer les données géographiques (villes, secteurs, quartiers) avec géocodage automatique, calcul de distances et recherche de proximité.

### Caractéristiques principales

✅ **Géocodage** - Conversion adresse ↔ coordonnées GPS  
✅ **Recherche de proximité** - Quartiers à proximité d'une localisation  
✅ **Calcul de distances** - Haversine formula pour distances précises  
✅ **Gestion CRUD** - Créer, lire, mettre à jour, supprimer villes/secteurs/quartiers  
✅ **Cache intelligent** - Économise les quotas Google Maps  
✅ **Authentification double** - Email pour UI, tokens pour API REST  
✅ **Rate limiting** - Limite de 100 requêtes/heure par client  

---

## 📋 Table des matières

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Authentification](#authentification)
4. [Endpoints API](#endpoints-api)
5. [Exemples d'utilisation](#exemples-dutilisation)
6. [Structure des données](#structure-des-données)
7. [Dépannage](#dépannage)
8. [Quotas & Limitations](#quotas--limitations)

---

## Installation

### Prérequis

- Google Account avec Google Apps Script activé
- Google Sheet vide pour les données
- Accès à Google Maps API (optionnel - pour géocodage)

### Étapes

1. **Créer un nouveau Google Apps Script**
   - Aller sur [script.google.com](https://script.google.com)
   - Créer un nouveau projet

2. **Copier les fichiers du projet**
   - Structure complète :

   ```txt
   Google_app_script/
   ├── appsscript.json
   ├── src/
   │   ├── api/apiHandler.js
   │   ├── core/
   │   │   ├── auth.js
   │   │   ├── config.js
   │   │   └── utils.js
   │   ├── services/
   │   │   ├── distanceService.js
   │   │   ├── geocodingService.js
   │   │   ├── quartierService.js
   │   │   └── villeService.js
   │   └── ui/
   │       ├── menu.js
   │       ├── helpers.js
   │       └── dialogs/
   ├── tests/
   │   └── tests.js
   └── views/
       ├── dialogs/
       └── assets/css/styles.html
   ```

3. **Configuration initiale**

   ```javascript
   // Exécuter une fois :
   setupScriptProperties();
   setupAuthentication();
   authorizeCurrentUser();
   ```

4. **Deployer en Web App**
   - Cliquer sur "Déployer" > "Nouveau déploiement"
   - Type : Web App
   - Exécuter en tant que : l'utilisateur
   - Qui a accès : N'importe qui

---

## Configuration

### Fichier `appsscript.json`

```json
{
  "timeZone": "Europe/Paris",
  "runtimeVersion": "V8",
  "exceptionLogging": "STACKDRIVER",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

### Fichier `src/core/config.js`

**Variables essentielles à configurer :**

```javascript
CONFIG.SHEET_ID = "votre_sheet_id_ici"; // ID du Google Sheet

// Limite de distance pour recherche de quartier
CONFIG.GEO.MAX_DISTANCE_KM = 50;

// Durée du cache
CONFIG.GEO.CACHE_DURATION = 3600; // 1 heure en secondes

// Limite de requêtes par IP
CONFIG.SECURITY.RATE_LIMIT_REQUESTS = 100;

// Activer l'authentification
CONFIG.SECURITY.ENABLE_AUTH = true;
```

### Structure Google Sheet

#### Feuille "Ville"

| ID  | NOM    | CODE_POSTAL | DEPARTEMENT      | PAYS   |
| --- | ------ | ----------- | ---------------- | ------ |
| 1   | Nantes | 44000       | Loire-Atlantique | France |

#### Feuille "Secteur"

| ID  | NOM    | LATITUDE | LONGITUDE | ID_VILLE |
| --- | ------ | -------- | --------- | -------- |
| 1   | Centre | 47.2173  | -1.5536   | 1        |

#### Feuille "Quartier"

| ID  | NOM     | LATITUDE | LONGITUDE | ID_SECTEUR |
| --- | ------- | -------- | --------- | ---------- |
| 1   | Bouffay | 47.2121  | -1.5555   | 1          |

---

## Authentification

### Double système d'authentification

#### 1️⃣ **Email (Interface UI)**

Pour l'accès via Google Sheets :

```javascript
// Autoriser un email
addAuthorizedEmail("utilisateur@example.com");

// Autoriser un domaine entier
addAuthorizedDomain("amana.org");

// Voir les emails autorisés
showAuthStatus();
```

#### 2️⃣ **Token API (Requêtes REST)**

Pour l'accès via API REST (Postman, FAMILIES, etc.) :

```javascript
// Générer un token (exécuter en console)
generateAPIToken("FAMILIES", 365); // Expire dans 365 jours

// Résultat : copier le token complet
// Exemple: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

// Valider un token
const validation = validateAPIToken(token);

// Révoquer un token
revokeAPIToken(token);

// Lister tous les tokens
listAPITokens();
```

**Utilisation du token dans les requêtes :**

```bash
GET https://script.google.com/macros/d/{DEPLOYMENT_ID}/usurp/exec?action=ping&apiKey=TOKEN_ICI
```

---

## Endpoints API

### 📍 Géocodage

#### `GET /usurp/exec?action=geocode`

Trouver les coordonnées d'une adresse.

**Paramètres :**

- `address` (requis) : Adresse à géocoder
- `country` (optionnel) : Pays, défaut "France"
- `apiKey` (requis si auth activée) : Token API

**Réponse succès :**

```json
{
  "isValid": true,
  "coordinates": {
    "latitude": 47.2173,
    "longitude": -1.5536
  },
  "formattedAddress": "1 Place Royale, 44000 Nantes, France",
  "components": {
    "city": "Nantes",
    "postalCode": "44000",
    "country": "France"
  }
}
```

---

#### `GET /usurp/exec?action=reversegeocode`

Trouver l'adresse à partir de coordonnées.

**Paramètres :**

- `lat` (requis) : Latitude
- `lng` (requis) : Longitude
- `apiKey` : Token API

**Réponse :**

```json
{
  "isValid": true,
  "formattedAddress": "1 Place Royale, 44000 Nantes, France",
  "coordinates": {
    "latitude": 47.2173,
    "longitude": -1.5536
  }
}
```

---

### 🎯 Quartiers

#### `GET /usurp/exec?action=findQuartier`

Trouver le quartier le plus proche.

**Paramètres :**

- `lat` (requis) : Latitude
- `lng` (requis) : Longitude
- `maxDistance` (optionnel) : Distance max en km, défaut 50
- `apiKey` : Token API

**Réponse :**

```json
{
  "quartierId": 1,
  "quartierName": "Bouffay",
  "distance": 0.235,
  "quartierLatitude": 47.2121,
  "quartierLongitude": -1.5555,
  "idSecteur": 1
}
```

---

#### `GET /usurp/exec?action=quartiersbyville`

Récupérer tous les quartiers d'une ville.

**Paramètres :**

- `idVille` (requis) : ID de la ville
- `apiKey` : Token API

---

#### `GET /usurp/exec?action=quartiersinradius`

Trouver tous les quartiers dans un rayon.

**Paramètres :**

- `lat` (requis) : Latitude
- `lng` (requis) : Longitude
- `radius` (optionnel) : Rayon en km, défaut 10
- `apiKey` : Token API

---

### 🏙️ Villes

#### `GET /usurp/exec?action=getvilles`

Récupérer toutes les villes.

**Réponse :**

```json
{
  "count": 3,
  "villes": [
    {
      "id": 1,
      "nom": "Nantes",
      "codePostal": "44000",
      "departement": "Loire-Atlantique",
      "pays": "France"
    }
  ]
}
```

---

#### `GET /usurp/exec?action=searchvilles`

Rechercher des villes par code postal ou nom.

**Paramètres :**

- `codePostal` OU `nom` (requis) : Critère de recherche
- `apiKey` : Token API

---

### 📏 Distances

#### `GET /usurp/exec?action=calculatedistance`

Calculer la distance entre deux points (Haversine).

**Paramètres :**

- `lat1`, `lng1` (requis) : Point d'origine
- `lat2`, `lng2` (requis) : Point de destination
- `apiKey` : Token API

**Réponse :**

```json
{
  "distance": 385.621,
  "unit": "km",
  "from": {
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "to": {
    "latitude": 47.2173,
    "longitude": -1.5536
  }
}
```

---

#### `GET /usurp/exec?action=calculatedistances`

Calculer distances vers plusieurs destinations.

**Paramètres :**

- `lat`, `lng` (requis) : Point d'origine
- `destinations` : Array de points `[{"lat": 47.2, "lng": -1.5}, ...]`
- `apiKey` : Token API

---

### 🔌 Utilitaires

#### `GET /usurp/exec?action=ping`

Vérifier que l'API fonctionne.

**Réponse :**

```json
{
  "status": "ok",
  "message": "GEO API opérationnelle",
  "timestamp": "2025-10-18T14:30:00.000Z"
}
```

---

## Exemples d'utilisation

### Avec cURL

```bash
# Ping
curl -X GET "https://script.google.com/macros/d/{DEPLOYMENT_ID}/usurp/exec?action=ping&apiKey=YOUR_TOKEN"

# Géocoder une adresse
curl -X GET "https://script.google.com/macros/d/{DEPLOYMENT_ID}/usurp/exec?action=geocode&address=1%20Place%20Bellecour%2C%20Lyon&apiKey=YOUR_TOKEN"

# Trouver quartier proche
curl -X GET "https://script.google.com/macros/d/{DEPLOYMENT_ID}/usurp/exec?action=findQuartier&lat=47.2173&lng=-1.5536&apiKey=YOUR_TOKEN"

# Calculer distance
curl -X GET "https://script.google.com/macros/d/{DEPLOYMENT_ID}/usurp/exec?action=calculatedistance&lat1=48.8566&lng1=2.3522&lat2=47.2173&lng2=-1.5536&apiKey=YOUR_TOKEN"
```

### Avec Postman (voir guide détaillé ci-dessous)

1. Importer le fichier `swagger.yaml`
2. Aller dans l'onglet "Auth" → "Bearer Token"
3. Coller votre token API
4. Envoyer les requêtes

### Avec JavaScript/Node.js

```javascript
const apiUrl = "https://script.google.com/macros/d/{DEPLOYMENT_ID}/usurp/exec";
const token = "YOUR_TOKEN_HERE";

async function ping() {
  const response = await fetch(
    `${apiUrl}?action=ping&apiKey=${token}`
  );
  const data = await response.json();
  console.log(data);
}

async function findQuartier(lat, lng) {
  const response = await fetch(
    `${apiUrl}?action=findQuartier&lat=${lat}&lng=${lng}&apiKey=${token}`
  );
  const data = await response.json();
  return data;
}

ping();
```

---

## Structure des données

### Ville

```json
{
  "id": 1,
  "nom": "Nantes",
  "codePostal": "44000",
  "departement": "Loire-Atlantique",
  "pays": "France"
}
```

### Secteur

```json
{
  "id": 1,
  "nom": "Centre",
  "latitude": 47.2173,
  "longitude": -1.5536,
  "idVille": 1
}
```

### Quartier

```json
{
  "id": 1,
  "nom": "Bouffay",
  "latitude": 47.2121,
  "longitude": -1.5555,
  "idSecteur": 1
}
```

---

## Dépannage

### ❌ "Unauthorized" - Erreur 401

**Cause :** Token API manquant ou invalide

**Solution :**

```javascript
// 1. Vérifier que le token est correct
showAuthStatus();

// 2. Générer un nouveau token
generateAPIToken("NEW_TOKEN", 365);

// 3. Vérifier que l'authentification est activée
// CONFIG.SECURITY.ENABLE_AUTH = true
```

### ❌ "RATE_LIMIT_EXCEEDED" - Erreur 429

**Cause :** Trop de requêtes (>100/heure)

**Solution :**

- Attendre 1 heure
- Ou réduire la fréquence des appels
- Ou augmenter `CONFIG.SECURITY.RATE_LIMIT_REQUESTS`

### ❌ "Quartier not found" - Erreur 404

**Cause :** Pas de quartier dans le rayon spécifié

**Solution :**

```javascript
// Augmenter maxDistance
// ?action=findQuartier&lat=47.2&lng=-1.5&maxDistance=100

// Ou vérifier que les quartiers ont des coordonnées valides
getAllQuartiers(true); // true = uniquement avec coords
```

### ❌ "Cache MISS" - Performance lente

**Cause :** Le cache est vide ou expiré

**Solution :**

```javascript
// Nettoyer et recréer le cache
CacheService.getScriptCache().removeAll([]);

// Ou attendre que le cache se remplisse (1ère requête = lente)
```

### ⚠️ Quota Google Maps dépassé

**Cause :** >1000 géocodages/jour

**Solution :**

- Attendre 24h
- Ou ne géocoder que les nouveaux quartiers
- Ou utiliser les coordonnées manuelles

---

## Quotas & Limitations

| Ressource              | Limite           | Remarques                  |
| ---------------------- | ---------------- | -------------------------- |
| Géocodage Google Maps  | 1000/jour        | Cache réduit consommation  |
| Requêtes API           | 100/heure par IP | Rate limiting actif        |
| Cache Script           | 6 MB             | Auto-cleanup après 1 heure |
| Taille requête         | 2 MB             | Limite Apps Script         |
| Timeout                | 6 minutes        | Pour batch operations      |
| Distance max recherche | 50 km            | Configurable               |

---

## 🔧 Maintenance

### Nettoyer les tokens expirés

```javascript
// À exécuter via trigger quotidien
cleanupExpiredTokens();
```

### Réinitialiser les données de test

```javascript
// ⚠️ ATTENTION : Supprime toutes les données
cleanTestData(); // Voir fonction dans tests.js
```

### Vérifier la santé de l'API

```javascript
runAllTests();
showAuthStatus();
```

---

## 📄 Licence

Interne AMANA - 2025

---

## 👨‍💻 Support

Pour des problèmes :

1. Consultez les logs : Google Apps Script → Exécutions
2. Lancez la suite de tests : `runAllTests()`
3. Vérifiez la configuration : `showConfigDialog()`
4. Consultez la documentation : Menu AMANA → 📖 Documentation

---
