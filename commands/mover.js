const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { canMoveMembers } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mover')
    .setDescription('Mueve a todas las personas de un canal de voz a otro.')
    .addChannelOption(option =>
      option.setName('destino')
        .setDescription('El canal de voz al que quieres mover a los usuarios')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('origen')
        .setDescription('Canal del que se moveran los usuarios (opcional si estas conectado)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    ),
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!canMoveMembers(member)) {
      return interaction.reply({ content: '❌ No tienes permiso para usar este comando.', ephemeral: true });
    }

    const canalDestino = interaction.options.getChannel('destino');
    const canalOrigen = interaction.options.getChannel('origen') || member.voice.channel;

    if (!canalOrigen) {
      return interaction.reply({ content: '❌ Debes estar conectado a un canal de voz para usar este comando.', ephemeral: true });
    }

    if (canalOrigen.id === canalDestino.id) {
      return interaction.reply({ content: '❌ Ya estás en el canal destino.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const miembros = [...canalOrigen.members.values()];
    const resultados = await Promise.allSettled(
      miembros.map(voiceMember => voiceMember.voice.setChannel(canalDestino))
    );

    let count = 0;
    resultados.forEach((resultado, index) => {
      if (resultado.status === 'fulfilled') {
        count++;
        return;
      }

      console.error(
        `Error moviendo a ${miembros[index].user.tag}:`,
        resultado.reason?.message || resultado.reason
      );
    });

    return interaction.editReply(`✅ Se han movido \`${count}\` usuarios de **${canalOrigen.name}** a **${canalDestino.name}**.`);
  }
};
