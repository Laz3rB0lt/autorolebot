const { Client, GatewayIntentBits, Partials, InteractionType } = require('discord.js');
const storage = require('./storage');
const autorole = require('./autorole');
const rolesModule = require('./roles');

// command prefix
const PREFIX = '!';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // clean up any menus whose messages have been deleted
    const data = storage.loadData();
    let dirty = false;
    for (const guildId of Object.keys(data)) {
        const guildData = data[guildId];
        if (!guildData.roleMenus) continue;
        const newMenus = [];
        for (const menu of guildData.roleMenus) {
            try {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) continue;
                const channel = await guild.channels.fetch(menu.channelId);
                if (!channel || !channel.isTextBased()) continue;
                await channel.messages.fetch(menu.messageId);
                newMenus.push(menu);
            } catch (err) {
                console.log('Removing stale role menu', menu, err.message);
                dirty = true;
            }
        }
        guildData.roleMenus = newMenus;
    }
    if (dirty) storage.saveData(data);
});

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    // require manage guild or admin for configuration commands
    const isAdmin = message.member.permissions.has('ManageGuild');

    if (command === 'autorole') {
        if (!isAdmin) return message.reply('You do not have permission to use this command.');
        const sub = args.shift();
        switch (sub) {
            case 'add': {
                const roleArg = args.join(' ');
                const role =
                    message.mentions.roles.first() ||
                    message.guild.roles.cache.get(roleArg) ||
                    message.guild.roles.cache.find(r => r.name === roleArg);
                if (!role) return message.reply('Role not found');
                autorole.setRole(message.guild, role.id);
                return message.reply(`Autorole will now grant **${role.name}** on join.`);
            }
            case 'remove': {
                const roleArg = args.join(' ');
                const role =
                    message.mentions.roles.first() ||
                    message.guild.roles.cache.get(roleArg) ||
                    message.guild.roles.cache.find(r => r.name === roleArg);
                if (!role) return message.reply('Role not found');
                autorole.removeRole(message.guild, role.id);
                return message.reply(`Removed **${role.name}** from autorole list.`);
            }
            case 'delay': {
                const secs = parseInt(args[0], 10);
                if (isNaN(secs) || secs < 0) return message.reply('Please supply a valid number of seconds.');
                autorole.setDelay(message.guild, secs);
                return message.reply(`Autorole delay set to ${secs} second(s).`);
            }
            case 'ignorebots': {
                const flag = args[0] && args[0].toLowerCase() === 'true';
                autorole.setIgnoreBots(message.guild, flag);
                return message.reply(`Autorole ignorebots set to ${flag}.`);
            }
            default:
                return message.reply(
                    '**Usage:**\n' +
                        '!autorole add <role>\n' +
                        '!autorole remove <role>\n' +
                        '!autorole delay <seconds>\n' +
                        '!autorole ignorebots <true|false>'
                );
        }
    } else if (command === 'rolemenu') {
        if (!isAdmin) return message.reply('You do not have permission to use this command.');
        const sub = args.shift();
        if (sub === 'create') {
            const roleArg = args.shift();
            if (!roleArg) return message.reply('Please specify a role to create a menu for.');
            const label = args.join(' ');
            const role =
                message.mentions.roles.first() ||
                message.guild.roles.cache.get(roleArg) ||
                message.guild.roles.cache.find(r => r.name === roleArg);
            if (!role) return message.reply('Role not found');
            try {
                await rolesModule.createRoleMenu(message, role, label);
                return message.reply('Role menu created.');
            } catch (err) {
                console.error('Failed to create role menu', err);
                return message.reply('There was an error creating the role menu.');
            }
        } else {
            return message.reply('**Usage:**\n!rolemenu create <role> [label]');
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.type === InteractionType.MessageComponent && interaction.isButton()) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'roleMenu') return;
        const roleId = parts[2];
        const member = interaction.member;
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            return interaction.reply({ content: 'Role no longer exists.', ephemeral: true });
        }
        try {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
                await interaction.reply({ content: `Removed **${role.name}**`, ephemeral: true });
            } else {
                await member.roles.add(roleId);
                await interaction.reply({ content: `Granted **${role.name}**`, ephemeral: true });
            }
        } catch (err) {
            console.error('Toggle role failed', err);
            await interaction.reply({ content: 'Unable to update your roles. (Hierarchy?)', ephemeral: true });
        }
    }
});

client.on('guildMemberAdd', member => {
    autorole.handleMemberAdd(member);
});

client.on('guildMemberRemove', member => {
    autorole.handleMemberRemove(member);
});

// log errors to prevent crash
process.on('unhandledRejection', err => {
    console.error('Unhandled promise rejection', err);
});

// start bot - token from environment variable
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('BOT_TOKEN environment variable not set');
    process.exit(1);
}
client.login(token);
