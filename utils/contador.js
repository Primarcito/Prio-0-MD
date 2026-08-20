const config = require('../config');
const state = require('../data/state');
const { guardarContador } = require('../data/persistence');

const CONTADOR_MARKERS = ['TIEMPO PARA SER LIBRES', 'SOMOS LIBRES'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function buildContadorContent(nowMs = Date.now()) {
  const restante = config.CONTADOR_TARGET_MS - nowMs;
  if (restante <= 0) {
    return '# 🐘 SOMOS LIBRES 🐘\n## EL CONTENIDO HA CAMBIADO';
  }

  const totalMinutos = Math.floor(restante / 60000);
  const dias = Math.floor(totalMinutos / (24 * 60));
  const horas = Math.floor((totalMinutos % (24 * 60)) / 60);
  const minutos = totalMinutos % 60;

  return [
    `# ${pad(dias)} : ${pad(horas)} : ${pad(minutos)}`,
    '## TIEMPO PARA SER LIBRES',
    '-# DÍAS · HORAS · MINUTOS',
    `-# Liberación: <t:${config.CONTADOR_TARGET_UNIX}:F>`,
  ].join('\n');
}

function clearContadorTimers() {
  if (state.contadorTimeout) clearTimeout(state.contadorTimeout);
  if (state.contadorInterval) clearInterval(state.contadorInterval);
  state.contadorTimeout = null;
  state.contadorInterval = null;
}

async function getContadorChannel(guild) {
  const channel = await guild.channels.fetch(config.CANAL_PERMITIDO).catch(err => {
    console.error('[CONTADOR] No se pudo obtener el canal MAMUT:', err.message);
    return null;
  });

  if (!channel?.isTextBased()) {
    throw new Error('El canal configurado para MAMUT no admite mensajes.');
  }
  return channel;
}

async function recoverContadorMessage(channel) {
  if (state.contadorMessage?.channelId === channel.id) return state.contadorMessage;

  if (state.contadorMessageId) {
    const storedMessage = await channel.messages.fetch(state.contadorMessageId).catch(() => null);
    if (storedMessage) {
      state.contadorMessage = storedMessage;
      return storedMessage;
    }
  }

  const recentMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const recovered = recentMessages?.find(message =>
    message.author.id === state.client.user.id &&
    CONTADOR_MARKERS.some(marker => message.content.includes(marker))
  );

  if (recovered) {
    state.contadorChannelId = channel.id;
    state.contadorMessageId = recovered.id;
    state.contadorMessage = recovered;
    await guardarContador();
    console.log('[CONTADOR] Mensaje recuperado por contenido.');
    return recovered;
  }

  if (state.contadorMessageId || state.contadorChannelId) {
    state.contadorChannelId = null;
    state.contadorMessageId = null;
    state.contadorMessage = null;
    await guardarContador();
  }
  return null;
}

async function sincronizarContador(guild, { createIfMissing = false } = {}) {
  const channel = await getContadorChannel(guild);
  let message = await recoverContadorMessage(channel);
  const content = buildContadorContent();

  if (!message && createIfMissing) {
    message = await channel.send({ content });
    state.contadorChannelId = channel.id;
    state.contadorMessageId = message.id;
    state.contadorMessage = message;
    await guardarContador();
    console.log('[CONTADOR] Mensaje creado.');
  } else if (message) {
    await message.edit({ content });
  }

  if (state.contadorActivo && Date.now() >= config.CONTADOR_TARGET_MS) {
    clearContadorTimers();
    state.contadorActivo = false;
    await guardarContador();
    console.log('[CONTADOR] Cuenta regresiva finalizada.');
  }

  return { message, content };
}

function programarContador(guild) {
  clearContadorTimers();
  if (!state.contadorActivo) return;

  const delayHastaSiguienteMinuto = config.CONTADOR_INTERVAL_MS - (Date.now() % config.CONTADOR_INTERVAL_MS) + 250;
  state.contadorTimeout = setTimeout(async () => {
    try {
      await sincronizarContador(guild, { createIfMissing: true });
    } catch (err) {
      console.error('[CONTADOR] Error actualizando:', err);
    }

    if (!state.contadorActivo) return;
    state.contadorInterval = setInterval(async () => {
      try {
        await sincronizarContador(guild, { createIfMissing: true });
      } catch (err) {
        console.error('[CONTADOR] Error actualizando:', err);
      }
    }, config.CONTADOR_INTERVAL_MS);
  }, delayHastaSiguienteMinuto);
}

async function iniciarContador(guild) {
  const result = await sincronizarContador(guild, { createIfMissing: true });
  state.contadorActivo = Date.now() < config.CONTADOR_TARGET_MS;
  await guardarContador();
  programarContador(guild);
  return result;
}

async function detenerContador() {
  const estabaActivo = state.contadorActivo;
  clearContadorTimers();
  state.contadorActivo = false;
  await guardarContador();
  return estabaActivo;
}

async function actualizarContador(guild) {
  return sincronizarContador(guild, { createIfMissing: true });
}

async function restaurarContador(guild) {
  if (state.contadorActivo) {
    await sincronizarContador(guild, { createIfMissing: true });
    programarContador(guild);
    console.log('[CONTADOR] Cuenta regresiva restaurada.');
    return;
  }

  const channel = await getContadorChannel(guild);
  await recoverContadorMessage(channel);
}

module.exports = {
  buildContadorContent,
  iniciarContador,
  detenerContador,
  actualizarContador,
  restaurarContador,
};
