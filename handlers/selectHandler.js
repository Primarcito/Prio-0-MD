const config = require('../config');
const { canUseMamut } = require('../permissions');
const state = require('../data/state');
const { enviarMamut, registrarLog } = require('../utils/mamut');
const { buildSelectorDesactivado, buildSelectorMapas } = require('../embeds/mamutEmbeds');
const { getMapsForCity } = require('../maps');

module.exports = async function handleSelect(interaction) {

  // ── Selector de ciudad → envía DMs ─────────────────────────────────────────
  if (interaction.customId === 'selector_ciudad') {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!canUseMamut(member)) {
      return interaction.reply({ content: '❌ No tienes permiso para activar MAMUT.', ephemeral: true });
    }

    const lock = interaction.values[0];
    const mapas = await getMapsForCity(lock);

    if (mapas.length > 0) {
      return interaction.update(buildSelectorMapas(lock, mapas));
    }

    await procesarMamut(interaction, lock);

    return;
  }

  if (interaction.customId.startsWith('selector_mapa:')) {
    const lock = interaction.customId.replace('selector_mapa:', '');
    const mapas = await getMapsForCity(lock);
    const mapa = mapas[Number(interaction.values[0])] || null;

    await procesarMamut(interaction, lock, mapa);
  }
};

async function procesarMamut(interaction, lock, mapa = null) {
  if (state.cooldowns.has(interaction.user.id)) {
    return interaction.reply({ content: '⏳ Espera un momento, ya hay un mamut en proceso.', ephemeral: true });
  }
  state.cooldowns.add(interaction.user.id);

  await interaction.update({
    content: `🦣 Enviando mamut **${lock}**${mapa ? ` — **${mapa}**` : ''}...`,
    components: mapa ? [] : [buildSelectorDesactivado(lock)]
  });

  (async () => {
    try {
      const contador = await enviarMamut(interaction.guild, lock, interaction.channel, interaction.user.tag, mapa);
      registrarLog(interaction.user.tag, lock, contador, mapa);

      await interaction.editReply({
        content: `✅ Mamut **${lock}**${mapa ? ` — **${mapa}**` : ''} notificado. Enviados \`${contador}\` mensajes.`,
        components: []
      });
    } catch (err) {
      console.error('[MAMUT BG]', err);
    } finally {
      cooldownTimeout(interaction.user.id);
    }
  })();
}

// Limpia el cooldown después de un tiempo
function cooldownTimeout(userId) {
  setTimeout(() => {
    state.cooldowns.delete(userId);
  }, config.COOLDOWN_MS);
}
