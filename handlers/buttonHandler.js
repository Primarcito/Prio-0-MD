const { canUseMamut } = require('../permissions');
const { buildSelectorCiudades } = require('../embeds/mamutEmbeds');

module.exports = async function handleButton(interaction) {

  // ── Botón principal MAMUT → abre selector ──────────────────────────────────
  if (interaction.customId === 'abrir_selector_mamut') {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!canUseMamut(member)) {
      return interaction.reply({ content: '❌ No tienes permiso para activar MAMUT.', ephemeral: true });
    }

    return interaction.reply(buildSelectorCiudades());
  }
};
