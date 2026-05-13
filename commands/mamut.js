const config = require('../config');
const { enviarMamut, registrarLog } = require('../utils/mamut');

module.exports = {
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(config.ROLE_AUTORIZADO)) {
      return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
    }

    const lock = interaction.options.getString('lock');

    // Responder inmediatamente
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(`🦣 Enviando mamut **${lock}**...`);

    // Procesar en background
    (async () => {
      try {
        const contador = await enviarMamut(interaction.guild, lock, interaction.channel, interaction.user.tag);
        registrarLog(interaction.user.tag, lock, contador);
        await interaction.editReply(`✅ Mamut **${lock}** notificado. Enviados \`${contador}\` mensajes.`);
      } catch (err) {
        console.error('[MAMUT CMD BG]', err);
      }
    })();
  }
};
