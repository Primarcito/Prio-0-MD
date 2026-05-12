const config = require('../config');
const state = require('../data/state');
const { guardarHistorial } = require('../data/persistence');
const { buildMamutConfirmacion, buildDMEmbed } = require('../embeds/mamutEmbeds');

// ─── Registrar en el historial ────────────────────────────────────────────────

function registrarLog(usuario, ciudad, mensajes) {
  const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' });
  state.historialMamut.unshift({ usuario, ciudad, fecha, mensajes });

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

// ─── Enviar DMs a todos los miembros del rol ──────────────────────────────────

async function enviarMamut(guild, lock, canal, activadoPor) {
  const targets = guild.members.cache.filter(m => m.roles.cache.has(config.ROLE_OBJETIVO));

  let contador = 0;
  for (const [, target] of targets) {
    for (let i = 0; i < config.DMS_POR_MIEMBRO; i++) {
      try {
        const dmPayload = buildDMEmbed(lock, i + 1);
        await target.send(dmPayload);
        contador++;

        // Pausa configurable entre cada DM
        if (i < config.DMS_POR_MIEMBRO - 1) {
          await delay(config.DM_DELAY_MS);
        }
      } catch (err) {
        // Si el usuario tiene DMs cerrados, registrar y continuar al siguiente usuario
        console.log(`Error enviando DM a ${target.user.tag}:`, err.message);
        break;
      }
    }
  }

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

  // Embed de confirmación al canal
  const embed = buildMamutConfirmacion(lock, contador, activadoPor);
  await canal.send({ content: `<@&${config.ROLE_OBJETIVO}>`, embeds: [embed] });

  return contador;
}

module.exports = {
  registrarLog,
  enviarMamut,
};
