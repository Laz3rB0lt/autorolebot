const storage = require('./storage');

/**
 * Update one of the autorole settings for a guild.
 */
function setRole(guild, roleId) {
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, guild.id);
    if (!guildData.autorole.roles.includes(roleId)) {
        guildData.autorole.roles.push(roleId);
        storage.saveData(data);
    }
}

function removeRole(guild, roleId) {
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, guild.id);
    guildData.autorole.roles = guildData.autorole.roles.filter(r => r !== roleId);
    storage.saveData(data);
}

function setDelay(guild, seconds) {
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, guild.id);
    guildData.autorole.delay = seconds;
    storage.saveData(data);
}

function setIgnoreBots(guild, flag) {
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, guild.id);
    guildData.autorole.ignoreBots = flag;
    storage.saveData(data);
}

async function handleMemberAdd(member) {
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, member.guild.id);

    if (member.user.bot && guildData.autorole.ignoreBots) return;

    let rolesToGive = [...guildData.autorole.roles];

    // reapply previous roles if any
    if (guildData.previousRoles && guildData.previousRoles[member.id]) {
        rolesToGive = rolesToGive.concat(guildData.previousRoles[member.id]);
        delete guildData.previousRoles[member.id];
        storage.saveData(data);
    }

    if (rolesToGive.length === 0) return;

    const apply = () => {
        rolesToGive.forEach(async roleId => {
            try {
                const role = member.guild.roles.cache.get(roleId);
                if (!role) return;
                await member.roles.add(role).catch(() => {});
            } catch (err) {
                // hierarchy or other error - log and continue
                console.error('Failed to add autorole', err);
            }
        });
    };

    if (guildData.autorole.delay && guildData.autorole.delay > 0) {
        setTimeout(apply, guildData.autorole.delay * 1000);
    } else {
        apply();
    }
}

function handleMemberRemove(member) {
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, member.guild.id);

    // store current roles (exclude @everyone)
    const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .map(r => r.id);
    guildData.previousRoles = guildData.previousRoles || {};
    guildData.previousRoles[member.id] = roles;
    storage.saveData(data);
}

module.exports = {
    setRole,
    removeRole,
    setDelay,
    setIgnoreBots,
    handleMemberAdd,
    handleMemberRemove
};
