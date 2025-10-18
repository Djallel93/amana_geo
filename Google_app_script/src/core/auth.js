/**
 * Système d'authentification hybride pour GEO API
 * VERSION OPTIMISÉE avec meilleures pratiques
 */

// ========================================
// CONFIGURATION
// ========================================

const AUTH_CONFIG = {
    ENABLE_EMAIL_AUTH: true,
    ENABLE_TOKEN_AUTH: true,
    TOKEN_EXPIRY_DAYS: 365,
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 30,

    // Nouvelles options
    CACHE_DURATION: 300, // 5 minutes pour les validations
    TOKEN_MIN_LENGTH: 32
};

// ========================================
// CACHE POUR PERFORMANCES
// ========================================

/**
 * Cache pour les validations d'emails (évite lectures répétées)
 */
class AuthCache {
    constructor() {
        this.cache = CacheService.getScriptCache();
        this.CACHE_PREFIX = 'auth_';
    }

    /**
     * Vérifie si un email est en cache
     */
    isEmailAuthorized(email) {
        const key = `${this.CACHE_PREFIX}email_${email}`;
        const cached = this.cache.get(key);
        return cached === 'true';
    }

    /**
     * Met en cache l'autorisation d'un email
     */
    cacheEmailAuth(email, authorized) {
        const key = `${this.CACHE_PREFIX}email_${email}`;
        this.cache.put(key, authorized.toString(), AUTH_CONFIG.CACHE_DURATION);
    }

    /**
     * Invalide le cache d'un email
     */
    invalidateEmail(email) {
        const key = `${this.CACHE_PREFIX}email_${email}`;
        this.cache.remove(key);
    }

    /**
     * Nettoie tout le cache d'authentification
     */
    clear() {
        // Note: removeAll n'est pas disponible, on ne peut pas nettoyer sélectivement
        Logger.log('Cache auth: nettoyage demandé (expire automatiquement)');
    }
}

const authCache = new AuthCache();

// ========================================
// GESTION DES EMAILS AUTORISÉS
// ========================================

/**
 * Vérifie si un email est autorisé (avec cache)
 */
function isEmailAuthorized(email) {
    if (!AUTH_CONFIG.ENABLE_EMAIL_AUTH) {
        return true;
    }

    if (!email) {
        return false;
    }

    const emailLower = email.toLowerCase().trim();

    // Vérifier le cache d'abord
    if (authCache.isEmailAuthorized(emailLower)) {
        return true;
    }

    // Vérifier email exact
    const authorizedEmails = getAuthorizedEmails();
    if (authorizedEmails.includes(emailLower)) {
        authCache.cacheEmailAuth(emailLower, true);
        return true;
    }

    // Vérifier domaines autorisés
    const authorizedDomains = getAuthorizedDomains();
    const emailDomain = emailLower.split('@')[1];

    if (emailDomain && authorizedDomains.includes(emailDomain)) {
        authCache.cacheEmailAuth(emailLower, true);
        return true;
    }

    return false;
}

/**
 * Récupère la liste des emails autorisés (avec cache)
 */
function getAuthorizedEmails() {
    const props = PropertiesService.getScriptProperties();
    const emailsJson = props.getProperty('AUTHORIZED_EMAILS');

    if (!emailsJson) {
        return [];
    }

    try {
        const emails = JSON.parse(emailsJson);
        return Array.isArray(emails) ? emails : [];
    } catch (e) {
        Logger.log(`⚠️ Erreur parsing emails: ${e.message}`);
        return [];
    }
}

/**
 * Récupère la liste des domaines autorisés (avec cache)
 */
function getAuthorizedDomains() {
    const props = PropertiesService.getScriptProperties();
    const domainsJson = props.getProperty('AUTHORIZED_DOMAINS');

    if (!domainsJson) {
        return [];
    }

    try {
        const domains = JSON.parse(domainsJson);
        return Array.isArray(domains) ? domains : [];
    } catch (e) {
        Logger.log(`⚠️ Erreur parsing domaines: ${e.message}`);
        return [];
    }
}

/**
 * Ajoute un email avec validation
 */
function addAuthorizedEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Email invalide');
    }

    const emailLower = email.toLowerCase().trim();

    // Validation basique
    if (!emailLower.includes('@') || !emailLower.includes('.')) {
        throw new Error('Format d\'email invalide');
    }

    const emails = getAuthorizedEmails();

    if (emails.includes(emailLower)) {
        return false;
    }

    emails.push(emailLower);

    const props = PropertiesService.getScriptProperties();
    props.setProperty('AUTHORIZED_EMAILS', JSON.stringify(emails));

    // Invalider le cache
    authCache.invalidateEmail(emailLower);

    Logger.log(`✅ Email ajouté: ${emailLower}`);
    return true;
}

/**
 * Retire un email avec invalidation du cache
 */
function removeAuthorizedEmail(email) {
    const emailLower = email.toLowerCase().trim();
    const emails = getAuthorizedEmails();

    const index = emails.indexOf(emailLower);
    if (index === -1) {
        return false;
    }

    emails.splice(index, 1);

    const props = PropertiesService.getScriptProperties();
    props.setProperty('AUTHORIZED_EMAILS', JSON.stringify(emails));

    // Invalider le cache
    authCache.invalidateEmail(emailLower);

    Logger.log(`✅ Email retiré: ${emailLower}`);
    return true;
}

/**
 * Ajoute un domaine avec validation
 */
function addAuthorizedDomain(domain) {
    if (!domain || typeof domain !== 'string') {
        throw new Error('Domaine invalide');
    }

    const domainLower = domain.toLowerCase().trim().replace(/^@/, '');

    // Validation basique
    if (!domainLower.includes('.') || domainLower.includes('@')) {
        throw new Error('Format de domaine invalide');
    }

    const domains = getAuthorizedDomains();

    if (domains.includes(domainLower)) {
        return false;
    }

    domains.push(domainLower);

    const props = PropertiesService.getScriptProperties();
    props.setProperty('AUTHORIZED_DOMAINS', JSON.stringify(domains));

    Logger.log(`✅ Domaine ajouté: ${domainLower}`);
    return true;
}

/**
 * Retire un domaine
 */
function removeAuthorizedDomain(domain) {
    const domainLower = domain.toLowerCase().trim();
    const domains = getAuthorizedDomains();

    const index = domains.indexOf(domainLower);
    if (index === -1) {
        return false;
    }

    domains.splice(index, 1);

    const props = PropertiesService.getScriptProperties();
    props.setProperty('AUTHORIZED_DOMAINS', JSON.stringify(domains));

    Logger.log(`✅ Domaine retiré: ${domainLower}`);
    return true;
}

// ========================================
// GESTION DES TOKENS API (OPTIMISÉE)
// ========================================

/**
 * Génère un nouveau token API avec validation renforcée
 */
function generateAPIToken(name, expiryDays) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('Nom du token requis');
    }

    const token = Utilities.getUuid().replace(/-/g, '');
    const expiry = expiryDays || AUTH_CONFIG.TOKEN_EXPIRY_DAYS;

    if (expiry < 1 || expiry > 3650) {
        throw new Error('Durée de validité invalide (1-3650 jours)');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiry);

    const tokenData = {
        token: token,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        lastUsed: null,
        usageCount: 0,
        active: true
    };

    const tokens = getAllTokens();
    tokens[token] = tokenData;
    saveTokens(tokens);

    Logger.log(`✅ Token créé: ${name} (expire le ${expiryDate.toLocaleDateString('fr-FR')})`);

    return tokenData;
}

/**
 * Valide un token API (optimisé avec early returns)
 */
