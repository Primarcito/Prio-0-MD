const { canUseMamut } = require('../permissions');
const { enviarMamut, registrarLog } = require('../utils/mamut');
const { darPrioTemporal } = require('../utils/prioTemporal');
const { buildMamutConfirmacion } = require('../embeds/mamutEmbeds');

module.exports = {
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!canUseMamut(member)) {
      return interaction.reply({ content: 'No tienes permiso para activar MAMUT.', ephemeral: true });
    }

    const lock = interaction.options.getString('lock');

    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(`Enviando mamut **${lock}**...`);

    (async () => {
      try {
        darPrioTemporal(member).catch(err => console.log('Error dando Prio temporal:', err.message));

        const contador = await enviarMamut(interaction.guild, lock, interaction.channel, interaction.user.tag);
        await registrarLog(interaction.user.tag, lock, contador);
        await interaction.editReply({
          content: '',
          embeds: [buildMamutConfirmacion(lock, contador, interaction.user.tag)],
          components: []
        });
      } catch (err) {
        console.error('[MAMUT CMD BG]', err);
      }
    })();
  }
};
