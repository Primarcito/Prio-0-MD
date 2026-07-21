const { canManageRoles } = require('../permissions');

async function parseMultipleUsers(guild, input) {
  const ids = input.match(/\d{17,20}/g) || [];
  const members = [];
  for (const id of ids) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (member) members.push(member);
  }
  return members;
}

module.exports = {
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'rol') {
      const query = focusedOption.value.toLowerCase();
      const roles = interaction.guild.roles.cache.filter(r =>
        r.name.toLowerCase().includes(query) && r.name !== '@everyone'
      ).first(25);
      return interaction.respond(
        roles.map(r => ({ name: r.name, value: r.id }))
      );
    }
  },

  async execute(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!canManageRoles(member)) {
      return interaction.reply({ content: '❌ No tienes permiso.', ephemeral: true });
    }

    const action = interaction.options.getString('accion');
    const roleId = interaction.options.getString('rol');
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: '❌ Rol no encontrado.', ephemeral: true });
    }

    const botMember = await interaction.guild.members.fetchMe();
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({ content: '❌ No puedo gestionar ese rol.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (action === 'agregar') {
        const usuariosInput = interaction.options.getString('usuarios');
        if (!usuariosInput) {
          return interaction.editReply('❌ Debes especificar al menos un usuario (ID o mención).');
        }

        const targets = await parseMultipleUsers(interaction.guild, usuariosInput);
        if (targets.length === 0) {
          return interaction.editReply('❌ No se encontraron usuarios válidos.');
        }

        let added = 0;
        for (const t of targets) {
          if (!t.roles.cache.has(role.id)) {
            await t.roles.add(role).catch(() => {});
            added++;
          }
        }
        return interaction.editReply(`✅ **${role.name}** agregado a ${added}/${targets.length} usuarios.`);
      }

      if (action === 'quitar') {
        const membersWithRole = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id));
        let removed = 0;
        for (const [, m] of membersWithRole) {
          await m.roles.remove(role).catch(() => {});
          removed++;
        }
        return interaction.editReply(`✅ **${role.name}** quitado a ${removed} usuarios.`);
      }
    } catch (err) {
      console.error('[ROL]', err);
      return interaction.editReply('❌ Error al modificar roles. Revisa que el bot tenga permisos.');
    }
  }
};
