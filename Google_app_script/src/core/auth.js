/**
 * Système d'authentification hybride pour GEO API
 * - Email whitelist pour l'interface UI (Google Sheets)
 * - API Tokens pour les appels REST (FAMILIES, etc.)
 */

// ========================================
// CONFIGURATION
// ========================================

const AUTH_CONFIG = {
    // Activer/désactiver l'authentification
    ENABLE_EMAIL_AUTH: true,  // Pour l'interface UI
    ENABLE_TOKEN_AUTH: true,   // Pour l'API REST

    // Durée de validité des tokens (en jours)
    TOKEN_EXPIRY_DAYS: 365,

    // Nombre max de tentatives de connexion
    MAX_ATTEMPTS: 5,

    // Durée du blocage après tentatives échouées (en minutes)
    LOCKOUT_DURATION: 30
};

// ========================================
// GESTION DES EMAILS AUTORISÉS
// ========================================

/**
 * Vérifie si un email est autorisé à utiliser l'interface
 * @param {string} email - Email à vérifier
 * @returns {boolean} True si autorisé
 */
function isEmailAuthorized(email) {
    if (!AUTH_CONFIG.ENABLE_EMAIL_AUTH) {
        return true; // Auth désactivée
    }

    const authorizedEmails = getAuthorizedEmails();

    // Vérifier email exact
    if (authorizedEmails.includes(email.toLowerCase())) {
        return true;
    }

    // Vérifier domaines autorisés (ex: *@amana.org)
    const authorizedDomains = getAuthorizedDomains();
    const emailDomain = email.split('@')[1];

    if (authorizedDomains.includes(emailDomain.toLowerCase())) {
        return true;
    }

    return false;
}

/**
 * Récupère la liste des emails autorisés
 * @returns {Array<string>} Liste d'emails
 */
function getAuthorizedEmails() {
    const props = PropertiesService.getScriptProperties();
    const emailsJson = props.getProperty('AUTHORIZED_EMAILS');

    if (!emailsJson) {
        return [];
    }

    try {
        return JSON.parse(emailsJson);
    } catch (e) {
        Logger.log(`Erreur parsing emails: ${e.message}`);
        return [];
    }
}

/**
 * Récupère la liste des domaines autorisés
 * @returns {Array<string>} Liste de domaines
 */
function getAuthorizedDomains() {
    const props = PropertiesService.getScriptProperties();
    const domainsJson = props.getProperty('AUTHORIZED_DOMAINS');

    if (!domainsJson) {
        return [];
    }

    try {
        return JSON.parse(domainsJson);
    } catch (e) {
        Logger.log(`Erreur parsing domaines: ${e.message}`);
        return [];
    }
}

/**
 * Ajoute un email à la liste autorisée
 * @param {string} email - Email à ajouter
 * @returns {boolean} True si ajouté avec succès
 */
function addAuthorizedEmail(email) {
    const emails = getAuthorizedEmails();
    const emailLower = email.toLowerCase().trim();

    if (emails.includes(emailLower)) {
        return false; // Déjà présent
    }

    emails.push(emailLower);

    const props = PropertiesService.getScriptProperties();
    props.setProperty('AUTHORIZED_EMAILS', JSON.stringify(emails));

    Logger.log(`✅ Email ajouté: ${emailLower}`);
    return true;
}

/**
 * Retire un email de la liste autorisée
 * @param {string} email - Email à retirer
 * @returns {boolean} True si retiré avec succès
 */
function removeAuthorizedEmail(email) {
    const emails = getAuthorizedEmails();
    const emailLower = email.toLowerCase().trim();

    const index = emails.indexOf(emailLower);
    if (index === -1) {
        return false; // Pas trouvé
    }

    emails.splice(index, 1);

    const props = PropertiesService.getScriptProperties();
    props.setProperty('AUTHORIZED_EMAILS', JSON.stringify(emails));

    Logger.log(`✅ Email retiré: ${emailLower}`);
    return true;
}

/**
 * Ajoute un domaine autorisé (ex: amana.org)
 * @param {string} domain - Domaine à ajouter
 * @returns {boolean} True si ajouté avec succès
 */
function addAuthorizedDomain(domain) {
    const domains = getAuthorizedDomains();
    const domainLower = domain.toLowerCase().trim();

    if (domains.includes(domainLower)) {
        return false;
    }

    domains.push(domainLower);

    const props = PropertiesService.getScriptProperties();
    props.setProperty('AUTHORIZED_DOMAINS', JSON.stringify(domains));

    Logger.log(`✅ Domaine ajouté: ${domainLower}`);
    return true;
}

// ========================================
// GESTION DES TOKENS API
// ========================================

/**
 * Génère un nouveau token API
 * @param {string} name - Nom descriptif du token (ex: "FAMILIES", "Mobile App")
 * @param {number} expiryDays - Durée de validité en jours (optionnel)
 * @returns {Object} Token créé avec metadata
 */
function generateAPIToken(name, expiryDays) {
    const token = Utilities.getUuid().replace(/-/g, '');
    const expiry = expiryDays || AUTH_CONFIG.TOKEN_EXPIRY_DAYS;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiry);

    const tokenData = {
        token: token,
        name: name,
        createdAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        lastUsed: null,
        usageCount: 0,
        active: true
    };

    // Sauvegarder le token
    const tokens = getAllTokens();
    tokens[token] = tokenData;
    saveTokens(tokens);

    Logger.log(`✅ Token créé: ${name} (expire le ${expiryDate.toLocaleDateString('fr-FR')})`);

    return tokenData;
}

/**
 * Valide un token API
 * @param {string} token - Token à valider
 * @returns {Object} { valid: boolean, reason: string, tokenData: Object }
 */
