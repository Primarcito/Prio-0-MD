const { ActionRowBuilder } = require('discord.js');
const config = require('../config');
const state = require('../data/state');
const { enviarMamut, registrarLog } = require('../utils/mamut');
const { buildSelectorDesactivado } = require('../embeds/mamutEmbeds');

module.exports = async function handleSelect(interaction) {

  // ── Selector de ciudad → envía DMs ─────────────────────────────────────────
  if (interaction.customId === 'selector_ciudad') {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(config.ROLE_AUTORIZADO)) {
      return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
    }

    // Evita doble disparo
    if (state.cooldowns.has(interaction.user.id)) {
      return interaction.reply({ content: '⏳ Esperá un momento, ya hay un mamut en proceso.', ephemeral: true });
    }
    state.cooldowns.add(interaction.user.id);

    const lock = interaction.values[0];

    // Responder INMEDIATAMENTE para evitar timeout de Discord (3s)
    await interaction.update({
      content: `🦣 Enviando mamut **${lock}**...`,
      components: [buildSelectorDesactivado(lock)]
    });

    // Procesar DMs en background sin bloquear
    (async () => {
      try {
        const contador = await enviarMamut(interaction.guild, lock, interaction.channel, interaction.user.tag);
        registrarLog(interaction.user.tag, lock, contador);

        await interaction.editReply({
          content: `✅ Mamut **${lock}** notificado. Enviados \`${contador}\` mensajes.`,
          components: []
        });
      } catch (err) {
        console.error('[MAMUT BG]', err);
      } finally {
        cooldownTimeout(interaction.user.id);
      }
    })();

    return;
  }
};

// Limpia el cooldown después de un tiempo
function cooldownTimeout(userId) {
  setTimeout(() => {
    state.cooldowns.delete(userId);
  }, config.COOLDOWN_MS);
}
