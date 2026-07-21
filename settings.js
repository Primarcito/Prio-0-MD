const SETTINGS = {
  servers: {
    // Servidor donde se registran y atienden los comandos del bot.
    main: '1435778823743340650',
    // Servidor exclusivo para el comando /rol
    rolAdmin: '969420681349574677',
  },

  roles: {
    // Scouts que pueden usar /mamut en cualquier canal y el botón del panel.
    mamut: [
      '1435778823743340651',
      '1435778823743340652',
      // 'OTRO_ROL_ID',
    ],

    // Puede usar /mensaje.
    mensaje: [
      '1505949443529375845',
      '1435778823743340652',
      // 'OTRO_ROL_ID',
    ],

    // Roles que reciben la mención y los mensajes directos del MAMUT.
    objetivo: [
      '1506387790265581588',
      '1435778823743340652',
      // 'OTRO_ROL_ID',
    ],

    // Rol Prio temporal para scouts que activan MAMUT.
    prioTemporal: '1506387790265581588',

    // Puede recrear el panel y ver logs.
    admin: [
      '1505949443529375845',
      '1435778823743340652',
      // 'OTRO_ROL_ID',
    ],

    // Puede usar /mover en cualquier canal.
    mover: [
      '1505949443529375845',
      '1435778823743340652',
      // 'OTRO_ROL_ID',
    ],

    // Roles que pueden usar /rol en el servidor dedicado.
    rolAdmin: [
      '983987481961717782',
      '1336825861466488975',
    ],
  },

  channels: {
    // Canal donde funciona el panel y los comandos de MAMUT.
    permitido: '1475677385473921198',
  },

  urls: {
    // Link incluido en los mensajes directos del MAMUT.
    mamut: 'https://discord.com/channels/1435778823743340650/1435778824968343634',
  },

  maps: {
    // Endpoint público del MapasBot. Prio0 lee de aquí los mapas disponibles.
    apiUrl: 'https://mapas-bot-production.up.railway.app/mapas',

    // Tiempo que Prio0 guarda la respuesta antes de volver a consultar MapasBot.
    cacheMs: 30 * 1000,

    cityAliases: {
      // En Prio0 se llama "Roja"; en MapasBot se llama "Zona Roja".
      Roja: 'Zona Roja',
    },
  },
};

module.exports = SETTINGS;
