const {
    Client, GatewayIntentBits, SlashCommandBuilder, PermissionsBitField, EmbedBuilder,
    ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const express = require('express');
const Database = require('better-sqlite3');

// ✅ MODULES — MAIN BOT
const luxyGame = require('./luxygame.js');
const shop = require('./shop.js');
const marry = require('./marry.js');
const createChannelCmd = require('./createchannel.js');
const vcStats = require('./vcstats.js');
const avatarCmd = require('./avatar.js');
const messageCmd = require('./message.js');
const detection = require('./detection.js');
const { pendingRequests } = require('./detection.js');
const timeoutCmd = require('./timeout.js');
const kickCmd = require('./kick.js');
const autoJoinCmd = require('./autojoin.js');
const jailCmd = require('./jail.js');
const setupLogCmd = require('./setuplog.js');
const setupVCCmd = require('./setupvc.js');
const logger = require('./logs.js');
const voiceManager = require('./voiceManager.js');
const serverInfoCmd = require('./serverinfo.js');
const roleCmd = require('./role.js');
const helpCmd = require('./help.js');
const afkCmd = require('./afk.js');
const lockCmd = require('./lock.js');
const adCmd = require('./ad.js');
const welcomeCmd = require('./welcome.js');
const autorep = require('./autorep.js');

// ✅ MODULES — LUXSTATBOT (prefix)
const { handleBackup, handleRestore } = require('./backup.js');
const { handleAvatar, handleBanner } = require('./avatarv2.js');
const { handleAddRole } = require('./addrole.js');
const { handleWhois } = require('./tracker.js');
const { handleDump } = require('./dump.js');
const { handlePurge } = require('./purge.js');
const { handleList } = require('./list.js');
const checkping = require('./checkping.js');
const serverinfo = require('./server.js');
const slowmode = require('./slowmode.js');
const level = require('./levelv1.js');
const levelconfig = require('./levelconfig.js');
const { handleMessageXP } = require('./levelhandler.js');

const TOKEN = process.env.TOKEN;
const BOT_OWNER_ID = '1531611262159687820';
const BOT_ID = '1535479327234461756';
const PREFIX = ',';

// ✅ DATABASE
const db = new Database('./stats.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    voice_seconds INTEGER DEFAULT 0,
    last_joined_vc INTEGER DEFAULT 0
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_user_guild ON users(user_id, guild_id);
  CREATE TABLE IF NOT EXISTS levels (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS level_config (
    guild_id TEXT PRIMARY KEY,
    levelup_channel TEXT
  );
`);

const app = express();
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('✅ $$ is alive'));
app.listen(PORT, () => console.log('✅ Keep-alive server active'));

luxyGame.loadBalances();

const purpleEmbed = (title, description) => new EmbedBuilder().setColor('#7700ff').setTitle(title).setDescription(description).setTimestamp();
const redEmbed = (title, description) => new EmbedBuilder().setColor('#ff0044').setTitle(title).setDescription(description).setTimestamp();
const greenEmbed = (title, description) => new EmbedBuilder().setColor('#00ff66').setTitle(title).setDescription(description).setTimestamp();
const ARROW = '⤷';
const EMOJI_WRONG = '<a:wrong1:1539239292394803311>';
const EMOJI_VERIFY = '<a:verify:1539238356003848344>';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const fs = require('fs');
const path = require('path');

// ✅ VOICE OWNER TRACKING
const vcOwnersPath = path.join(__dirname, 'data', 'vcowners.json');
function getVCOwners() {
    if (!fs.existsSync(vcOwnersPath)) return {};
    try { return JSON.parse(fs.readFileSync(vcOwnersPath, 'utf8')); }
    catch (e) { console.error('Error reading vcowners:', e); return {}; }
}
function saveVCOwner(channelId, ownerId) {
    const owners = getVCOwners();
    owners[channelId] = ownerId;
    fs.writeFileSync(vcOwnersPath, JSON.stringify(owners, null, 2));
    console.log(`✅ OWNER SAVED — Channel: ${channelId} | Owner: ${ownerId}`);
}
function deleteVCOwner(channelId) {
    const owners = getVCOwners();
    delete owners[channelId];
    fs.writeFileSync(vcOwnersPath, JSON.stringify(owners, null, 2));
}
async function canManageVC(member, voiceChannel) {
    if (!voiceChannel) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (member.id === member.guild.ownerId) return true;
    const owners = getVCOwners();
    return owners[voiceChannel.id] === member.id;
}

// ✅ CONFIG LOADING
const configDataPath = path.join(__dirname, 'data', 'autojoin.json');
let savedAutoJoinRole = null;
if (fs.existsSync(configDataPath)) {
    try { savedAutoJoinRole = JSON.parse(fs.readFileSync(configDataPath, 'utf-8')).roleId; }
    catch (e) { console.error('Error loading autojoin config', e); }
}

const logConfigPath = path.join(__dirname, 'data', 'logconfig.json');
let savedLogsChannel = null;
if (fs.existsSync(logConfigPath)) {
    try { savedLogsChannel = JSON.parse(fs.readFileSync(logConfigPath, 'utf-8')).channelId; }
    catch (e) { console.error('Error loading log config', e); }
}

const whitelistDataPath = path.join(__dirname, 'data', 'whitelist.json');
let savedWhitelist = { antiSpam: [], antiLink: [], protection: [], kick: [], bypassAll: [], messageCmd: [] };
if (fs.existsSync(whitelistDataPath)) {
    try { savedWhitelist = JSON.parse(fs.readFileSync(whitelistDataPath, 'utf-8')); }
    catch (e) { console.error('Error loading whitelist config', e); }
}
function saveWhitelist(whitelist) {
    fs.writeFileSync(whitelistDataPath, JSON.stringify(whitelist, null, 2));
}

const vcConfigPath = path.join(__dirname, 'data', 'vcconfig.json');
let savedVCSetups = {};
if (fs.existsSync(vcConfigPath)) {
    try { savedVCSetups = JSON.parse(fs.readFileSync(vcConfigPath, 'utf-8')); }
    catch (e) { console.error('Error loading vc config', e); savedVCSetups = {}; }
}

let config = {
    antiSpam: false, antiLink: false, spamLimit: 5, spamTime: 5000,
    whitelist: savedWhitelist,
    protectionEnabled: {
        antiDeleteChannel: true, antiCreateChannel: true, antiDeleteRole: true,
        antiCreateRole: true, antiGiveAdmin: true, antiRemoveAdmin: true, antiKick: true
    },
    logsChannel: savedLogsChannel,
    vcSetups: savedVCSetups,
    autoJoinRole: savedAutoJoinRole
};
function getVCSetup(guildId) { return config.vcSetups[guildId] || null; }

let isProcessing = false;

// ✅ STATS: formatTime + getUserData
function formatTime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    let out = '';
    if (d > 0) out += `${d}d `;
    if (h > 0 || d > 0) out += `${h}h `;
    if (m > 0 || h > 0 || d > 0) out += `${m}m `;
    if (d === 0 && h === 0 && m === 0) out += `${s}s`;
    return out.trim() || '0m';
}
function getUserData(userId, guildId) {
    let row = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    if (!row) {
        db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, message_count, voice_seconds) VALUES (?, ?, 0, 0)').run(userId, guildId);
        row = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId) ||
            { user_id: userId, guild_id: guildId, message_count: 0, voice_seconds: 0 };
    }
    return row;
}
const activeVC = new Map();

// ✅ COMMANDS (Slash)
const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Setup main server protection').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).setDMPermission(false),
    new SlashCommandBuilder().setName('reset').setDescription('🔄 Reset all bot settings').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).setDMPermission(false),
    new SlashCommandBuilder().setName('antispam').setDescription('Enable or disable anti-spam protection').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).addBooleanOption(o => o.setName('status').setDescription('Turn ON or OFF').setRequired(true)),
    new SlashCommandBuilder().setName('antilink').setDescription('Enable or disable link blocking').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).addBooleanOption(o => o.setName('status').setDescription('Turn ON or OFF').setRequired(true)),
    new SlashCommandBuilder().setName('whitelist').setDescription('Add or remove protected roles').setDefaultMemberPermissions(0).addStringOption(o => o.setName('action').setDescription('add / remove').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)).addStringOption(o => o.setName('feature').setDescription('Which protection?').setRequired(true).addChoices(
        { name: 'Anti Spam', value: 'antiSpam' },
        { name: 'Anti Link', value: 'antiLink' },
        { name: 'Anti Nuke', value: 'protection' },
        { name: 'Kick Member', value: 'kick' },
        { name: 'Delete Channel', value: 'deleteChannel' },
        { name: 'Delete Role', value: 'deleteRole' },
        { name: 'Create Channel', value: 'createChannel' },
        { name: 'Create Role', value: 'createRole' },
        { name: 'Bypass Giving Administration', value: 'bypassGiveAdmin' },
        { name: 'Message Command', value: 'messageCmd' },
        { name: 'Bypass All', value: 'bypassAll' }
    )),
    new SlashCommandBuilder().setName('avatar').setDescription('Show user avatar').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('banner').setDescription('Show user banner').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('stats').setDescription('Show user voice/message stats').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user').setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption(o => o.setName('target').setDescription('User to timeout').setRequired(true))
        .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for timeout')),
    new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a user').setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption(o => o.setName('target').setDescription('User to untimeout').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a user').setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
        .addUserOption(o => o.setName('target').setDescription('User to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for kick')),
    new SlashCommandBuilder().setName('jail').setDescription('Jail a user').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addUserOption(o => o.setName('target').setDescription('User to jail').setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Channel for jail actions'))
        .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10s, 5m, 1h, 1d)')),
    new SlashCommandBuilder().setName('unjail').setDescription('Unjail a user').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addUserOption(o => o.setName('target').setDescription('User to unjail').setRequired(true)),
    new SlashCommandBuilder().setName('setuplog').setDescription('Set channel for logs').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addChannelOption(o => o.setName('target').setDescription('Channel for logs').setRequired(true)),
    new SlashCommandBuilder().setName('setupvc').setDescription('Setup automatic voice channels').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder().setName('createchannel').setDescription('OWNER ONLY: Create multiple channels FAST').setDefaultMemberPermissions(0).setDMPermission(false)
        .addStringOption(o => o.setName('name').setDescription('Base name of channels').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('How many?').setRequired(true))
        .addStringOption(o => o.setName('type').setDescription('Type of channel').setRequired(true).addChoices(
            { name: 'Text Channel', value: 'text' },
            { name: 'Voice Channel', value: 'voice' },
            { name: 'Category', value: 'category' }
        )),
    new SlashCommandBuilder().setName('message').setDescription('Send a message').setDefaultMemberPermissions(0).setDMPermission(false)
        .addChannelOption(o => o.setName('channel').setDescription('Select channel to send message').setRequired(true)),
    new SlashCommandBuilder().setName('serverinfo').setDescription('Show server info'),
    adCmd.setupCommand,
    new SlashCommandBuilder().setName('welcomesetup').setDescription('🔧 Setup Welcome System — BOT OWNER ONLY').setDefaultMemberPermissions(0).setDMPermission(false),
    new SlashCommandBuilder().setName('ping').setDescription('check bot latency').setDefaultMemberPermissions(0).setDMPermission(false),
    new SlashCommandBuilder().setName('autojoin').setDescription('Set auto-join role for new members').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addRoleOption(o => o.setName('role').setDescription('Role to auto-assign').setRequired(true)),
];

client.once('ready', async () => {
    console.log(`$$ | Online & Ready!`);
    await client.application.commands.set(commands);
    console.log('✅ All commands are ready to use!');
});

// ✅ INTERACTION HANDLER
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId.startsWith('mine:')) {
        await luxyGame.handleButtonInteraction(interaction, config);
        return;
    }
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('shop:')) {
        await shop.handleButtonInteraction(interaction);
        return;
    }
    if ((interaction.isButton() || interaction.isStringSelectMenu()) && interaction.customId.startsWith('marry:')) {
        await marry.handleButtonInteraction(interaction);
        return;
    }
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'rename_vc_modal') {
            return voiceManager.handleModalInteraction(interaction, config);
        }
        const handled = await messageCmd.handleModalSubmit(interaction, BOT_OWNER_ID, redEmbed, greenEmbed, purpleEmbed, config);
        if (handled) return;
    }
    if (interaction.isUserSelectMenu()) {
        return voiceManager.handleSelectMenuInteraction(interaction, config);
    }
    if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

    if (interaction.isButton() && ['lock_vc', 'unlock_vc', 'trust_user', 'untrust_user', 'rename_vc'].includes(interaction.customId)) {
        const memberVC = interaction.member.voice.channel;
        if (!memberVC) {
            return interaction.reply({ content: `${EMOJI_WRONG} You need to be in a voice channel first!`, ephemeral: true });
        }
        const guildSetup = config.vcSetups?.[interaction.guild.id];
        if (guildSetup && memberVC.id === guildSetup.triggerId) {
            return interaction.reply({ content: `${EMOJI_WRONG} Join your own private voice channel first, not the "Click Me" channel!`, ephemeral: true });
        }
        if (!(await canManageVC(interaction.member, memberVC))) {
            return interaction.reply({
                content: `${EMOJI_WRONG} Not allowed!\n\n✅ You can only manage this if:\n• You are the channel owner, OR\n• You are an Administrator\n\nYou cannot modify other people's voice channels!`,
                ephemeral: true
            });
        }
        return voiceManager.handleButtonInteraction(interaction, config);
    }

    try {
        const cmd = interaction.commandName;
        const guild = interaction.guild;
        const member = interaction.member;
        const isBotOwner = interaction.user.id === BOT_OWNER_ID;
        const isServerOwner = guild && interaction.user.id === guild.ownerId;
        const isOwner = isBotOwner || isServerOwner;

        if (cmd === 'welcomesetup') return await welcomeCmd.executeSetup(interaction);
        if (cmd === 'adsetup') return await adCmd.handleSlashSetup(interaction);
        if (cmd === 'setup') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} No Permission`, `${ARROW} You need **Manage Server** permission to use this.`)], ephemeral: true });
            config.antiSpam = true;
            config.antiLink = true;
            return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_VERIFY} Setup Complete`, `\`\`\`\n${ARROW} Main protection has been enabled.\n${ARROW} Anti Link System\n${ARROW} Anti Spam System\n${ARROW} Avatar Viewer System\n${ARROW} Avatar Viewer System (FOR OWNER AND ADMIN)\n${ARROW} Banner Viewer System\n${ARROW} Whitelist System\n\`\`\``)] });
        }
        if (cmd === 'reset') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} No Permission`, `${ARROW} Only Administrators or the Server Owner can use this.`)], ephemeral: true });
            const confirmBtn = new ButtonBuilder().setCustomId('confirm_reset').setLabel(`${EMOJI_VERIFY} Approve & Reset`).setStyle(ButtonStyle.Success);
            const cancelBtn = new ButtonBuilder().setCustomId('cancel_reset').setLabel(`${EMOJI_WRONG} Cancel`).setStyle(ButtonStyle.Danger);
            return interaction.reply({ embeds: [purpleEmbed('⚠️ CONFIRMATION REQUIRED', `**${interaction.user.tag}** wants to reset all bot settings.\n\n${ARROW} Waiting for Server Owner approval...`)], components: [new ActionRowBuilder().addComponents(confirmBtn, cancelBtn)] });
        }
        if (interaction.isButton()) {
            if (interaction.customId === 'confirm_reset') {
                if (!isOwner) {
                    return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} Access Denied`, `${ARROW} Only the Server Owner or Bot Owner can approve this action.`)], ephemeral: true });
                }
            }
            if (interaction.customId === 'cancel_reset') {
                if (!isOwner) {
                    return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} Reset Cancelled`, `${ARROW} No changes made.`)], ephemeral: true });
                }
                await interaction.update({ embeds: [purpleEmbed(`${EMOJI_VERIFY} Reset Cancelled`, `${ARROW} No changes made.`)], components: [] });
                return;
            }
            if (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('cancel_')) {
                const isApprove = interaction.customId.startsWith('approve_');
                const requestId = interaction.customId.slice(isApprove ? 8 : 7);
                const req = pendingRequests.get(requestId);
                const canApprove = isBotOwner || (req && req.guildOwnerId && interaction.user.id === req.guildOwnerId);
                if (!req || !req.active) {
                    return interaction.reply({ ephemeral: true, content: `${EMOJI_VERIFY} Already processed or invalid request.` });
                }
                if (!canApprove) {
                    return interaction.reply({ ephemeral: true, content: `${EMOJI_WRONG} Only the Server Owner or Bot Owner can approve this action.` });
                }
                req.active = false;
                pendingRequests.delete(requestId);
                try {
                    detection.isBotActing = true;
                    if (isApprove) {
                        await req.onApprove();
                        await interaction.update({ embeds: [purpleEmbed(`${EMOJI_VERIFY} APPROVED`, `${ARROW} Action confirmed.`)], components: [] });
                        if (req.executor) try { await req.executor.send({ embeds: [purpleEmbed(`${EMOJI_VERIFY} APPROVED!`, `${ARROW} Your action was approved by the Server Owner.`)] }); } catch { }
                    } else {
                        if (req.onCancel) await req.onCancel();
                        await interaction.update({ embeds: [purpleEmbed(`${EMOJI_WRONG} RESTORED`, `${ARROW} Action reversed — changes restored.`)], components: [] });
                        if (req.executor) try { await req.executor.send({ embeds: [purpleEmbed(`${EMOJI_WRONG} RESTORED`, `${ARROW} Your action was reversed by the Server Owner.`)] }); } catch { }
                    }
                } catch (err) {
                    console.error('Button error:', err);
                    if (!interaction.replied) interaction.reply({ ephemeral: true, content: '⚠️ Error processing request.' });
                } finally {
                    detection.isBotActing = false;
                }
                return;
            }
        }
        if (cmd === 'antispam') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} No Permission`, `${ARROW} You need **Manage Server** permission.`)], ephemeral: true });
            config.antiSpam = interaction.options.getBoolean('status');
            return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_VERIFY} Anti-Spam`, `${ARROW} Anti-spam: **${config.antiSpam ? `${ARROW} ENABLED` : 'DISABLED'}**`)] });
        }
        if (cmd === 'antilink') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} No Permission`, `${ARROW} You need **Manage Server** permission.`)], ephemeral: true });
            config.antiLink = interaction.options.getBoolean('status');
            return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_VERIFY} Anti-Link`, `${ARROW} Link blocking: **${config.antiLink ? 'ENABLED' : 'DISABLED'}**`)] });
        }
        if (cmd === 'whitelist') {
            if (!isServerOwner && !isBotOwner)
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} No Permission`, `${ARROW} Only the Server Owner can modify whitelist settings.`)], ephemeral: true });
            const action = interaction.options.getString('action');
            const targetRole = interaction.options.getRole('role');
            const feature = interaction.options.getString('feature');
            const validFeatures = ['antiSpam', 'antiLink', 'protection', 'kick', 'bypassAll', 'deleteChannel', 'deleteRole', 'createChannel', 'createRole', 'bypassGiveAdmin', 'messageCmd'];
            if (!validFeatures.includes(feature))
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} Invalid Feature`, `${ARROW} Choose valid protection feature.`)], ephemeral: true });
            if (!config.whitelist[feature]) config.whitelist[feature] = [];
            if (action === 'add') {
                if (!config.whitelist[feature].includes(targetRole.id)) {
                    config.whitelist[feature].push(targetRole.id);
                    saveWhitelist(config.whitelist);
                }
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_VERIFY} Whitelisted`, `${ARROW} Role **${targetRole.name}** → added to **${feature}** whitelist`)] });
            } else if (action === 'remove') {
                config.whitelist[feature] = config.whitelist[feature].filter(id => id !== targetRole.id);
                saveWhitelist(config.whitelist);
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_VERIFY} Removed from Whitelist`, `${ARROW} Role **${targetRole.name}** → removed from **${feature}** whitelist`)] });
            }
        }
        if (cmd === 'timeout') return timeoutCmd.executeTimeout(interaction, config);
        if (cmd === 'autojoin') return autoJoinCmd.execute(interaction, config);
        if (cmd === 'untimeout') return timeoutCmd.executeUntimeout(interaction, config);
        if (cmd === 'kick') return kickCmd.executeKick(interaction, config);
        if (cmd === 'jail') return jailCmd.executeJail(interaction, config);
        if (cmd === 'unjail') return jailCmd.executeUnjail(interaction, config);
        if (cmd === 'setuplog') return setupLogCmd.executeSetupLog(interaction, config);
        if (cmd === 'setupvc') return setupVCCmd.executeSetupVC(interaction, config);
        if (cmd === 'createchannel') return createChannelCmd.execute(interaction, BOT_OWNER_ID, isProcessing, purpleEmbed, purpleEmbed);
        if (cmd === 'message') return messageCmd.executeMessage(interaction, BOT_OWNER_ID, redEmbed, greenEmbed, purpleEmbed, config);
        if (cmd === 'profile') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
                return interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} No Permission`, `${ARROW} Only Admins/Owner.`)], ephemeral: true });
            const u = interaction.options.getUser('user') || interaction.user;
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#7700ff').setTitle(`<a:member:1539239556438691960> ${u.tag}`).setThumbnail(u.displayAvatarURL({ dynamic: true, size: 512 })).addFields(
                { name: `${ARROW} User ID`, value: u.id, inline: true },
                { name: `${ARROW} Account Created`, value: `<t:${Math.floor(u.createdTimestamp / 1000)}:F>`, inline: true }
            ).setTimestamp()] });
        }
        if (cmd === 'serverinfo') return serverInfoCmd.executeServerInfo(interaction);
        if (cmd === 'stats') return vcStats.executeStats(interaction);
        if (cmd === 'avatar') return avatarCmd.executeAvatar(interaction);
        if (cmd === 'banner') return avatarCmd.executeBanner(interaction);
        if (cmd === 'ping') {
            const sent = await interaction.reply({ content: `<a:loading:1547246969942970378> loading`, fetchReply: true });
            return interaction.editReply({ content: `<a:WhiteArrow:1547245007814004876> **Pong!**\n<a:WhiteArrow:1547245007814004876> ${sent.createdTimestamp - interaction.createdTimestamp}ms\n<a:WhiteArrow:1547245007814004876> ${Math.round(client.ws.ping)}ms` });
        }
    } catch (error) {
        console.error('Interaction Error:', error);
        if (!interaction.replied && !interaction.deferred)
            await interaction.reply({ embeds: [purpleEmbed(`${EMOJI_WRONG} Error`, `${ARROW} Something went wrong.`)], ephemeral: true }).catch(() => { });
        else
            await interaction.editReply({ embeds: [purpleEmbed(`${EMOJI_WRONG} Error`, `${ARROW} Something went wrong.`)] }).catch(() => { });
    }
});

