const { Client, GatewayIntentBits, Partials, InteractionType, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');
const autorole = require('./autorole');
const rolesModule = require('./roles');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// Slash command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Configure autorole settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to autorole list')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from autorole list')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delay')
                .setDescription('Set delay before assigning roles')
                .addIntegerOption(option =>
                    option
                        .setName('seconds')
                        .setDescription('Delay in seconds (0 = no delay)')
                        .setRequired(true)
                        .setMinValue(0)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ignorebots')
                .setDescription('Toggle whether to ignore bot accounts')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable bot filtering')
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName('rolemenu')
        .setDescription('Manage interactive role menus')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new role menu button')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to toggle')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('label')
                        .setDescription('Button label (defaults to role name)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('addbutton')
                .setDescription('Add a button to an existing role menu')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('The message ID of the menu')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to toggle')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('label')
                        .setDescription('Button label (defaults to role name)')
                        .setRequired(false)
                )
        )
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Register slash commands globally
    try {
        console.log('Registering slash commands...');
        await client.application.commands.set(commands);
        console.log('Slash commands registered successfully');
    } catch (err) {
        console.error('Failed to register slash commands', err);
    }

    // Clean up stale role menus
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

client.on('interactionCreate', async interaction => {
    try {
        // Handle button clicks for role menus
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
            return;
        }

        // Handle slash commands
        if (!interaction.isChatInputCommand()) return;

        const { commandName, options } = interaction;

        if (commandName === 'autorole') {
            const subcommand = options.getSubcommand();
            switch (subcommand) {
                case 'add': {
                    const role = options.getRole('role');
                    autorole.setRole(interaction.guild, role.id);
                    return interaction.reply(`✅ Autorole will now grant **${role.name}** on join.`);
                }
                case 'remove': {
                    const role = options.getRole('role');
                    autorole.removeRole(interaction.guild, role.id);
                    return interaction.reply(`✅ Removed **${role.name}** from autorole list.`);
                }
                case 'delay': {
                    const secs = options.getInteger('seconds');
                    autorole.setDelay(interaction.guild, secs);
                    return interaction.reply(`✅ Autorole delay set to ${secs} second(s).`);
                }
                case 'ignorebots': {
                    const flag = options.getBoolean('enabled');
                    autorole.setIgnoreBots(interaction.guild, flag);
                    return interaction.reply(`✅ Autorole ignorebots set to ${flag}.`);
                }
            }
        } else if (commandName === 'rolemenu') {
            const subcommand = options.getSubcommand();
            if (subcommand === 'create') {
                const role = options.getRole('role');
                const label = options.getString('label');
                try {
                    // Create a dummy message object that has the required properties
                    const messageObj = {
                        guild: interaction.guild,
                        channel: interaction.channel,
                        send: async (opts) => {
                            return await interaction.channel.send(opts);
                        }
                    };
                    await rolesModule.createRoleMenu(messageObj, role, label);
                    return interaction.reply('✅ Role menu created in this channel.');
                } catch (err) {
                    console.error('Failed to create role menu', err);
                    return interaction.reply({ content: 'There was an error creating the role menu.', ephemeral: true });
                }
            } else if (subcommand === 'addbutton') {
                const messageId = options.getString('message_id');
                const role = options.getRole('role');
                const label = options.getString('label');
                try {
                    await rolesModule.addButtonToMenu(interaction.channel, messageId, role, label);
                    return interaction.reply(`✅ Added **${label || role.name}** button to the menu.`);
                } catch (err) {
                    console.error('Failed to add button to menu', err);
                    return interaction.reply({ content: 'Could not find that message or add the button.', ephemeral: true });
                }
            }
        }
    } catch (err) {
        console.error('Error handling interaction', err);
        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
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

