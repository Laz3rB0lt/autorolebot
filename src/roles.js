const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const storage = require('./storage');

/**
 * Create a new role menu message in a channel and persist it.
 * @param {Message} message - the originating command message
 * @param {Role} role - the role to toggle
 * @param {string} label - optional button label
 */
async function createRoleMenu(message, role, label) {
    const button = new ButtonBuilder()
        .setCustomId(`roleMenu:${message.guild.id}:${role.id}`)
        .setLabel(label || role.name)
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    const sent = await message.channel.send({
        content: `Click the button to toggle **${role.name}**`,
        components: [row]
    });

    // persist menu info so we can clean up later if needed
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, message.guild.id);
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