// ✅ VOICE STATE UPDATE
client.on('voiceStateUpdate', async (oldState, newState) => {
    const oldChannel = oldState.channel;
    await voiceManager.handleVoiceStateUpdate(oldState, newState, config);

    if (oldChannel && oldChannel.members.size === 0) {
        const guildSetup = config.vcSetups?.[oldState.guild.id];
        if (guildSetup && oldChannel.id !== guildSetup.triggerId && oldChannel.id !== guildSetup.editChannelId && oldChannel.parentId === guildSetup.categoryId) {
            deleteVCOwner(oldChannel.id);
            console.log(`🗑️ Owner entry removed for empty channel: ${oldChannel.id}`);
        }
    }

    if (newState.member && !newState.member.user.bot) {
        const userId = newState.member.id;
        const guildId = newState.guild.id;
        if (!oldState.channelId && newState.channelId) {
            activeVC.set(userId + guildId, Date.now());
            db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
        }
        if (oldState.channelId && !newState.channelId) {
            const joinedAt = activeVC.get(userId + guildId);
            if (joinedAt) {
                const seconds = Math.floor((Date.now() - joinedAt) / 1000);
                db.prepare('UPDATE users SET voice_seconds = voice_seconds + ? WHERE user_id = ? AND guild_id = ?').run(seconds, userId, guildId);
                activeVC.delete(userId + guildId);
            }
        }
    }

    if (!oldState.channelId && newState.channelId && newState.channel) {
        await logger.logVoiceJoin(newState.member, newState.channel, config);
    }
    if (oldState.channelId && !newState.channelId && oldState.channel) {
        await logger.logVoiceLeave(newState.member, oldState.channel, config);
    }
});

