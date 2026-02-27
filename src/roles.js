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
        content: `Click the buttons to toggle roles`,
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

/**
 * Add a button to an existing role menu message.
 * @param {Channel} channel - the text channel
 * @param {string} messageId - the message ID to edit
 * @param {Role} role - the role to toggle
 * @param {string} label - optional button label
 */
async function addButtonToMenu(channel, messageId, role, label) {
    const message = await channel.messages.fetch(messageId);
    if (!message) throw new Error('Message not found');

    // Get existing buttons from the message
    const existingRows = message.components || [];
    const buttons = [];

    // Collect all existing buttons
    for (const row of existingRows) {
        for (const component of row.components) {
            if (component.type === 2) { // Button type
                buttons.push(component);
            }
        }
    }

    // Create new button
    const newButton = new ButtonBuilder()
        .setCustomId(`roleMenu:${message.guildId}:${role.id}`)
        .setLabel(label || role.name)
        .setStyle(ButtonStyle.Primary);

    buttons.push(newButton);

    // Organize buttons into rows (5 per row max)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const rowButtons = buttons.slice(i, i + 5);
        rows.push(new ActionRowBuilder().addComponents(rowButtons));
    }

    // Edit the message
    await message.edit({ components: rows });

    // Update storage
    const data = storage.loadData();
    const guildData = storage.ensureGuild(data, message.guildId);
    guildData.roleMenus = guildData.roleMenus || [];
    
    // Add to stored menus if not already there
    const exists = guildData.roleMenus.some(m => m.messageId === messageId && m.roleId === role.id);
    if (!exists) {
        guildData.roleMenus.push({
            messageId: messageId,
            channelId: channel.id,
            roleId: role.id,
            label: label || role.name
        });
        storage.saveData(data);
    }
}

module.exports = {
    createRoleMenu,
    addButtonToMenu
};