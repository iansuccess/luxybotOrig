// levelconfig.js
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'levelconfig',
  async execute(message, args, db) {
    // Admin/Owner only
    const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isAdmin && !isOwner) return;

    const sub = args[0]?.toLowerCase();

    // ,levelconfig channel #channel — i-set kung saan mag-a-announce ng level up
    if (sub === 'channel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply({
          content: '<a:wrong1:1546809103702167642> Mention a channel: `,levelconfig channel #channel`',
          allowedMentions: { repliedUser: false }
        });
      }

      db.prepare(`
        INSERT INTO level_config (guild_id, levelup_channel)
        VALUES (?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET levelup_channel = excluded.levelup_channel
      `).run(message.guild.id, channel.id);

      return message.reply({
        content: `<a:verify:1539238356003848344> Level-up announcements will be sent to ${channel}.`,
        allowedMentions: { repliedUser: false }
      });
    }

    // ,levelconfig disable — i-disable ang level-up announcements
    if (sub === 'disable') {
      db.prepare(`
        INSERT INTO level_config (guild_id, levelup_channel)
        VALUES (?, NULL)
        ON CONFLICT(guild_id) DO UPDATE SET levelup_channel = NULL
      `).run(message.guild.id);

      return message.reply({
        content: '<a:verify:1539238356003848344> Level-up announcements have been **disabled**.',
        allowedMentions: { repliedUser: false }
      });
    }

    // Default — show usage
    const embed = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setTitle('Level Config')
      .setDescription(
        `**,levelconfig channel #channel** — Set level-up announcement channel\n` +
        `**,levelconfig disable** — Disable level-up announcements`
      );

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};