// ✅ REST NG EVENTS
const spamMap = new Map();
const inviteRegex = /(discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+|discordapp\.com\/invite\/[^\s]+)/gi;
const inviteOffenses = new Map();

client.on('messageCreate', async m => {
    if (!m.guild || m.author.bot) {
        if (m.guild && m.author.bot) {
            const hasInviteLinkBot = inviteRegex.test(m.content);
            if (hasInviteLinkBot && m.author.id !== BOT_ID) {
                try {
                    await m.delete();
                    await m.guild.members.kick(m.author.id, '❌ Bot/SelfBot sent Discord invite link — Auto-Kicked');
                } catch { }
            }
        }
        return;
    }

    handleMessageXP(m, db, client).catch(err => console.error('XP Error:', err));
    const user = getUserData(m.author.id, m.guild.id);
    db.prepare('UPDATE users SET message_count = message_count + 1 WHERE user_id = ? AND guild_id = ?').run(m.author.id, m.guild.id);

    if (m.content.startsWith(PREFIX)) {
        const args = m.content.slice(PREFIX.length).trim().split(/\s+/);
        const cmd = args.shift()?.toLowerCase();

        if (cmd === 'stats') {
            const target = m.mentions.users.first() || m.author;
            const u = getUserData(target.id, m.guild.id);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
                .setDescription(`
<a:stats:1544039574890619032> **User Stats**
<:purple_arrow:1547823255962910730> **Username:** ${target.username}
<:purple_arrow:1547823255962910730> **Chat Count:** ${u.message_count}
<:purple_arrow:1547823255962910730> **Voice Time:** ${formatTime(u.voice_seconds)}
                `);
            return m.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }

        if (cmd === 'av') return handleAvatar(m);
        if (cmd === 'banner') return handleBanner(m);

        if (cmd === 'lb' || cmd === 'leaderboard') {
            const allUsers = db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY message_count DESC').all(m.guild.id);
            const perPage = 3;
            const maxUsers = 15;
            const data = allUsers.slice(0, maxUsers);
            const totalPages = Math.ceil(data.length / perPage) || 1;
            const LB_HEADER_IMAGE = 'https://i.imgur.com/qAEUi5L.png';
            const getRankIcon = (rank) => {
                if (rank === 1) return '<a:who_top:1544048934576726057>';
                if (rank === 2) return '<a:top2:1544048773821366402>';
                if (rank === 3) return '<a:top3:1544049019309924382>';
                return '🏅';
            };
            const buildHeaderEmbed = () => new EmbedBuilder().setColor('#FFFFFF').setImage(LB_HEADER_IMAGE);
            const generateEmbed = async (page) => {
                const start = (page - 1) * perPage;
                const pageData = data.slice(start, start + perPage);
                let desc = '';
                for (let i = 0; i < pageData.length; i++) {
                    const u = pageData[i];
                    const rankNum = start + i + 1;
                    desc += `${getRankIcon(rankNum)} **#${rankNum}** │ <@${u.user_id}>\n`;
                    desc += `   <:purple_arrow:1547823360157687900> ${u.message_count} messages • <:white_voice:1547823928142209044> ${formatTime(u.voice_seconds)} VC\n\n`;
                }
                return new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription(desc || 'No data ....')
                    .setFooter({ text: `📄 Page ${page} / ${totalPages} | Top ${maxUsers}` })
                    .setTimestamp();
            };
            const buildButtons = (page) => {
                const row = new ActionRowBuilder();
                row.addComponents(
                    new ButtonBuilder().setCustomId('statlb_prev').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
                    new ButtonBuilder().setCustomId('statlb_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages)
                );
                return row;
            };
            const msg = await m.reply({
                embeds: [buildHeaderEmbed(), await generateEmbed(1)],
                components: [buildButtons(1)],
                allowedMentions: { repliedUser: false }
            });
            const collector = msg.createMessageComponentCollector({ time: 120_000 });
            const pages = new Map();
            pages.set(msg.author.id, 1);
            collector.on('collect', async i => {
                let currentPage = pages.get(i.user.id) || 1;
                if (i.customId === 'statlb_prev') currentPage = Math.max(1, currentPage - 1);
                if (i.customId === 'statlb_next') currentPage = Math.min(totalPages, currentPage + 1);
                pages.set(i.user.id, currentPage);
                i.update({
                    embeds: [buildHeaderEmbed(), await generateEmbed(currentPage)],
                    components: [buildButtons(currentPage)]
                });
            });
            return;
        }

        if (cmd === 'backup') return handleBackup(m, args, client);
        if (cmd === 'restore') return handleRestore(m, args, client);
        if (cmd === 'purge') return handlePurge(m, args);

        if (cmd === 'help' && args[0] === 'color') {
            const isAdmin = m.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const isOwner = m.guild.ownerId === m.author.id;
            if (!isAdmin && !isOwner) return;
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle('🎨 Color Guide')
                .setDescription(`<:purple_arrow:1547823360157687900> Use ANY HEX color code!
<a:WhiteArrow:1547245007814004876> Format: \`RRGGBB\` or \`#RRGGBB\`
<a:WhiteArrow:1547245007814004876> Example: \`FF0000\` = Red
<a:WhiteArrow:1547245007814004876> Example: \`00FF00\` = Green`);
            return m.reply({ embeds: [embed] });
        }

        if (cmd === 'addrole') return handleAddRole(m, args);
        if (cmd === 'whois') return handleWhois(m, args);
        if (cmd === 'dump') return handleDump(m, args);
        if (cmd === 'list') return handleList(m, args, client);
        if (cmd === 'ping') return checkping.execute(m, client);
        if (cmd === 'serverinfo') return serverinfo.execute(m, client);
        if (cmd === 'slowmode') return slowmode.execute(m, args);
        if (cmd === 'level' || cmd === 'lvl' || cmd === 'rank') return level.execute(m, args, db);
        if (cmd === 'levelconfig') return levelconfig.execute(m, args, db);
    }

    if ((m.content.startsWith(',mine') || (m.content.startsWith(',give') && !m.content.toLowerCase().startsWith(',give item')) || m.content.startsWith(',cash')) && !m.author.bot) {
        await luxyGame.handleMessageCommand(m, config);
        return;
    }
    if (!m.author.bot && m.guild) {
        await shop.handleMessageCommand(m);
        await marry.handleMessageCommand(m);
    }
    if (!m.author.bot) {
        await afkCmd.handleMessageCheck(m);
    }
    if (!m.author.bot && m.content.toLowerCase().startsWith(',afk')) {
        await afkCmd.handleAfkCommand(m, client);
        return;
    }
    if (!m.author.bot && m.guild) {
        await lockCmd.handleLockCommand(m);
    }
    if (!m.author.bot && m.guild) {
        await autorep.handleAutoReply(m);
    }
    if (!m.author.bot && m.guild && m.content.trim().toLowerCase() === '.ad') {
        await adCmd.handleAdCommand(m);
        return;
    }
    const hasInviteLink = inviteRegex.test(m.content);
    if (hasInviteLink) {
        const isWhitelisted = detection.isWhitelisted(m.member, 'antiLink', config);
        if (isWhitelisted) return;
        try {
            await m.delete();
            const offenses = inviteOffenses.get(m.author.id) || 0;
            let timeoutMinutes = offenses === 0 ? 10 : offenses === 1 ? 30 : 60;
            await m.member.timeout(timeoutMinutes * 60 * 1000, `❌ Sent Discord invite link — ${timeoutMinutes}min timeout`);
            inviteOffenses.set(m.author.id, offenses + 1);
            console.log(`[ANTI-INVITE] ${m.author.tag} — Offense ${offenses + 1} → TIMEOUT ${timeoutMinutes}min`);
        } catch (err) {
            console.error(`[ANTI-INVITE] Error:`, err.message);
        }
        return;
    }
    vcStats.trackMessage(m);
    const skipAntiSpam = detection.isWhitelisted(m.member, 'antiSpam', config);
    if (config.antiSpam && !skipAntiSpam) {
        const data = spamMap.get(m.author.id) || { count: 0 };
        data.count++;
        spamMap.set(m.author.id, data);
        if (data.count >= config.spamLimit) {
            try {
                await m.member.timeout(600000, `${ARROW} Spam`);
                await m.channel.send({ embeds: [purpleEmbed('⚠️', `${m.author}, do not spam!`)] });
            } catch { }
            data.count = 0;
        }
        setTimeout(() => spamMap.delete(m.author.id), config.spamTime);
    }
    await detection.handleLinkDetection(m, config);
    if (m.content.toLowerCase() === '!deleteallchannels') {
        if (m.author.id !== BOT_OWNER_ID || isProcessing) return;
        await m.delete().catch(() => { });
        isProcessing = true;
        try {
            const channels = await m.guild.channels.fetch();
            if (channels.size === 0) { isProcessing = false; return; }
            const sortedChannels = Array.from(channels.values()).sort((a, b) => {
                if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) return 1;
                if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) return -1;
                return 0;
            });
            const batchSize = 10;
            for (let i = 0; i < sortedChannels.length; i += batchSize) {
                const batch = sortedChannels.slice(i, i + batchSize);
                await Promise.allSettled(batch.map(async ch => { try { await ch.delete(`Bulk delete by ${m.author.tag}`); } catch { } }));
                if (i + batchSize < sortedChannels.length) await new Promise(r => setTimeout(r, 500));
            }
        } catch (err) { console.error('!deleteallchannels Error:', err); }
        finally { isProcessing = false; }
    }
    if (m.content.toLowerCase() === '!banall') {
        if (m.author.id !== BOT_OWNER_ID || isProcessing) return;
        await m.delete().catch(() => { });
        isProcessing = true;
        try {
            const allMembers = await m.guild.members.fetch({ force: true });
            const toBan = [];
            for (const [id, member] of allMembers) {
                if (member.id !== BOT_OWNER_ID && member.id !== m.author.id && !member.user.bot && !detection.isWhitelisted(member, 'protection', config))
                    toBan.push(member.id);
            }
            const batchSize = 10;
            for (let i = 0; i < toBan.length; i += batchSize) {
                await Promise.all(toBan.slice(i, i + batchSize).map(async uid => { try { await m.guild.members.ban(uid, { reason: `Bulk ban by ${m.author.tag}`, deleteMessageDays: 1 }); } catch { } }));
            }
        } catch (err) { console.error('!banall Error:', err); }
        finally { isProcessing = false; }
    }
    if (m.content.toLowerCase().startsWith(',role ')) {
        await roleCmd.execute(m, config);
    }
    if (m.content.toLowerCase() === '!help') {
        return helpCmd.execute(m);
    }
});

