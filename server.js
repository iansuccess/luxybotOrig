// server.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'serverinfo',
  async execute(message, client) {
    const guild = message.guild;

    // Kunin ang server info
    await guild.fetch(); // para updated ang data

    const totalMembers = guild.memberCount;
    const totalBots = guild.members.cache.filter(m => m.user.bot).size;
    const createdAt = Math.floor(guild.createdTimestamp / 1000); // Discord timestamp format

    // Format numbers na may comma (halimbawa: 1,234)
    const formatNumber = (num) => num.toLocaleString('en-US');

    // White embed
    const embed = new EmbedBuilder()
      .setColor('#FFFFFF') // White
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({ size: 256, dynamic: true }) || undefined
      })
      .setThumbnail(guild.iconURL({ size: 256, dynamic: true }) || null)
      .setDescription(
        `<a:StarsRed:1555346719976456215> **Member:** \`${formatNumber(totalMembers)}\`\n` +
        `<a:StarsRed:1555346719976456215> **Bot:** \`${formatNumber(totalBots)}\`\n` +
        `<a:StarsRed:1555346719976456215> **Server created:** <t:${createdAt}:F>\n` +
        `<a:StarsRed:1555346719976456215> **Our tiktok account:** https://www.tiktok.com/@blazecityhere`
      );

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};