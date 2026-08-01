const { PermissionFlagsBits } = require('discord.js');
const { ROLE_IDS, canManageRoles } = require('../permissions');
const PROTECTED_ROLE_IDS = new Set(Array.isArray(ROLE_IDS.rolAdmin) ? ROLE_IDS.rolAdmin : [ROLE_IDS.rolAdmin]);


async function parseMultipleUsers(guild, input) {
  const ids = [...new Set(input.match(/\d{17,20}/g) || [])];
  const members = [];
  for (const id of ids) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (member) members.push(member);
  }
  return { members, requested: ids.length, notFound: ids.length - members.length };
}

function formatResult(action, role, counts) {
  const parts = [`${action} **${role.name}**: ${counts.success} exitosos`];
  if (counts.unchanged) parts.push(`${counts.unchanged} sin cambios`);
  if (counts.notFound) parts.push(`${counts.notFound} no encontrados`);
  if (counts.failed) parts.push(`${counts.failed} fallidos`);
  return `${counts.failed ? '\u26A0\uFE0F' : '\u2705'} ${parts.join(', ')}.`;
}

module.exports = {
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'rol') {
      const query = focusedOption.value.toLowerCase();
      const roles = interaction.guild.roles.cache.filter(r =>
        r.name.toLowerCase().includes(query) &&
        r.name !== '@everyone' &&
        r.editable &&
        !PROTECTED_ROLE_IDS.has(r.id)
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
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ El bot no tiene el permiso Gestionar roles.', ephemeral: true });
    }

    if (PROTECTED_ROLE_IDS.has(role.id)) {
      return interaction.reply({ content: '❌ Ese rol administrativo está protegido.', ephemeral: true });
    }

    if (role.id === interaction.guild.id || role.managed || !role.editable) {
      return interaction.reply({ content: '❌ No puedo gestionar ese rol.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (action === 'agregar') {
        const usuariosInput = interaction.options.getString('usuarios');
        if (!usuariosInput) {
          return interaction.editReply('❌ Debes especificar al menos un usuario (ID o mención).');
        }

        const parsed = await parseMultipleUsers(interaction.guild, usuariosInput);
        if (parsed.requested === 0) {
          return interaction.editReply('❌ No se encontraron usuarios válidos.');
        }
        if (parsed.members.length === 0) {
          return interaction.editReply('❌ Ninguno de los usuarios indicados pertenece al servidor.');
        }

        let added = 0;
        let alreadyHad = 0;
        let failed = 0;
        for (const target of parsed.members) {
          if (target.roles.cache.has(role.id)) {
            alreadyHad++;
            continue;
          }
          try {
            await target.roles.add(role);
            added++;
          } catch (err) {
            failed++;
            console.error(`[ROL] No se pudo agregar ${role.id} a ${target.id}:`, err.message);
          }
        }
        return interaction.editReply(formatResult('Agregar', role, {
          success: added,
          unchanged: alreadyHad,
          notFound: parsed.notFound,
          failed,
        }));
      }

      if (action === 'quitar') {
        await interaction.guild.members.fetch();
        const membersWithRole = interaction.guild.members.cache.filter(target =>
          target.id !== botMember.id && target.roles.cache.has(role.id)
        );
        let removed = 0;
        let failed = 0;
        for (const [, target] of membersWithRole) {
          try {
            await target.roles.remove(role);
            removed++;
          } catch (err) {
            failed++;
            console.error(`[ROL] No se pudo quitar ${role.id} a ${target.id}:`, err.message);
          }
        }
        return interaction.editReply(formatResult('Quitar', role, {
          success: removed,
          unchanged: 0,
          notFound: 0,
          failed,
        }));
      }
    } catch (err) {
      console.error('[ROL]', err);
      return interaction.editReply('❌ Error al modificar roles. Revisa que el bot tenga permisos.');
    }
  }
};
