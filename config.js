require('dotenv').config();
const { SERVER_IDS, ROLE_IDS } = require('./permissions');
const { CHANNEL_IDS, CHANNEL_URLS } = require('./channels');

module.exports = {
  TOKEN: process.env.BOT_TOKEN || process.env.TOKEN,

  CLIENT_ID: process.env.CLIENT_ID || '1506376324158197922',
  GUILD_ID: SERVER_IDS.main,

  // Roles
  ROLE_MAMUT: ROLE_IDS.mamut,
  ROLE_OBJETIVO: ROLE_IDS.objetivo,
  ROLE_ADMIN: ROLE_IDS.admin,

  // Canales
  CANAL_PERMITIDO: CHANNEL_IDS.permitido,
  CANAL_URL: CHANNEL_URLS.mamut,

  // Ciudades de Albion
  CIUDADES: ['Lymhurst', 'Martlock', 'Fort Sterling', 'Thetford', 'Bridgewatch', 'Roja'],

  // Colores por ciudad
  COLORES_CIUDAD: {
    'Lymhurst':      0x3ba55d,
    'Martlock':      0x4a90d9,
    'Fort Sterling': 0xe8e8e8,
    'Thetford':      0x9b59b6,
    'Bridgewatch':   0xf4a100,
    'Roja':          0xe74c3c,
  },

  // Emojis por ciudad
  EMOJIS_CIUDAD: {
    'Lymhurst':      '🌲',
    'Martlock':      '⛰️',
    'Fort Sterling': '❄️',
    'Thetford':      '🌾',
    'Bridgewatch':   '🌉',
    'Roja':          '🔴',
  },

  // Imágenes
  IMG_PANEL: 'https://i.imgur.com/psNmpxq.jpeg',
  IMG_MAMUT: 'https://i.imgur.com/hWRtOdm.jpeg',

  // Archivos de persistencia
  HISTORIAL_FILE: 'historial.json',
  PANEL_FILE: 'panel.json',

  // Límites
  MAX_HISTORIAL: 50,
  DMS_POR_MIEMBRO: 3,
  COOLDOWN_MS: 30000,
  DM_DELAY_MS: 500, // Pausa entre cada DM (ms)
  PANEL_REPOST_AFTER_MAMUT_MS: 10 * 60 * 1000, // 10 minutos
  AUTO_PANEL_INTERVAL_MS: 60 * 60 * 1000, // 1 hora
};
