require('dotenv').config();

module.exports = {
  TOKEN: process.env.TOKEN,

  CLIENT_ID: '1476138650331906163',
  GUILD_ID: '969420681349574677',

  // Roles
  ROLE_AUTORIZADO: '1476467289418367158',
  ROLE_OBJETIVO: '1476467289418367158',
  ROLE_ADMIN: '983987481961717782',

  // Canales
  CANAL_PERMITIDO: '1476468295006818304',
  CANAL_URL: 'https://discord.com/channels/969420681349574677/1476467569664852009',

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
  IMG_PANEL: 'https://i.imgur.com/LLvS7zA.jpeg',
  IMG_MAMUT: 'https://i.imgur.com/hWRtOdm.jpeg',

  // Archivos de persistencia
  HISTORIAL_FILE: 'historial.json',
  PANEL_FILE: 'panel.json',

  // Límites
  MAX_HISTORIAL: 50,
  DMS_POR_MIEMBRO: 3,
  COOLDOWN_MS: 30000,
  DM_DELAY_MS: 500, // Pausa entre cada DM (ms)
  AUTO_PANEL_INTERVAL_MS: 60 * 60 * 1000, // 1 hora
};
