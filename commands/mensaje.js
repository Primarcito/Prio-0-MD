const config = require('../config');
const { canSendMessage } = require('../permissions');

function getRoleIds(roleIds) {
  return Array.isArray(roleIds) ? roleIds : [roleIds];
}

function memberHasAnyRole(member, roleIds) {
  return getRoleIds(roleIds).some(roleId => member.roles.cache.has(roleId));
}

module.exports = {
  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!canSendMessage(member)) {
      return interaction.reply({ content: '❌ No tienes permiso para usar /mensaje.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const texto = interaction.options.getString('texto');
    const targets = interaction.guild.members.cache.filter(m => memberHasAnyRole(m, config.ROLE_OBJETIVO));

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
