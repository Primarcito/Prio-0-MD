// Estado global compartido — todos los módulos importan este mismo objeto por referencia.
module.exports = {
  client: null,

  // Cooldown para evitar doble disparo
  cooldowns: new Set(),

  // Roles Prio temporales entregados por MAMUT
  prioTemporalTimeouts: new Map(),
  prioTemporalExpirations: new Map(),

  // Historial de mamuts (persistido en historial.json)
  historialMamut: [],

  // Panel state (persistido en panel.json)
  panelChannelId: null,
  panelMessageId: null,
  panelMessage: null,
  panelRepostTimeout: null,
  schedulePanelRepost: null,

  // Contador persistente del canal MAMUT
  contadorChannelId: null,
  contadorMessageId: null,
  contadorMessage: null,
  contadorActivo: false,
  contadorTimeout: null,
  contadorInterval: null,
};
