/**
 * Service de données unifié pour toutes les entités
 * Centralise les opérations CRUD et le caching
 */

const DataService = {

    /**
     * Charge toutes les données d'une feuille avec cache
     */
    loadAll(entityType, filterValid = true) {
        const cacheKey = CacheManager.generateKey('all', entityType, filterValid);
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
                centreLatitude: row[columns.CENTRE_LAT] || null,
                centreLongitude: row[columns.CENTRE_LNG] || null,
                polygonFrontiere: row[columns.POLYGON] || null
            };

            // Ajouter les colonnes spécifiques
            if (entityType === 'VILLES') {
                entity.codePostal = row[columns.CODE_POSTAL];
                entity.departement = row[columns.DEPARTEMENT];
            } else if (entityType === 'SECTEURS') {
                entity.idVille = row[columns.ID_VILLE];
            } else if (entityType === 'QUARTIERS') {
                entity.idSecteur = row[columns.ID_SECTEUR];
            }

            // Filtrer les entités invalides
            if (!entity.id) continue;

            if (filterValid &&
                !Utils.isValidCoordinates(entity.centreLatitude, entity.centreLongitude)) {
                continue;
            }

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
        const entities = this.loadAll(entityType, false);
        return entities.find(e => e.id == id) || null;
    },

    /**
     * Crée une nouvelle entité
     */
    create(entityType, data) {
        const sheet = getSheet(CONFIG.SHEETS[entityType.toUpperCase()]);
        const columns = CONFIG.COLUMNS[entityType.toUpperCase()];
        const lastRow = sheet.getLastRow();
        const newId = lastRow || 1;

        const row = new Array(Object.keys(columns).length).fill('');
        row[columns.ID] = newId;
        row[columns.NOM] = data.nom;
        row[columns.CENTRE_LAT] = data.centreLatitude || '';
        row[columns.CENTRE_LNG] = data.centreLongitude || '';
        row[columns.POLYGON] = data.polygonFrontiere || '';

        if (entityType === 'VILLES') {
            row[columns.CODE_POSTAL] = data.codePostal;
            row[columns.DEPARTEMENT] = data.departement || '';
        } else if (entityType === 'SECTEURS') {
            row[columns.ID_VILLE] = data.idVille;
        } else if (entityType === 'QUARTIERS') {
            row[columns.ID_SECTEUR] = data.idSecteur;
        }

        sheet.appendRow(row);
        this.invalidateCache(entityType);

        Logger.success(`${entityType} créé: ${data.nom} (ID: ${newId})`);

        return { id: newId, ...data };
    },

    /**
     * Met à jour une entité
     */
    update(entityType, id, updates) {
        const sheet = getSheet(CONFIG.SHEETS[entityType.toUpperCase()]);
        const data = sheet.getDataRange().getValues();
        const columns = CONFIG.COLUMNS[entityType.toUpperCase()];

        const rowIndex = data.findIndex(row => row[columns.ID] == id);

        if (rowIndex === -1 || rowIndex === 0) {
            throw new Error(`${entityType} ${id} introuvable`);
        }

        const actualRow = rowIndex + 1;

        Object.keys(updates).forEach(key => {
            const colKey = key.toUpperCase().replace(/([A-Z])/g, '_$1').substring(1);
            const colIndex = columns[colKey];

            if (colIndex !== undefined) {
                sheet.getRange(actualRow, colIndex + 1).setValue(updates[key]);
            }
        });

        this.invalidateCache(entityType);
        Logger.success(`${entityType} ${id} mis à jour`);

        return true;
    },

    /**
     * Supprime une entité
     */
    delete(entityType, id) {
        const sheet = getSheet(CONFIG.SHEETS[entityType.toUpperCase()]);
        const data = sheet.getDataRange().getValues();
        const columns = CONFIG.COLUMNS[entityType.toUpperCase()];

        const rowIndex = data.findIndex(row => row[columns.ID] == id);

        if (rowIndex === -1 || rowIndex === 0) {
            throw new Error(`${entityType} ${id} introuvable`);
        }

        sheet.deleteRow(rowIndex + 1);
        this.invalidateCache(entityType);

        Logger.success(`${entityType} ${id} supprimé`);

        return true;
    },

    /**
     * Invalide le cache pour un type d'entité
     */
    invalidateCache(entityType) {
        ['true', 'false'].forEach(filterValid => {
            const key = CacheManager.generateKey('all', entityType, filterValid);
            CacheManager.remove(key);
        });
    }
};