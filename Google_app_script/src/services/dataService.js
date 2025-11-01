/**
 * Service de données - Lecture seule avec polygones
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
                nom: row[columns.NOM],
                polygon: Utils.parseGeoJSONPolygon(row[columns.POLYGON])
            };

            // Ajouter les colonnes spécifiques
            if (entityType === 'VILLES') {
                entity.codePostal = row[columns.CODE_POSTAL];
                entity.departement = row[columns.DEPARTEMENT];
            } else if (entityType === 'QUARTIERS') {
                entity.idVille = row[columns.ID_VILLE];
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
    }
};