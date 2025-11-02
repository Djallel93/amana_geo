/**
 * Service de données - Lecture seule avec hiérarchie Ville > Secteur > Quartier
 */

const DataService = {

    /**
     * Charge toutes les données d'une feuille avec cache
     */
    loadAll(entityType) {
        const cacheKey = CacheManager.generateKey('all', entityType);
        const cached = CacheManager.get(cacheKey);

        if (cached) return cached;

        const sheet = getSheet(CONFIG.SHEETS[entityType.toUpperCase()]);
        const data = sheet.getDataRange().getValues();

        if (data.length <= 1) return [];

        const columns = CONFIG.COLUMNS[entityType.toUpperCase()];
        const entities = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            const entity = {
                id: row[columns.ID],
                nom: row[columns.NOM]
            };

            // Ajouter les colonnes spécifiques selon le type
            if (entityType === 'VILLES') {
                entity.polygon = Utils.parseGeoJSONPolygon(row[columns.POLYGON]);
                entity.codePostal = row[columns.CODE_POSTAL];
                entity.departement = row[columns.DEPARTEMENT];
            } else if (entityType === 'SECTEURS') {
                // Secteurs n'ont pas de polygon, juste l'ID ville
                entity.idVille = row[columns.ID_VILLE];
            } else if (entityType === 'QUARTIERS') {
                entity.polygon = Utils.parseGeoJSONPolygon(row[columns.POLYGON]);
                entity.idSecteur = row[columns.ID_SECTEUR];
            }

            // Filtrer les entités sans ID
            if (!entity.id) continue;

            entities.push(entity);
        }

        CacheManager.set(cacheKey, entities);
        Logger.info(`${entities.length} ${entityType} chargés depuis le sheet`);

        return entities;
    },

    /**
     * Trouve une entité par ID
     */
    findById(entityType, id) {
        const entities = this.loadAll(entityType);
        return entities.find(e => e.id == id) || null;
    },

    /**
     * Charge la hiérarchie complète pour optimisation
     */
    loadHierarchy() {
        const cacheKey = 'hierarchy_complete';
        const cached = CacheManager.get(cacheKey);

        if (cached) return cached;

        const villes = this.loadAll('VILLES');
        const secteurs = this.loadAll('SECTEURS');
        const quartiers = this.loadAll('QUARTIERS');

        // Créer des maps pour accès rapide
        const villeMap = new Map(villes.map(v => [v.id, v]));
        const secteurMap = new Map(secteurs.map(s => [s.id, s]));

        // Enrichir les quartiers avec infos secteur et ville
        const enrichedQuartiers = quartiers.map(q => {
            const secteur = secteurMap.get(q.idSecteur);
            const ville = secteur ? villeMap.get(secteur.idVille) : null;

            return {
                ...q,
                secteurNom: secteur?.nom,
                idVille: secteur?.idVille,
                villeNom: ville?.nom,
                codePostal: ville?.codePostal
            };
        });

        // Enrichir les secteurs avec info ville
        const enrichedSecteurs = secteurs.map(s => {
            const ville = villeMap.get(s.idVille);
            return {
                ...s,
                villeNom: ville?.nom,
                codePostal: ville?.codePostal
            };
        });

        const hierarchy = {
            villes: villes,
            secteurs: enrichedSecteurs,
            quartiers: enrichedQuartiers,
            villeMap: Object.fromEntries(villeMap),
            secteurMap: Object.fromEntries(secteurMap)
        };

        CacheManager.set(cacheKey, hierarchy, 1800); // 30 min
        Logger.info('Hiérarchie complète chargée et enrichie');

        return hierarchy;
    },

    /**
     * Supprime les polygons des entités pour réponses API
     */
    stripPolygons(entities) {
        if (!Array.isArray(entities)) {
            const copy = { ...entities };
            delete copy.polygon;
            return copy;
        }

        return entities.map(e => {
            const copy = { ...e };
            delete copy.polygon;
            return copy;
        });
    }
};