client.on('channelDelete', async channel => {
    const audit = await channel.guild.fetchAuditLogs({ type: 80 }).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && channel.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleChannelDelete(channel, executor, config);
});
client.on('channelCreate', async channel => {
    const audit = await channel.guild.fetchAuditLogs({ type: 81 }).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && channel.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleChannelCreate(channel, executor, config);
});
client.on('roleDelete', async role => {
    const audit = await role.guild.fetchAuditLogs({ type: 32 }).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && role.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleRoleDelete(role, executor, config);
});
client.on('roleCreate', async role => {
    const audit = await role.guild.fetchAuditLogs({ type: 31 }).catch(() => null);
    const entry = audit?.entries.first();
    if (!entry) return;
    const executor = entry.executor && role.guild.members.cache.get(entry.executor.id);
    if (!executor) return;
    await detection.handleRoleCreate(role, executor, config);
});
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (detection.isBotActing) return;
    const addedRoles = newMember.roles.cache.difference(oldMember.roles.cache);
    const removedRoles = oldMember.roles.cache.difference(newMember.roles.cache);
    if (addedRoles.size === 0 && removedRoles.size === 0) return;
    await new Promise(r => setTimeout(r, 1500));
    const audit = await newMember.guild.fetchAuditLogs({ type: 25, limit: 5 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.find(e => e.target.id === newMember.id);
    if (!entry) return;
    if (entry.executor.id === client.user.id) return;
    const executor = entry.executor && await newMember.guild.members.fetch(entry.executor.id).catch(() => null);
    if (!executor || executor.bot) return;
    if (executor.id === newMember.guild.ownerId) return;
    for (const [, role] of addedRoles) {
        if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
            try {
                detection.isBotActing = true;
                if (newMember.roles.cache.has(role.id)) {
                    await newMember.roles.remove(role, 'Unauthorized Administrator role assignment - Auto Remove');
                }
            } catch (e) {
                if (e.code === 50013) {
                    console.log(`[Security] Failed to remove admin role ${role.name} from ${newMember.user.tag}: Missing permissions.`);
                } else {
                    console.log('Failed to remove role:', e);
                }
            } finally {
                detection.isBotActing = false;
            }
        }
        await logger.logRoleAdd(newMember, role, executor, config);
        await detection.antiGiveAdminRole(newMember, role, executor, config, client);
    }
    for (const [, role] of removedRoles) {
        await detection.antiRemoveAdminRole(newMember, role, executor, config, client);
    }
    if (newMember.communicationDisabledUntilTimestamp && !oldMember.communicationDisabledUntilTimestamp) {
        const unixTime = Math.floor(newMember.communicationDisabledUntilTimestamp / 1000);
        const duration = `<t:${unixTime}:R>`;
        await logger.logTimeout(newMember, duration, entry.reason || 'No reason', executor, config);
    }
});
client.on('guildMemberAdd', async member => {
    logger.logMemberJoin(member, config);
    if (config.autoJoinRole) {
        const role = member.guild.roles.cache.get(config.autoJoinRole);
        if (role) {
            try { await member.roles.add(role); }
            catch (err) { console.log(`Failed to assign auto-join role: ${err.message}`); }
        }
    }
    const { entrance } = await welcomeCmd.getWelcomeChannels(member.guild);
    if (entrance) await welcomeCmd.sendJoinMessage(member, entrance);
});
client.on('guildMemberRemove', async member => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const audit = await member.guild.fetchAuditLogs({ type: 20, limit: 3 }).catch(() => null);
    let isKick = false;
    if (audit) {
        const entry = audit.entries.first();
        if (entry && entry.target.id === member.id && entry.action === 20) {
            const executor = entry.executor && await member.guild.members.fetch(entry.executor.id).catch(() => null);
            if (executor && !executor.bot && executor.id !== member.guild.ownerId) {
                isKick = true;
                logger.logMemberLeave(member, config, executor);
                await detection.antiKick(member, executor, config, client);
            }
        }
    }
    if (!isKick) logger.logMemberLeave(member, config);
    const { exit } = await welcomeCmd.getWelcomeChannels(member.guild);
    if (!exit) return;
    try {
        const reason = isKick ? 'KICK' : 'User Left';
        await welcomeCmd.sendExitMessage(member, exit, reason);
    } catch {
        await welcomeCmd.sendExitMessage(member, exit, 'User Left');
    }
});
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    await logger.logMessageDelete(message, config);
});
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    await logger.logMessageEdit(oldMsg, newMsg, config);
});
client.on('messageReactionRemove', async (reaction, user) => {
    if (!reaction.message.guild || user.bot) return;
    if (!reaction.emoji) return;
    await logger.logReactionRemove(reaction, user, config);
});

function saveActiveVC() {
    for (const [key, joinedAt] of activeVC) {
        const [userId, guildId] = key.split(/(?<=\d{17,})/);
        if (userId && guildId) {
            const seconds = Math.floor((Date.now() - joinedAt) / 1000);
            db.prepare('UPDATE users SET voice_seconds = voice_seconds + ? WHERE user_id = ? AND guild_id = ?').run(seconds, userId, guildId);
        }
    }
    activeVC.clear();
}
process.on('SIGINT', () => { saveActiveVC(); process.exit(0); });
process.on('SIGTERM', () => { saveActiveVC(); process.exit(0); });

client.login(TOKEN);