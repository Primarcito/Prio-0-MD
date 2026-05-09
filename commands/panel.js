const config = require('../config');
const state = require('../data/state');
const { guardarPanel } = require('../data/persistence');
const { buildPanel } = require('../embeds/mamutEmbeds');

module.exports = {
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(config.ROLE_ADMIN)) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const canal = await interaction.guild.channels.fetch(config.CANAL_PERMITIDO);

    // Borrar solo el panel anterior (busca por embed con "Panel Mamut" en la descripción)
    const mensajes = await canal.messages.fetch({ limit: 50 });
    const panelExistente = mensajes.find(
      m => m.author.id === state.client.user.id &&
           m.embeds.length > 0 &&
           m.embeds[0].description?.includes('PANEL MAMUT')
    );
    if (panelExistente) await panelExistente.delete().catch(() => {});

    // Enviar nuevo panel
    const msg = await canal.send(buildPanel());

    // Persistir referencia
    state.panelChannelId = canal.id;
    state.panelMessageId = msg.id;
    state.panelMessage = msg;
    guardarPanel();

    return interaction.editReply('✅ Panel recreado.');
  }
};
