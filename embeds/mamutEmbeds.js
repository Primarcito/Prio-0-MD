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
  buildSelectorMapas,
  buildSelectorDesactivado,
  buildMamutConfirmacion,
  buildLogsEmbed,
};
