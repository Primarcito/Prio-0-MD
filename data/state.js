// Estado global compartido — todos los módulos importan este mismo objeto por referencia.
module.exports = {
  client: null,

  // Cooldown para evitar doble disparo
  cooldowns: new Set(),

  // Historial de mamuts (persistido en historial.json)
  historialMamut: [],

  // Panel state (persistido en panel.json)
  panelChannelId: null,
  panelMessageId: null,
  panelMessage: null,
};
