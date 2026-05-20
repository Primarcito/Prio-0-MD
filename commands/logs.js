const { canViewLogs } = require('../permissions');
const { buildLogsEmbed } = require('../embeds/mamutEmbeds');

module.exports = {
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!canViewLogs(member)) {
      return interaction.reply({ content: '❌ No tienes permiso para usar este comando.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    return interaction.editReply({ embeds: [buildLogsEmbed()] });
  }
};