function validateAPIToken(token) {
    if (!AUTH_CONFIG.ENABLE_TOKEN_AUTH) {
        return { valid: true, reason: 'Auth désactivée' };
    }

    if (!token || typeof token !== 'string') {
        return { valid: false, reason: 'Token manquant ou invalide' };
    }

    if (token.length < AUTH_CONFIG.TOKEN_MIN_LENGTH) {
        return { valid: false, reason: 'Token invalide' };
    }

    const tokens = getAllTokens();
    const tokenData = tokens[token];

    if (!tokenData) {
        Logger.log(`⚠️ Token invalide: ${token.substring(0, 8)}...`);
        return { valid: false, reason: 'Token invalide' };
    }

    if (!tokenData.active) {
        return { valid: false, reason: 'Token révoqué' };
    }

    // Vérifier expiration
    const expiryDate = new Date(tokenData.expiresAt);
    if (expiryDate < new Date()) {
        return { valid: false, reason: 'Token expiré' };
    }

    // Mettre à jour dernière utilisation (async pour performance)
    try {
        tokenData.lastUsed = new Date().toISOString();
        tokenData.usageCount = (tokenData.usageCount || 0) + 1;
        tokens[token] = tokenData;
        saveTokens(tokens);
    } catch (e) {
        Logger.log(`⚠️ Erreur mise à jour token: ${e.message}`);
    }

    return { valid: true, reason: 'OK', tokenData: tokenData };
}

/**
 * Révoque un token par son ID complet
 */
function revokeAPIToken(token) {
    const tokens = getAllTokens();
    const tokenData = tokens[token];

    if (!tokenData) {
        return false;
    }

    tokenData.active = false;
    tokenData.revokedAt = new Date().toISOString();
    tokens[token] = tokenData;
    saveTokens(tokens);

    Logger.log(`✅ Token révoqué: ${tokenData.name}`);
    return true;
}

/**
 * Supprime un token définitivement
 */
function deleteAPIToken(token) {
    const tokens = getAllTokens();

    if (!tokens[token]) {
        return false;
    }

    const name = tokens[token].name;
    delete tokens[token];
    saveTokens(tokens);

    Logger.log(`✅ Token supprimé: ${name}`);
    return true;
}

/**
 * Liste tous les tokens (sans exposer les tokens complets)
 */
