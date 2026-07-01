const config = require('../config');
const state = require('../data/state');
const { guardarPrioTemporal } = require('../data/persistence');

async function clearExistingTimeout(userId) {
  const timeout = state.prioTemporalTimeouts.get(userId);
  if (timeout) clearTimeout(timeout);
  state.prioTemporalTimeouts.delete(userId);
  state.prioTemporalExpirations.delete(userId);
  await guardarPrioTemporal();
}

function scheduleRemoval(guild, userId, roleId, expiresAt) {
  const msRestantes = Math.max(0, expiresAt - Date.now());
  const timeout = setTimeout(() => {
    quitarPrioTemporal(guild, userId, roleId);
  }, msRestantes);

  state.prioTemporalTimeouts.set(userId, timeout);
}

async function quitarPrioTemporal(guild, userId, roleId) {
  try {
    const member = await guild.members.fetch(userId);
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId, 'Acceso Prio temporal por MAMUT expirado');
    }
  } catch (err) {
    console.log(`Error quitando Prio temporal a ${userId}:`, err.message);
  } finally {
    await clearExistingTimeout(userId);
  }
}

async function darPrioTemporal(member) {
  const roleId = config.ROLE_PRIO_TEMPORAL;
  if (!roleId || !member?.roles?.cache) {
    return { granted: false, reason: 'missing_role' };
  }

  const prioTemporalActivo = state.prioTemporalExpirations.has(member.id);
  if (member.roles.cache.has(roleId) && !prioTemporalActivo) {
    return { granted: false, alreadyHadRole: true };
  }

  if (!member.roles.cache.has(roleId)) {
    await member.roles.add(roleId, 'Acceso Prio temporal por MAMUT');
  }

  await clearExistingTimeout(member.id);
  const expiresAt = Date.now() + config.PRIO_TEMPORAL_MS;

  state.prioTemporalExpirations.set(member.id, { roleId, expiresAt });
  await guardarPrioTemporal();
  scheduleRemoval(member.guild, member.id, roleId, expiresAt);
  return { granted: true, durationMs: config.PRIO_TEMPORAL_MS };
}

async function restaurarPrioTemporal(guild) {
  for (const [userId, data] of state.prioTemporalExpirations.entries()) {
    if (!data?.roleId || !data?.expiresAt) {
      await clearExistingTimeout(userId);
      continue;
    }

    if (data.expiresAt <= Date.now()) {
      quitarPrioTemporal(guild, userId, data.roleId);
      continue;
    }

    scheduleRemoval(guild, userId, data.roleId, data.expiresAt);
  }
}

module.exports = {
  darPrioTemporal,
  restaurarPrioTemporal,
};
