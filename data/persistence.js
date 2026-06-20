const fs = require('fs');
const path = require('path');
const config = require('../config');
const state = require('./state');

const ROOT = path.join(__dirname, '..');

// ─── Historial de mamuts ──────────────────────────────────────────────────────

function guardarHistorial() {
  fs.writeFileSync(
    path.join(ROOT, config.HISTORIAL_FILE),
    JSON.stringify(state.historialMamut, null, 2)
  );
}

function cargarHistorial() {
  const filePath = path.join(ROOT, config.HISTORIAL_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      state.historialMamut = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error cargando historial:', err.message);
      state.historialMamut = [];
    }
  }
}

// ─── Panel message ID ─────────────────────────────────────────────────────────

function guardarPanel() {
  fs.writeFileSync(
    path.join(ROOT, config.PANEL_FILE),
    JSON.stringify({
      channelId: state.panelChannelId,
      messageId: state.panelMessageId
    }, null, 2)
  );
}

function cargarPanel() {
  const filePath = path.join(ROOT, config.PANEL_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      state.panelChannelId = data.channelId || null;
      state.panelMessageId = data.messageId || null;
    } catch (err) {
      console.error('Error cargando panel:', err.message);
      state.panelChannelId = null;
      state.panelMessageId = null;
    }
  }
}

// Prio temporal entregado por MAMUT

function guardarPrioTemporal() {
  fs.writeFileSync(
    path.join(ROOT, config.PRIO_TEMPORAL_FILE),
    JSON.stringify([...state.prioTemporalExpirations.entries()], null, 2)
  );
}

function cargarPrioTemporal() {
  const filePath = path.join(ROOT, config.PRIO_TEMPORAL_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      state.prioTemporalExpirations = new Map(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando Prio temporal:', err.message);
      state.prioTemporalExpirations = new Map();
    }
  }
}

module.exports = {
  guardarHistorial,
  cargarHistorial,
  guardarPanel,
  cargarPanel,
  guardarPrioTemporal,
  cargarPrioTemporal,
};
