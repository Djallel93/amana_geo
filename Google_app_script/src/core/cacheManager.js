/**
 * Gestionnaire de cache optimisé et unifié
 */

const CacheManager = {
    cache: CacheService.getScriptCache(),

    /**
     * Génère une clé de cache normalisée
     */
    generateKey(...parts) {
        return parts
            .filter(p => p != null)
            .map(p => String(p).toLowerCase().replace(/[^a-z0-9]/g, '_'))
            .join('_')
            .substring(0, 200); // Limite Google Apps Script
    },

    /**
     * Récupère une valeur du cache
     */
    get(key) {
        try {
            const cached = this.cache.get(key);

            if (cached) {
                Logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached);
            }

            Logger.debug(`Cache MISS: ${key}`);
            return null;
        } catch (e) {
            Logger.warn(`Erreur lecture cache: ${e.message}`, { key });
            return null;
        }
    },

    /**
     * Stocke une valeur dans le cache
     */
    set(key, value, duration = CONFIG.CACHE.DUREE_DEFAUT) {
        try {
            const serialized = JSON.stringify(value);

            if (serialized.length > CONFIG.CACHE.TAILLE_MAX_ENTREE) {
                Logger.warn(`Valeur trop grande pour le cache`, {
                    key,
                    size: serialized.length
                });
                return false;
            }

            this.cache.put(key, serialized, duration);
            Logger.debug(`Cache SET: ${key} (TTL: ${duration}s)`);
            return true;
        } catch (e) {
            Logger.warn(`Erreur écriture cache: ${e.message}`, { key });
            return false;
        }
    },

    /**
     * Supprime une entrée du cache
     */
    remove(key) {
        try {
            this.cache.remove(key);
            Logger.debug(`Cache REMOVE: ${key}`);
            return true;
        } catch (e) {
            Logger.warn(`Erreur suppression cache: ${e.message}`, { key });
            return false;
        }
    },

    /**
     * Vide tout le cache
     */
    clear() {
        try {
            this.cache.removeAll([]);
            Logger.info('Cache vidé complètement');
            return true;
        } catch (e) {
            Logger.error(`Erreur vidage cache: ${e.message}`);
            return false;
        }
    },

    /**
     * Clés spécifiques pour le géocodage
     */
    getGeocodeKey(address) {
        return this.generateKey('geocode', address);
    },

    getQuartierKey(lat, lng) {
        return this.generateKey('quartier', lat.toFixed(4), lng.toFixed(4));
    }
};