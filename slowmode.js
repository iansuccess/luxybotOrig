// slowmode.js
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'slowmode',
  async execute(message, args) {
    // ✅ Admin o Owner lang ang pwedeng gumamit
    const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isOwner = message.guild.ownerId === message.author.id;
    
    // Kung hindi admin at hindi owner — silent fail (walang reply, parang walang nangyari)
    if (!isAdmin && !isOwner) return;

    // Check kung may argument
    if (!args[0]) {
      const current = message.channel.rateLimitPerUser;
      return message.reply({
        content: `<:plus:1554705044056842300> Current slowmode: \`${current}s\`\n**Usage:** \`,slowmode <seconds>\` (0 to disable, max 21600)`,
        allowedMentions: { repliedUser: false }
      });
    }

    // Parse seconds
    const seconds = parseInt(args[0]);

    // Validate
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({
        content: '<a:wrong1:1546809103702167642> Please provide a valid number between **0** and **21600** seconds (6 hours max).',
        allowedMentions: { repliedUser: false }
      });
    }

    // Set slowmode
    try {
      await message.channel.setRateLimitPerUser(seconds);

      const embed = new EmbedBuilder()
        .setColor('#FFFFFF')
        .setDescription(
          seconds === 0
            ? `<:plus:1554705044056842300> Slowmode has been **disabled** in ${message.channel}.`
            : `<:plus:1554705044056842300> Slowmode set to **${seconds}s** in ${message.channel}.`
        );

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error(err);
      return message.reply({
        content: '<a:wrong1:1546809103702167642> Failed to set slowmode. Check my permissions.',
        allowedMentions: { repliedUser: false }
      });
    }
  }
};