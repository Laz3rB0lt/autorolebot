const fs = require('fs');
const path = require('path');

// simple JSON-backed storage helper
const dataPath = path.join(__dirname, '..', 'data.json');

/**
 * Loads the entire data file (synchronously) and returns the parsed object.
 * If the file does not exist or is invalid JSON, an empty object is returned.
 */
function loadData() {
    try {
        if (!fs.existsSync(dataPath)) {
            return {};
        }
        const raw = fs.readFileSync(dataPath, 'utf-8');
        return JSON.parse(raw || '{}');
    } catch (err) {
        console.error('Failed to load data.json, returning empty object', err);
        return {};
    }
}

/**
 * Saves the provided object to disk, overwriting the previous contents.
 */
function saveData(data) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Failed to save data.json', err);
    }
}

/**
 * Ensure the guild record exists in the dataset with defaults.
 * Returns the guild-specific object.
 */
function ensureGuild(data, guildId) {
    if (!data[guildId]) {
        data[guildId] = {
            autorole: {
                roles: [],       // array of role IDs to grant on join
                delay: 0,        // seconds
                ignoreBots: true // whether to skip bot accounts
            },
            previousRoles: {},   // memberId -> [roleId,...]
            roleMenus: []        // stored menus for persistence
        };
    }
    return data[guildId];
}

module.exports = {
    loadData,
    saveData,
    ensureGuild
};
