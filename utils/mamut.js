const config = require('../config');
const state = require('../data/state');
const { guardarHistorial } = require('../data/persistence');
const { buildDMEmbed } = require('../embeds/mamutEmbeds');

// ─── Registrar en el historial ────────────────────────────────────────────────

function registrarLog(usuario, ciudad, mensajes, mapa = null) {
  const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' });
  state.historialMamut.unshift({ usuario, ciudad, mapa, fecha, mensajes });

  // Limitar tamaño
  if (state.historialMamut.length > config.MAX_HISTORIAL) {
    state.historialMamut = state.historialMamut.slice(0, config.MAX_HISTORIAL);
  }

  guardarHistorial();
  console.log(`[MAMUT] ${fecha} | ${usuario} | ${ciudad} | ${mensajes} msgs`);
}

// ─── Pausa configurable entre DMs ─────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRoleIds(roleIds) {
  return Array.isArray(roleIds) ? roleIds : [roleIds];
}

function memberHasAnyRole(member, roleIds) {
  return getRoleIds(roleIds).some(roleId => member.roles.cache.has(roleId));
}

async function enviarRondaDm(targets, lock, numeroDm, mapa = null) {
  const dmPayload = buildDMEmbed(lock, numeroDm, mapa);
  const resultados = await Promise.allSettled(
    targets.map(target => target.send(dmPayload))
  );

  let enviados = 0;
  const targetsConDmAbierto = [];

  resultados.forEach((resultado, index) => {
    const target = targets[index];

    if (resultado.status === 'fulfilled') {
      enviados++;
      targetsConDmAbierto.push(target);
      return;
    }

    console.log(
      `Error enviando DM ${numeroDm}/${config.DMS_POR_MIEMBRO} a ${target.user.tag}:`,
      resultado.reason?.message || resultado.reason
    );
  });

  return { enviados, targetsConDmAbierto };
}

// ─── Enviar DMs a todos los miembros del rol ──────────────────────────────────

async function enviarMamut(guild, lock, canal, activadoPor, mapa = null) {
  const targets = [...guild.members.cache
    .filter(m => memberHasAnyRole(m, config.ROLE_OBJETIVO))
    .values()];

  // Buscar mensajes viejos de confirmación de mamut y borrarlos
  try {
    const mensajes = await canal.messages.fetch({ limit: 50 });
    const avisosViejos = mensajes.filter(
      m => m.author.id === canal.client.user.id &&
           m.embeds.length > 0 &&
           m.embeds[0].description?.includes('MAMUT ACTIVADO')
    );
    for (const [, msg] of avisosViejos) {
      await msg.delete().catch(() => {});
    }
  } catch (err) {
    console.log('Error borrando avisos de mamut viejos:', err.message);
  }

  let contador = 0;
  let targetsActivos = targets;

  for (let numeroDm = 1; numeroDm <= config.DMS_POR_MIEMBRO && targetsActivos.length > 0; numeroDm++) {
    const resultadoRonda = await enviarRondaDm(targetsActivos, lock, numeroDm, mapa);
    contador += resultadoRonda.enviados;
    targetsActivos = resultadoRonda.targetsConDmAbierto;

    if (numeroDm < config.DMS_POR_MIEMBRO && config.DM_DELAY_MS > 0 && targetsActivos.length > 0) {
      await delay(config.DM_DELAY_MS);
    }
  }

  if (typeof state.schedulePanelRepost === 'function') {
    state.schedulePanelRepost(guild);
  }

  return contador;
}

module.exports = {
  registrarLog,
  enviarMamut,
};
