const config = require('../config');

module.exports = {
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(config.ROLE_AUTORIZADO)) {
      return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const texto = interaction.options.getString('texto');
    const targets = interaction.guild.members.cache.filter(m => m.roles.cache.has(config.ROLE_OBJETIVO));

    let contador = 0;
    for (const [, target] of targets) {
      try {
        await target.send(texto);
        contador++;
      } catch (err) {
        console.log(`Error enviando DM a ${target.user.tag}:`, err.message);
      }
    }

    return interaction.editReply(`✅ Enviados \`${contador}\` mensajes.`);
  }
};
