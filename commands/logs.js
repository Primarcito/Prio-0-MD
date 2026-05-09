const config = require('../config');
const { buildLogsEmbed } = require('../embeds/mamutEmbeds');

module.exports = {
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(config.ROLE_ADMIN)) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    return interaction.editReply({ embeds: [buildLogsEmbed()] });
  }
};
