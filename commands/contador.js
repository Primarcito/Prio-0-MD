const { SlashCommandBuilder } = require('discord.js');
const { canManageCountdown } = require('../permissions');
const state = require('../data/state');
const {
  iniciarContador,
  detenerContador,
  actualizarContador,
} = require('../utils/contador');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('contador')
    .setDescription('Controla la cuenta regresiva del canal MAMUT.')
    .addSubcommand(option =>
      option.setName('iniciar')
        .setDescription('Inicia o reanuda la actualización cada minuto.')
    )
    .addSubcommand(option =>
      option.setName('detener')
        .setDescription('Detiene las actualizaciones sin borrar el mensaje.')
    )
    .addSubcommand(option =>
      option.setName('actualizar')
        .setDescription('Actualiza ahora el único mensaje del contador.')
    ),

  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!canManageCountdown(member)) {
      return interaction.reply({
        content: '❌ No tienes permiso para controlar el contador.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const accion = interaction.options.getSubcommand();

    if (accion === 'iniciar') {
      const { message } = await iniciarContador(interaction.guild);
      return interaction.editReply(
        state.contadorActivo
          ? `✅ Contador iniciado y mensaje persistente listo: ${message.url}`
          : `✅ La fecha ya llegó; se publicó el mensaje final: ${message.url}`
      );
    }

    if (accion === 'detener') {
      const estabaActivo = await detenerContador();
      return interaction.editReply(
        estabaActivo
          ? '⏸️ Contador detenido. El mensaje se conservará para reutilizarlo.'
          : 'ℹ️ El contador ya estaba detenido. El mensaje se conserva.'
      );
    }

    const { message } = await actualizarContador(interaction.guild);
    return interaction.editReply(`✅ Contador actualizado: ${message.url}`);
  },
};