function validateAPIToken(token) {
    if (!AUTH_CONFIG.ENABLE_TOKEN_AUTH) {
        return { valid: true, reason: 'Auth désactivée' };
    }

    if (!token) {
        return { valid: false, reason: 'Token manquant' };
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

    // Mettre à jour dernière utilisation
    tokenData.lastUsed = new Date().toISOString();
    tokenData.usageCount = (tokenData.usageCount || 0) + 1;
    tokens[token] = tokenData;
    saveTokens(tokens);

    return { valid: true, reason: 'OK', tokenData: tokenData };
}

/**
 * Révoque un token
 * @param {string} token - Token à révoquer
 * @returns {boolean} True si révoqué
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
 * @param {string} token - Token à supprimer
 * @returns {boolean} True si supprimé
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
 * Liste tous les tokens
 * @returns {Array<Object>} Liste des tokens avec metadata (sans le token complet)
 */
function listAPITokens() {
    const tokens = getAllTokens();

    return Object.keys(tokens).map(token => {
        const data = tokens[token];
        return {
            tokenPrefix: token.substring(0, 8) + '...',
            name: data.name,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            lastUsed: data.lastUsed,
            usageCount: data.usageCount,
            active: data.active
        };
    });
}

/**
 * Récupère tous les tokens (interne)
 * @returns {Object} Map de tokens
 */
function getAllTokens() {
    const props = PropertiesService.getScriptProperties();
    const tokensJson = props.getProperty('API_TOKENS');

    if (!tokensJson) {
        return {};
    }

    try {
        return JSON.parse(tokensJson);
    } catch (e) {
        Logger.log(`Erreur parsing tokens: ${e.message}`);
        return {};
    }
}

/**
 * Sauvegarde les tokens (interne)
 * @param {Object} tokens - Map de tokens
 */
function saveTokens(tokens) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('API_TOKENS', JSON.stringify(tokens));
}

// ========================================
// MIDDLEWARE D'AUTHENTIFICATION
// ========================================

/**
 * Vérifie l'authentification pour l'interface UI
 * Appelé automatiquement par les fonctions UI
 * @returns {Object} { authorized: boolean, email: string, reason: string }
 */
function checkUIAuthentication() {
    if (!AUTH_CONFIG.ENABLE_EMAIL_AUTH) {
        return { authorized: true, email: 'auth_disabled', reason: 'OK' };
    }

    const email = Session.getActiveUser().getEmail();

    if (!email) {
        return { authorized: false, email: null, reason: 'Email non disponible' };
    }

    if (!isEmailAuthorized(email)) {
        Logger.log(`⚠️ Accès refusé pour: ${email}`);
        return { authorized: false, email: email, reason: 'Email non autorisé' };
    }

    return { authorized: true, email: email, reason: 'OK' };
}

/**
 * Vérifie l'authentification pour l'API REST
 * Appelé par doGet/doPost
 * @param {Object} e - Event object de la requête
 * @returns {Object} { authorized: boolean, token: string, reason: string }
 */
function checkAPIAuthentication(e) {
    if (!AUTH_CONFIG.ENABLE_TOKEN_AUTH) {
        return { authorized: true, token: null, reason: 'OK' };
    }

    const token = e.parameter.apiKey || e.parameter.api_key;

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
 * À exécuter une fois après installation
 */
function setupAuthentication() {
    const props = PropertiesService.getScriptProperties();

    // Initialiser emails vides si pas déjà fait
    if (!props.getProperty('AUTHORIZED_EMAILS')) {
        props.setProperty('AUTHORIZED_EMAILS', JSON.stringify([]));
    }

    // Initialiser domaines vides
    if (!props.getProperty('AUTHORIZED_DOMAINS')) {
        props.setProperty('AUTHORIZED_DOMAINS', JSON.stringify([]));
    }

    // Initialiser tokens vides
    if (!props.getProperty('API_TOKENS')) {
        props.setProperty('API_TOKENS', JSON.stringify({}));
    }

    Logger.log('✅ Système d\'authentification initialisé');
    Logger.log('⚠️ IMPORTANT: Ajoutez au moins un email autorisé avec addAuthorizedEmail()');
}

/**
 * Ajoute l'utilisateur actuel à la liste autorisée
 * Pratique pour le premier démarrage
 */
function authorizeCurrentUser() {
    const email = Session.getActiveUser().getEmail();

    if (!email) {
        throw new Error('Impossible de récupérer l\'email de l\'utilisateur actuel');
    }

    const added = addAuthorizedEmail(email);

    if (added) {
        Logger.log(`✅ Utilisateur ${email} autorisé`);
        Logger.log('Vous pouvez maintenant utiliser l\'interface');
    } else {
        Logger.log(`ℹ️ ${email} est déjà autorisé`);
    }
}

/**
 * Nettoie les tokens expirés
 * À exécuter périodiquement (ex: trigger quotidien)
 */
function cleanupExpiredTokens() {
    const tokens = getAllTokens();
    let cleaned = 0;

    Object.keys(tokens).forEach(token => {
        const tokenData = tokens[token];
        const expiryDate = new Date(tokenData.expiresAt);

        if (expiryDate < new Date()) {
            delete tokens[token];
            cleaned++;
        }
    });

    if (cleaned > 0) {
        saveTokens(tokens);
        Logger.log(`✅ ${cleaned} token(s) expiré(s) supprimé(s)`);
    }
}

// ========================================
// FONCTIONS DE DIAGNOSTIC
// ========================================

/**
 * Affiche l'état de l'authentification
 */
function showAuthStatus() {
    Logger.log('=== ÉTAT DE L\'AUTHENTIFICATION ===');
    Logger.log('');

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