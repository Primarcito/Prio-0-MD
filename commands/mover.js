const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { canMoveMembers } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mover')
    .setDescription('Mueve a todas las personas de tu canal de voz actual a otro canal.')
    .addChannelOption(option =>
      option.setName('destino')
        .setDescription('El canal de voz al que quieres mover a los usuarios')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    ),
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!canMoveMembers(member)) {
      return interaction.reply({ content: '❌ No tienes permiso para usar este comando.', ephemeral: true });
    }

    const canalDestino = interaction.options.getChannel('destino');
    const canalOrigen = member.voice.channel;

    if (!canalOrigen) {
      return interaction.reply({ content: '❌ Debes estar conectado a un canal de voz para usar este comando.', ephemeral: true });
    }

    if (canalOrigen.id === canalDestino.id) {
      return interaction.reply({ content: '❌ Ya estás en el canal destino.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    let count = 0;
    for (const [memberId, voiceMember] of canalOrigen.members) {
      try {
        await voiceMember.voice.setChannel(canalDestino);
        count++;
      } catch (err) {
        console.error(`Error moviendo a ${voiceMember.user.tag}:`, err.message);
      }
    }

    return interaction.editReply(`✅ Se han movido \`${count}\` usuarios de **${canalOrigen.name}** a **${canalDestino.name}**.`);
  }
};
