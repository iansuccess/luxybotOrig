// checkping.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  async execute(message, client) {
    // Kunin ang WebSocket ping ng bot
    const wsLatency = client.ws.ping;

    // Green embed
    const embed = new EmbedBuilder()
      .setColor('#00FF00') // Green
      .setDescription(`<:ping:1555333242700304458> Bot latency **Ping:** \`${wsLatency}ms\``);

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};