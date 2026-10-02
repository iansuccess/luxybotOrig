// levelv1.js — Discord server leveling
const { EmbedBuilder } = require('discord.js');

const xpForLevel = (level) => 200 * level;

function getLevelFromXp(totalXp) {
    let level = 0;
    let xpNeeded = 0;
    while (true) {
        const nextLevelXp = xpForLevel(level + 1);
        if (totalXp >= xpNeeded + nextLevelXp) {
            xpNeeded += nextLevelXp;
            level++;
        } else break;
    }
    return { level, currentXp: totalXp - xpNeeded, nextLevelXp: xpForLevel(level + 1) };
}

module.exports = {
    name: 'level',
    async execute(message, args, db) {
        const target = message.mentions.users.first() || message.author;

        let row = db.prepare('SELECT * FROM levels WHERE user_id = ? AND guild_id = ?').get(target.id, message.guild.id);
        if (!row) row = { user_id: target.id, guild_id: message.guild.id, xp: 0, level: 0, total_messages: 0 };

        const totalXp = row.xp;
        const info = getLevelFromXp(totalXp);
        const xpNeeded = info.nextLevelXp;
        const xpProgress = info.currentXp;
        const xpRemaining = xpNeeded - xpProgress;
        const barLength = 10;
        const filled = Math.round((xpProgress / xpNeeded) * barLength);
        const progressBar = '▰'.repeat(filled) + '▱'.repeat(barLength - filled);
        const isMaxLevel = info.level >= 100;

        let description =
            `<:Experience:1555353657032187935> **Level:** \`${info.level}\`\n` +
            `<:Experience:1555353657032187935> **XP:** \`${xpProgress} / ${xpNeeded}\`\n` +
            `<:Experience:1555353657032187935> **Total XP:** \`${totalXp}\`\n`;
        if (!isMaxLevel) description += `<:Experience:1555353657032187935> **Next Level in:** \`${xpRemaining} XP\`\n`;
        description += `\n${progressBar}`;
        if (isMaxLevel) description += `\n\n<a:celebrate:1555354404381794324> **You reached Level 100!**`;

        const embed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setAuthor({ name: `${target.username}'s Level`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
            .setDescription(description);

        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
};