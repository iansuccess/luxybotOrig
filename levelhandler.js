// levelhandler.js
const { EmbedBuilder } = require('discord.js');
const { getLevelFromXp, XP_MIN, XP_MAX, XP_COOLDOWN } = require('./leveling.js');

// Cooldown tracker (in-memory)
const cooldowns = new Map();

async function handleMessageXP(message, db, client) {
  // ✅ Double check — nasa guild, hindi bot, at may content
  if (!message.guild || message.author.bot) return;
  if (!message.content || message.content.trim().length === 0) return;

  const userId = message.author.id;
  const guildId = message.guild.id;

  const key = `${userId}_${guildId}`;
  const now = Date.now();

  // Check cooldown
  if (cooldowns.has(key)) {
    const lastTime = cooldowns.get(key);
    if (now - lastTime < XP_COOLDOWN) return;
  }
  cooldowns.set(key, now);

  // Kunin o gumawa ng user level data — specific sa NAG-CHAT lang
  let row = db.prepare('SELECT * FROM levels WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!row) {
    db.prepare('INSERT INTO levels (user_id, guild_id, xp, level, total_messages) VALUES (?, ?, 0, 0, 0)').run(userId, guildId);
    row = { user_id: userId, guild_id: guildId, xp: 0, level: 0, total_messages: 0 };
  }

  // Random XP
  const earnedXp = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
  const newXp = row.xp + earnedXp;

  // Check level up
  const oldInfo = getLevelFromXp(row.xp);
  const newInfo = getLevelFromXp(newXp);

  // Update database — specific sa user + guild lang
  db.prepare('UPDATE levels SET xp = ?, level = ?, total_messages = total_messages + 1 WHERE user_id = ? AND guild_id = ?')
    .run(newXp, newInfo.level, userId, guildId);

  // ✅ Debug log — para makita mo kung sino lang ang nag-gain ng XP
  console.log(`[XP] ${message.author.tag} (${userId}) gained ${earnedXp} XP → total ${newXp} XP, Level ${newInfo.level}`);

  // Level up notification
  if (newInfo.level > oldInfo.level) {
    // Kunin ang level-up channel config
    const config = db.prepare('SELECT levelup_channel FROM level_config WHERE guild_id = ?').get(guildId);
    const channelId = config?.levelup_channel;

    if (channelId) {
      const channel = message.guild.channels.cache.get(channelId);
      if (channel) {
        // ✅ Check kung Level 100+ na
        const isMaxLevel = newInfo.level >= 100;

        const embed = new EmbedBuilder()
          .setColor('#FFFFFF')
          .setDescription(
            isMaxLevel
              ? `<a:celebrate:1555354404381794324> <@${userId}> reached **Level ${newInfo.level}**!\n\n<a:celebrate:1555354404381794324> **You reached Level 100!**`
              : `<a:celebrate:1555354404381794324> <@${userId}> leveled up to **Level ${newInfo.level}**!`
          )
          .setTimestamp();

        channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }
}

module.exports = { handleMessageXP };