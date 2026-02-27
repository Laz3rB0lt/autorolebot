const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const storage = require('./storage');

/**
 * Create a new role menu message in a channel and persist it.
 * @param {Message|Object} messageOrObj - message object or object with guild, channel, and send() method
 * @param {Role} role - the role to toggle
 * @param {string} label - optional button label
 */
async function createRoleMenu(messageOrObj, role, label) {
    const guild = messageOrObj.guild;
    const channel = messageOrObj.channel;
    const send = messageOrObj.send || (opts => channel.send(opts));

    const button = new ButtonBuilder()
        .setCustomId(`roleMenu:${guild.id}:${role.id}`)
        .setLabel(label || role.name)
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    const sent = await send({
        content: `Click the button to toggle **${role.name}**`,
        components: [row]
    });

    // persist menu info so we can clean up later if needed
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, guild.id);
    guildData.roleMenus = guildData.roleMenus || [];
    guildData.roleMenus.push({
        messageId: sent.id,
        channelId: sent.channel.id,
        roleId: role.id,
        label: label || role.name
    });
    storage.saveData(data);
}

module.exports = {
    createRoleMenu
};