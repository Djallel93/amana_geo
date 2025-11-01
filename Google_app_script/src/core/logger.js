/**
 * Système de logging unifié
 */

const Logger = {
    LEVELS: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },

    currentLevel: 1, // INFO par défaut

    log(level, message, data = null) {
        if (level < this.currentLevel) return;

        const timestamp = new Date().toISOString();
        const levelName = Object.keys(this.LEVELS).find(k => this.LEVELS[k] === level);
        const prefix = `[${timestamp}] [${levelName}]`;

        let output = `${prefix} ${message}`;

        if (data) {
            output += `\n${JSON.stringify(data, null, 2)}`;
        }

        console.log(output);
    },

    debug(message, data) {
        this.log(this.LEVELS.DEBUG, `🔍 ${message}`, data);
    },

    info(message, data) {
        this.log(this.LEVELS.INFO, `ℹ️ ${message}`, data);
    },

    warn(message, data) {
        this.log(this.LEVELS.WARN, `⚠️ ${message}`, data);
    },

    error(message, data) {
        this.log(this.LEVELS.ERROR, `❌ ${message}`, data);
    },

    success(message, data) {
        this.log(this.LEVELS.INFO, `✅ ${message}`, data);
    }
};