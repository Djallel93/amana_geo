#!/bin/bash

# Script de migration GEO API v2 → v3
# Usage: ./migrate.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Début migration GEO API v2 → v3"

# Chemin du projet
PROJECT_DIR="Google_app_script"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Erreur: Répertoire $PROJECT_DIR non trouvé"
    echo "Exécutez ce script depuis le répertoire parent de Google_app_script/"
    exit 1
fi

cd "$PROJECT_DIR"

echo "📦 Répertoire actuel: $(pwd)"

# ========================================
# ÉTAPE 1: BACKUP
# ========================================
echo ""
echo "📋 ÉTAPE 1/4: Création du backup..."

BACKUP_DIR="../Google_app_script_backup_v2_$(date +%Y%m%d_%H%M%S)"
echo "Backup dans: $BACKUP_DIR"
cd ..
cp -r "$PROJECT_DIR" "$BACKUP_DIR"
echo "✅ Backup créé: $BACKUP_DIR"
cd "$PROJECT_DIR"

# ========================================
# ÉTAPE 2: SUPPRESSION DES ANCIENS FICHIERS
# ========================================
echo ""
echo "🗑️  ÉTAPE 2/4: Suppression des anciens fichiers..."

# Supprimer les handlers API obsolètes
rm -f src/api/distanceHandler.js
rm -f src/api/geocodeHandler.js
rm -f src/api/quartierHandler.js
rm -f src/api/secteurHandler.js
rm -f src/api/villeHandler.js
echo "  ✓ Handlers API obsolètes supprimés"

# Supprimer les anciens services
rm -f src/services/distanceService.js
rm -f src/services/geocodingService.js
rm -f src/services/quartierService.js
rm -f src/services/secteurService.js
rm -f src/services/villeService.js
echo "  ✓ Anciens services supprimés"

# Supprimer les anciens fichiers UI
rm -f src/ui/helpers.js
echo "  ✓ Anciens fichiers UI supprimés"

# Supprimer les tests (optionnel, à décommenter si vous voulez les garder)
# rm -rf tests/
# echo "  ✓ Tests supprimés"

echo "✅ Anciens fichiers supprimés"

# ========================================
# ÉTAPE 3: CRÉATION DES NOUVEAUX FICHIERS
# ========================================
echo ""
echo "📝 ÉTAPE 3/4: Création des nouveaux fichiers..."

# Créer les nouveaux fichiers vides (vous copierez le contenu après)

# Core
touch src/core/logger.js
touch src/core/cacheManager.js
echo "  ✓ Fichiers core créés"

# Services
touch src/services/dataService.js
echo "  ✓ Fichiers services créés"

# UI
touch src/ui/uiManager.js
echo "  ✓ Fichiers UI créés"

echo "✅ Nouveaux fichiers créés"

# ========================================
# ÉTAPE 4: AFFICHAGE DE LA STRUCTURE FINALE
# ========================================
echo ""
echo "📂 ÉTAPE 4/4: Structure finale:"
echo ""

tree -L 3 --dirsfirst -I 'node_modules|.git' || find . -type f -name "*.js" -o -name "*.html" -o -name "*.json" | sort

# ========================================
# RÉSUMÉ
# ========================================
echo ""
echo "============================================"
echo "✅ MIGRATION STRUCTURELLE TERMINÉE"
echo "============================================"
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Copier le contenu dans les fichiers suivants:"
echo ""
echo "   Core (obligatoire):"
echo "   - src/core/config.js          (REMPLACER le contenu existant)"
echo "   - src/core/logger.js          (NOUVEAU fichier)"
echo "   - src/core/cacheManager.js    (NOUVEAU fichier)"
echo "   - src/core/utils.js           (REMPLACER le contenu existant)"
echo ""
echo "   Services (obligatoire):"
echo "   - src/services/dataService.js       (NOUVEAU fichier)"
echo "   - src/services/geocodingService.js  (NOUVEAU fichier)"
echo "   - src/services/quartierService.js   (NOUVEAU fichier)"
echo "   - src/services/boundaryService.js   (REMPLACER le contenu existant)"
echo ""
echo "   API (obligatoire):"
echo "   - src/api/apiHandler.js       (REMPLACER le contenu existant)"
echo ""
echo "   UI (obligatoire):"
echo "   - src/ui/menu.js              (REMPLACER le contenu existant)"
echo "   - src/ui/uiManager.js         (NOUVEAU fichier)"
echo ""
echo "2. Dans Google Apps Script Editor:"
echo "   - Ouvrir le projet"
echo "   - Copier le contenu de chaque fichier"
echo "   - Sauvegarder"
echo ""
echo "3. Tester la migration:"
echo "   - Exécuter: testMigration()"
echo "   - Recharger le spreadsheet"
echo "   - Vérifier le menu '📦 AMANA'"
echo ""
echo "4. Tests finaux:"
echo "   - UI: Ouvrir un dialogue"
echo "   - API: Tester le endpoint /ping"
echo ""
echo "📦 Backup sauvegardé dans: $BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANT: Les fichiers HTML (views/) sont INCHANGÉS"
echo ""