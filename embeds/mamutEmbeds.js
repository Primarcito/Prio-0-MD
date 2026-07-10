const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const config = require('../config');
const state = require('../data/state');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PANEL PRINCIPAL — Embed persistente en el canal configurado
// ═══════════════════════════════════════════════════════════════════════════════

function buildPanel() {
  const horaUTC = new Date().toISOString().slice(11, 16);

  // Stats
  const hoy = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Buenos_Aires' });
  const mamutHoy = state.historialMamut.filter(e => e.fecha && e.fecha.startsWith(hoy)).length;
  const ultimo = state.historialMamut[0];
  const ultimoTexto = ultimo
    ? `${config.EMOJIS_CIUDAD[ultimo.ciudad] || '📍'} **${ultimo.ciudad}**${ultimo.mapa ? `\n🗺️ ${ultimo.mapa}` : ''}`
    : '*Ninguno*';

  const embed = new EmbedBuilder()
    .setColor(0xCC0000)
    .setImage(config.IMG_PANEL)
    .setDescription(
      `## 🦣 PANEL MAMUT\n` +
      `Sistema de alerta rápida para eventos MAMUT.`
    )
    .addFields(
      {
        name: '📊 Activaciones',
        value: `Hoy: **${mamutHoy}**`,
        inline: true
      },
      {
        name: '🦣 Último aviso',
        value: ultimoTexto,
        inline: true
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: true
      }
    )
    .setFooter({ text: `TyrannT • ${horaUTC} UTC` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abrir_selector_mamut')
      .setLabel('MAMUT')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🦣')
  );

  return { embeds: [embed], components: [row] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DM EMBED — Enviado 3 veces a cada miembro del rol
// ═══════════════════════════════════════════════════════════════════════════════

function buildDMEmbed(ciudad, numeroDm, mapa = null) {
  const emojiCiudad = config.EMOJIS_CIUDAD[ciudad] || '📍';

  const embed = new EmbedBuilder()
    .setColor(0xCC0000)
    .setThumbnail(config.IMG_MAMUT)
    .setDescription(
      `# 🦣 ALERTA MAMUT\n` +
      `Se ha detectado un lock en **${emojiCiudad} ${ciudad}**.\n` +
      `Ve rápido con tu grupo.`
    )
    .addFields(
      { name: '🏙️ Ciudad',   value: `\`${ciudad}\``,           inline: true },
      { name: '🗺️ Mapa',      value: mapa ? `\`${mapa}\`` : '`Sin especificar`', inline: true },
      { name: '📢 Guild',     value: '`TyrannT`',               inline: true },
      { name: '📩 Aviso',     value: '`Mensaje automático`',    inline: true },
      { name: '🔁 Mensaje',   value: `\`${numeroDm}/${config.DMS_POR_MIEMBRO}\``, inline: true },
      { name: '\u200b',        value: '\u200b',                   inline: true },
    )
    .setFooter({ text: 'Prio0Bot • Alerta MAMUT' })
    .setTimestamp();

  return {
    content: config.CANAL_URL,
    embeds: [embed]
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CONFIRMACIÓN — Embed público en el canal después de activar MAMUT
// ═══════════════════════════════════════════════════════════════════════════════

function buildMamutConfirmacion(lock, contador, activadoPor, mapa = null) {
  const horaUTC = new Date().toLocaleTimeString('es-AR', {
    timeZone: 'America/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit'
  });
  const emojiCiudad = config.EMOJIS_CIUDAD[lock] || '📍';

  const embed = new EmbedBuilder()
    .setColor(0xCC0000)
    .setThumbnail(config.IMG_MAMUT)
    .setDescription(
      `# 🦣 MAMUT ACTIVADO\n` +
      `El aviso MAMUT fue activado correctamente.\n` +
      `Los miembros del rol serán notificados por mensaje directo.\n\n` +
      `👤 **${activadoPor}** • ${emojiCiudad} **${lock}**${mapa ? ` • 🗺️ **${mapa}**` : ''}\n` +
      `📩 **${config.DMS_POR_MIEMBRO}** mensajes por usuario • ${contador > 0 ? `📊 **${contador}** enviados` : '📊 Enviando...'}`
    )
    .addFields(
      {
        name: '\u200b',
        value: '> ⚠️ *Solo miembros con permiso MAMUT pueden activar este sistema.*',
        inline: false
      }
    )
    .setFooter({ text: `TyrannT • Sistema MAMUT • ${horaUTC}` })
    .setTimestamp();

  return embed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTOR DE CIUDADES
// ═══════════════════════════════════════════════════════════════════════════════

function buildSelectorCiudades() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('selector_ciudad')
    .setPlaceholder('Selecciona la ciudad...')
    .addOptions(
      config.CIUDADES.map(c =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c)
          .setValue(c)
          .setEmoji(config.EMOJIS_CIUDAD[c] || '🦣')
      )
    );

  const row = new ActionRowBuilder().addComponents(select);

  return {
    content: '🦣 **¿En qué ciudad apareció el mamut?**',
    components: [row],
    ephemeral: true
  };
}

function buildSelectorMapas(ciudad, mapas) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`selector_mapa:${ciudad}`)
    .setPlaceholder('Selecciona el mapa...')
    .addOptions(
      mapas.slice(0, 25).map((mapa, index) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(mapa.slice(0, 100))
          .setValue(String(index))
          .setEmoji('🗺️')
      )
    );

  const row = new ActionRowBuilder().addComponents(select);

  return {
    content: `🗺️ **${ciudad}** — selecciona el mapa:`,
    components: [row]
  };
}

function buildSelectorDesactivado(lock) {
  const selectDesactivado = new StringSelectMenuBuilder()
    .setCustomId('selector_ciudad_usado')
    .setPlaceholder(`✅ ${lock} seleccionado`)
    .setDisabled(true)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel(lock).setValue(lock)
    );

  return new ActionRowBuilder().addComponents(selectDesactivado);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMBED DE LOGS
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_LOGS_MOSTRADOS = 20;
const MAX_CAMPOS_LOGS = 22;
const MAX_VALOR_CAMPO = 1000;
const MAX_CARACTERES_CAMPOS_LOGS = 4800;
const MESES_UTC = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

function escaparMarkdown(valor, fallback = 'Desconocido') {
  const texto = String(valor ?? '').trim();
  if (!texto) return fallback;
  return texto.replace(/([\\`*_{}\[\]()#+\-.!|>~])/g, '\\$1');
}

function obtenerFechaUtc(entrada) {
  if (entrada.timestamp) {
    const fechaIso = new Date(entrada.timestamp);
    if (!Number.isNaN(fechaIso.getTime())) return fechaIso;
  }

  // Compatibilidad con registros anteriores: fecha se guardaba en hora de
  // Buenos Aires (UTC-3) con el formato "d/m/yyyy, HH:mm:ss".
  const match = String(entrada.fecha || '').match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (match) {
    const [, dia, mes, anio, hora, minuto, segundo = '0'] = match;
    return new Date(Date.UTC(
      Number(anio),
      Number(mes) - 1,
      Number(dia),
      Number(hora) + 3,
      Number(minuto),
      Number(segundo)
    ));
  }

  return null;
}

function obtenerPartesUtc(entrada) {
  const fecha = obtenerFechaUtc(entrada);
  if (!fecha) {
    return {
      diaKey: 'desconocida',
      dia: 'FECHA DESCONOCIDA',
      hora: '--:-- UTC',
    };
  }

  const iso = fecha.toISOString();
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return {
    diaKey: iso.slice(0, 10),
    dia: `${dia} ${MESES_UTC[Number(mes) - 1]} ${anio}`,
    hora: `${iso.slice(11, 16)} UTC`,
  };
}

function crearBloqueLog(entrada, hora) {
  const emoji = config.EMOJIS_CIUDAD[entrada.ciudad] || '📍';
  const ciudad = escaparMarkdown(entrada.ciudad);
  const usuario = escaparMarkdown(entrada.usuario);
  const mapa = escaparMarkdown(entrada.mapa, 'Sin mapa registrado');
  const mensajes = Number(entrada.mensajes) || 0;

  return (
    `> ${emoji} **${ciudad}** · 🕒 \`${hora}\`\n` +
    `> ├─ 🗺️ ${mapa}\n` +
    `> └─ 👤 ${usuario} · 📨 **${mensajes} envíos**`
  );
}

function crearCamposLogs() {
  const campos = [];
  let mostrados = 0;
  let caracteresUsados = 0;

  for (const entrada of state.historialMamut.slice(0, MAX_LOGS_MOSTRADOS)) {
    const { diaKey, dia, hora } = obtenerPartesUtc(entrada);
    const bloque = crearBloqueLog(entrada, hora);
    const campoActual = campos[campos.length - 1];
    const puedeAgruparse =
      campoActual?.diaKey === diaKey &&
      campoActual.value.length + bloque.length + 2 <= MAX_VALOR_CAMPO &&
      caracteresUsados + bloque.length + 2 <= MAX_CARACTERES_CAMPOS_LOGS;

    if (puedeAgruparse) {
      campoActual.value += `\n\n${bloque}`;
      caracteresUsados += bloque.length + 2;
      mostrados++;
      continue;
    }

    if (campos.length >= MAX_CAMPOS_LOGS) break;

    const continuacion = campos.some(campo => campo.diaKey === diaKey);
    const nombreCampo = `📅 ${dia}${continuacion ? ' · CONT.' : ''}`;
    if (
      caracteresUsados + nombreCampo.length + bloque.length >
      MAX_CARACTERES_CAMPOS_LOGS
    ) break;

    campos.push({
      diaKey,
      name: nombreCampo,
      value: bloque,
      inline: false,
    });
    caracteresUsados += nombreCampo.length + bloque.length;
    mostrados++;
  }

  return {
    mostrados,
    campos: campos.map(({ diaKey, ...campo }) => campo),
  };
}

function buildLogsEmbed() {
  if (state.historialMamut.length === 0) {
    return new EmbedBuilder()
      .setAuthor({ name: 'PRIO 0 • CONTROL MAMUT', iconURL: config.IMG_MAMUT })
      .setTitle('🦣 Registro de activaciones')
      .setColor(0x2b2d31)
      .setDescription(
        'No hay actividad registrada en este momento.\n\n' +
        '> 📭 **Estado del historial:** sin registros\n' +
        '> 🕒 Horario estándar: **UTC · 24 h**'
      )
      .setThumbnail(config.IMG_MAMUT)
      .setFooter({ text: 'PRIO 0 • Centro de operaciones MAMUT' })
      .setTimestamp();
  }

  const { campos, mostrados } = crearCamposLogs();
  const totalMsgs = state.historialMamut.reduce((acc, e) => acc + (Number(e.mensajes) || 0), 0);
  const mapasRegistrados = new Set(
    state.historialMamut
      .map(e => String(e.mapa || '').trim())
      .filter(Boolean)
  ).size;
  const ultimaEntrada = state.historialMamut[0];
  const ultimaHora = obtenerPartesUtc(ultimaEntrada).hora;
  const ultimoEmoji = config.EMOJIS_CIUDAD[ultimaEntrada.ciudad] || '📍';
  const ultimaCiudad = escaparMarkdown(ultimaEntrada.ciudad);
  const formatearNumero = numero => new Intl.NumberFormat('es-ES').format(numero);

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'PRIO 0 • CONTROL MAMUT', iconURL: config.IMG_MAMUT })
    .setTitle('🦣 Registro de activaciones')
    .setColor(0xCC0000)
    .setDescription(
      'Seguimiento operativo de alertas y entregas del sistema.\n\n' +
      `> 📌 **Última señal:** ${ultimoEmoji} **${ultimaCiudad}** · \`${ultimaHora}\`\n` +
      '> 🕒 **Horario estándar:** UTC · formato 24 h'
    )
    .addFields(
      {
        name: '📊 ACTIVACIONES',
        value: `**${formatearNumero(state.historialMamut.length)}**\nregistros`,
        inline: true,
      },
      {
        name: '📨 MENSAJES',
        value: `**${formatearNumero(totalMsgs)}**\nenviados`,
        inline: true,
      },
      {
        name: '🗺️ MAPAS',
        value: `**${formatearNumero(mapasRegistrados)}**\nidentificados`,
        inline: true,
      },
      ...campos,
    )
    .setThumbnail(config.IMG_MAMUT)
    .setFooter({
      text: `PRIO 0 • Mostrando ${mostrados} de ${state.historialMamut.length} • Datos en UTC`
    })
    .setTimestamp();

  return embed;
}

module.exports = {
  buildPanel,
  buildDMEmbed,
  buildSelectorCiudades,
  buildSelectorMapas,
  buildSelectorDesactivado,
  buildMamutConfirmacion,
  buildLogsEmbed,
};
