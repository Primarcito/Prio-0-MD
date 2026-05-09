const config = require('../config');
const { buildSelectorCiudades } = require('../embeds/mamutEmbeds');

module.exports = async function handleButton(interaction) {

  // ── Botón principal MAMUT → abre selector ──────────────────────────────────
  if (interaction.customId === 'abrir_selector_mamut') {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(config.ROLE_AUTORIZADO)) {
      return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
    }

    return interaction.reply(buildSelectorCiudades());
  }
};
