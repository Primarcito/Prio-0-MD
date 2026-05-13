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
    ? `${config.EMOJIS_CIUDAD[ultimo.ciudad] || '📍'} ${ultimo.ciudad}`
    : '*Ninguno*';

  // Ciudades en dos columnas (3+3)
  const mitad = Math.ceil(config.CIUDADES.length / 2);
  const col1 = config.CIUDADES.slice(0, mitad)
    .map(c => `${config.EMOJIS_CIUDAD[c] || '📍'} ${c}`).join('\n');
  const col2 = config.CIUDADES.slice(mitad)
    .map(c => `${config.EMOJIS_CIUDAD[c] || '📍'} ${c}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0xCC0000)
    .setThumbnail(config.IMG_MAMUT)
    .setImage(config.IMG_PANEL)
    .setDescription(
      `## 🦣 PANEL MAMUT\n` +
      `Se ha detectado un **FELPUDITO**.\n` +
      `Se enviarán **${config.DMS_POR_MIEMBRO} DMs** a cada miembro del rol.`
    )
    .addFields(
      // ── Fila 1: Pasos (3 inline) ──
      {
        name: '`1` Presioná',
        value: '🦣 **MAMUT**',
        inline: true
      },
      {
        name: '`2` Seleccioná',
        value: '🏙️ la ciudad del lock',
        inline: true
      },
      {
        name: '`3` El bot notifica',
        value: '📩 a todos por DM',
        inline: true
      },
      // ── Fila 2: Ciudades (2 col) + Estado (1 col) ──
      {
        name: '🏙️ CIUDADES DISPONIBLES',
        value: col1,
        inline: true
      },
      {
        name: '\u200b',
        value: col2,
        inline: true
      },
      {
        name: '📊 ESTADO ACTUAL',
        value:
          `Activaciones: \`${mamutHoy}\`\n` +
          `Último: ${ultimoTexto}`,
        inline: true
      },
      // ── Warning ──
      {
        name: '\u200b',
        value: '⚠️ Solo puede usarlo quien tenga el rol autorizado.',
        inline: false
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

function buildDMEmbed(ciudad, numeroDm) {
  const emojiCiudad = config.EMOJIS_CIUDAD[ciudad] || '📍';

  const embed = new EmbedBuilder()
    .setColor(0xCC0000)
    .setThumbnail(config.IMG_MAMUT)
    .setDescription(
      `# 🦣 ALERTA MAMUT\n` +
      `Se ha detectado un lock en **${emojiCiudad} ${ciudad}**.\n` +
      `Acude rápido con tu grupo.`
    )
    .addFields(
      { name: '🏙️ Ciudad',   value: `\`${ciudad}\``,           inline: true },
      { name: '📢 Guild',     value: '`TyrannT`',               inline: true },
      { name: '\u200b',        value: '\u200b',                   inline: true },
      { name: '📩 Aviso',     value: '`DM automático`',         inline: true },
      { name: '🔁 Mensaje',   value: `\`${numeroDm}/${config.DMS_POR_MIEMBRO}\``, inline: true },
      { name: '\u200b',        value: '\u200b',                   inline: true },
    )
    .setFooter({ text: 'Prio0Bot • Alerta rápida MAMUT' })
    .setTimestamp();

  return {
    content: `https://discord.com/channels/969420681349574677/1476467569664852009`,
    embeds: [embed]
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CONFIRMACIÓN — Embed público en el canal después de activar MAMUT
// ═══════════════════════════════════════════════════════════════════════════════

function buildMamutConfirmacion(lock, contador, activadoPor) {
  const horaUTC = new Date().toLocaleTimeString('es-AR', {
    timeZone: 'America/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit'
  });
  const emojiCiudad = config.EMOJIS_CIUDAD[lock] || '📍';

  const embed = new EmbedBuilder()
    .setColor(0xCC0000)
    .setThumbnail(config.IMG_MAMUT)
    .setImage(config.IMG_PANEL)
    .setDescription(
      `# 🦣 MAMUT ACTIVADO\n` +
      `El aviso MAMUT fue activado correctamente.\n` +
      `Los miembros del rol serán notificados por DM.`
    )
    .addFields(
      { name: '👤 Activado por',       value: activadoPor,                       inline: true },
      { name: '🏙️ Ciudad del lock',   value: `${emojiCiudad} \`${lock}\``,      inline: true },
      { name: '\u200b',                 value: '\u200b',                           inline: true },
      { name: '📩 DMs por usuario',    value: `\`${config.DMS_POR_MIEMBRO}\``,   inline: true },
      { name: '📊 Estado',             value: `\`${contador} enviados\``,         inline: true },
      { name: '\u200b',                 value: '\u200b',                           inline: true },
      {
        name: '\u200b',
        value: '> ⚠️ *Solo los usuarios autorizados pueden activar este sistema.*',
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
    .setPlaceholder('Seleccioná la ciudad del lock...')
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
    content: '🦣 **¿En qué ciudad salió el mamut?**',
    components: [row],
    ephemeral: true
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

function buildLogsEmbed() {
  if (state.historialMamut.length === 0) {
    return new EmbedBuilder()
      .setTitle('📋 Historial de Mamuts')
      .setColor(0x2b2d31)
      .setDescription('*No hay registros todavía.*')
      .setTimestamp();
  }

  // Agrupar por fecha
  const porFecha = {};
  for (const e of state.historialMamut) {
    const dia = e.fecha ? e.fecha.split(',')[0].trim() : 'Desconocido';
    if (!porFecha[dia]) porFecha[dia] = [];
    porFecha[dia].push(e);
  }

  let descripcion = '';
  let contador = 0;

  for (const [fecha, entradas] of Object.entries(porFecha)) {
    if (contador >= 20) break;
    descripcion += `**📅 ${fecha}**\n`;
    for (const e of entradas) {
      if (contador >= 20) break;
      const emoji = config.EMOJIS_CIUDAD[e.ciudad] || '📍';
      const hora = e.fecha ? e.fecha.split(',')[1]?.trim() || '' : '';
      descripcion += `> ${emoji} **${e.ciudad}** — ${e.usuario} • \`${e.mensajes} msgs\` • ${hora}\n`;
      contador++;
    }
    descripcion += '\n';
  }

  const totalMsgs = state.historialMamut.reduce((acc, e) => acc + (e.mensajes || 0), 0);
  const ciudadesUsadas = [...new Set(state.historialMamut.map(e => e.ciudad))];

  const embed = new EmbedBuilder()
    .setTitle('📋 Historial de Mamuts')
    .setColor(0xCC0000)
    .setDescription(descripcion)
    .addFields(
      { name: '📊 Total activaciones', value: `\`${state.historialMamut.length}\``, inline: true },
      { name: '📨 Total mensajes',     value: `\`${totalMsgs}\``,                   inline: true },
      { name: '🏙️ Ciudades',          value: ciudadesUsadas.map(c => config.EMOJIS_CIUDAD[c] || '📍').join(' ') || 'N/A', inline: true },
    )
    .setFooter({ text: `Últimos ${state.historialMamut.length} registros` })
    .setTimestamp();

  return embed;
}

module.exports = {
  buildPanel,
  buildDMEmbed,
  buildSelectorCiudades,
  buildSelectorDesactivado,
  buildMamutConfirmacion,
  buildLogsEmbed,
};