function listAPITokens() {
    const tokens = getAllTokens();

    return Object.keys(tokens).map(token => {
        const data = tokens[token];
        return {
            tokenPrefix: token.substring(0, 8) + '...',
            fullToken: token, // Pour révocation - ne pas exposer côté client
            name: data.name,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            lastUsed: data.lastUsed,
            usageCount: data.usageCount || 0,
            active: data.active
        };
    }).sort((a, b) => {
        // Trier par date de création décroissante
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

/**
 * Récupère tous les tokens (interne, avec gestion d'erreur)
 */
function getAllTokens() {
    const props = PropertiesService.getScriptProperties();
    const tokensJson = props.getProperty('API_TOKENS');

    if (!tokensJson) {
        return {};
    }

    try {
        const tokens = JSON.parse(tokensJson);
        return typeof tokens === 'object' && tokens !== null ? tokens : {};
    } catch (e) {
        Logger.log(`⚠️ Erreur parsing tokens: ${e.message}`);
        return {};
    }
}

/**
 * Sauvegarde les tokens avec validation
 */
function saveTokens(tokens) {
    if (typeof tokens !== 'object' || tokens === null) {
        throw new Error('Tokens invalides');
    }

    const props = PropertiesService.getScriptProperties();
    props.setProperty('API_TOKENS', JSON.stringify(tokens));
}

// ========================================
// MIDDLEWARE D'AUTHENTIFICATION
// ========================================

/**
 * Vérifie l'authentification pour l'interface UI
 */
function checkUIAuthentication() {
    if (!AUTH_CONFIG.ENABLE_EMAIL_AUTH) {
        return { authorized: true, email: 'auth_disabled', reason: 'OK' };
    }

    try {
        const email = Session.getActiveUser().getEmail();

        if (!email) {
            return { authorized: false, email: null, reason: 'Email non disponible' };
        }

        if (!isEmailAuthorized(email)) {
            Logger.log(`⚠️ Accès refusé pour: ${email}`);
            return { authorized: false, email: email, reason: 'Email non autorisé' };
        }

        return { authorized: true, email: email, reason: 'OK' };
    } catch (e) {
        Logger.log(`⚠️ Erreur authentification UI: ${e.message}`);
        return { authorized: false, email: null, reason: 'Erreur système' };
    }
}

/**
 * Vérifie l'authentification pour l'API REST
 */
function checkAPIAuthentication(e) {
    if (!AUTH_CONFIG.ENABLE_TOKEN_AUTH) {
        return { authorized: true, token: null, reason: 'OK' };
    }

    const token = e.parameter?.apiKey || e.parameter?.api_key;

    if (!token) {
        return { authorized: false, token: null, reason: 'Token manquant' };
    }

    const validation = validateAPIToken(token);

    return {
        authorized: validation.valid,
        token: token,
        reason: validation.reason,
        tokenData: validation.tokenData
    };
}

// ========================================
// FONCTIONS D'INITIALISATION
// ========================================

/**
 * Initialise le système d'authentification
 */
function setupAuthentication() {
    const props = PropertiesService.getScriptProperties();

    // Initialiser avec valeurs par défaut si absent
    if (!props.getProperty('AUTHORIZED_EMAILS')) {
        props.setProperty('AUTHORIZED_EMAILS', JSON.stringify([]));
    }

    if (!props.getProperty('AUTHORIZED_DOMAINS')) {
        props.setProperty('AUTHORIZED_DOMAINS', JSON.stringify([]));
    }

    if (!props.getProperty('API_TOKENS')) {
        props.setProperty('API_TOKENS', JSON.stringify({}));
    }

    Logger.log('✅ Système d\'authentification initialisé');
    Logger.log('⚠️ IMPORTANT: Ajoutez au moins un email autorisé avec addAuthorizedEmail()');
}

/**
 * Ajoute l'utilisateur actuel (pour premier démarrage)
 */
function authorizeCurrentUser() {
    try {
        const email = Session.getActiveUser().getEmail();

        if (!email) {
            throw new Error('Impossible de récupérer l\'email de l\'utilisateur actuel');
        }

        const added = addAuthorizedEmail(email);

        if (added) {
            Logger.log(`✅ Utilisateur ${email} autorisé`);
        } else {
            Logger.log(`ℹ️ ${email} est déjà autorisé`);
        }
    } catch (e) {
        Logger.log(`❌ Erreur: ${e.message}`);
        throw e;
    }
}

/**
 * Nettoie les tokens expirés (à exécuter périodiquement)
 */
function cleanupExpiredTokens() {
    const tokens = getAllTokens();
    const now = new Date();
    let cleaned = 0;

    Object.keys(tokens).forEach(token => {
        const tokenData = tokens[token];
        const expiryDate = new Date(tokenData.expiresAt);

        if (expiryDate < now) {
            delete tokens[token];
            cleaned++;
        }
    });

    if (cleaned > 0) {
        saveTokens(tokens);
        Logger.log(`✅ ${cleaned} token(s) expiré(s) supprimé(s)`);
    }

    return cleaned;
}

// ========================================
// FONCTIONS DE DIAGNOSTIC
// ========================================

/**
 * Affiche l'état de l'authentification
 */
function showAuthStatus() {
    Logger.log('=== ÉTAT DE L\'AUTHENTIFICATION ===\n');

    Logger.log('Configuration:');
    Logger.log(`- Email Auth: ${AUTH_CONFIG.ENABLE_EMAIL_AUTH ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
    Logger.log(`- Token Auth: ${AUTH_CONFIG.ENABLE_TOKEN_AUTH ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
    Logger.log('');

    const emails = getAuthorizedEmails();
    Logger.log(`Emails autorisés: ${emails.length}`);
    emails.forEach(email => Logger.log(`  - ${email}`));
    Logger.log('');

    const domains = getAuthorizedDomains();
    Logger.log(`Domaines autorisés: ${domains.length}`);
    domains.forEach(domain => Logger.log(`  - *@${domain}`));
    Logger.log('');

    const tokens = listAPITokens();
    Logger.log(`Tokens API: ${tokens.length}`);
    tokens.forEach(token => {
        const status = token.active ? '✅ Actif' : '❌ Révoqué';
        Logger.log(`  - ${token.name} (${token.tokenPrefix}) ${status}`);
        Logger.log(`    Créé: ${new Date(token.createdAt).toLocaleDateString('fr-FR')}`);
        Logger.log(`    Expire: ${new Date(token.expiresAt).toLocaleDateString('fr-FR')}`);
        Logger.log(`    Utilisations: ${token.usageCount}`);
    });
}