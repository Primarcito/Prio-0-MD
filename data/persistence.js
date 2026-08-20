const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config');
const state = require('./state');

const APP_ROOT = path.join(__dirname, '..');
const DATA_ROOT = process.env.DATA_DIR || APP_ROOT;
const TABLE_NAME = 'bot_state';
const KEYS = {
  historial: 'historial_mamut',
  panel: 'panel',
  contador: 'contador',
  prioTemporal: 'prio_temporal',
  historialRecovery: 'historial_recovery_2026_07_10',
};
const HISTORIAL_RECOVERY_FILE = path.join(
  APP_ROOT,
  'data',
  'historial-recovery-2026-07-10.json'
);
const HISTORIAL_RECOVERY_MARKER_FILE = '.historial-recovery-2026-07-10.json';

let pool = null;
let databaseEnabled = false;

function getFilePath(fileName) {
  return path.join(DATA_ROOT, fileName);
}

function readJsonFile(fileName, fallback) {
  const filePath = getFilePath(fileName);
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error cargando ${fileName}:`, err.message);
    return fallback;
  }
}

function writeJsonFile(fileName, value) {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  fs.writeFileSync(getFilePath(fileName), JSON.stringify(value, null, 2));
}

function shouldUseSsl() {
  return process.env.PGSSL === 'true' || process.env.PGSSLMODE === 'require';
}

async function inicializarPersistencia() {
  if (!process.env.DATABASE_URL) {
    fs.mkdirSync(DATA_ROOT, { recursive: true });
    console.log(`[DB] DATABASE_URL no configurado. Usando archivos JSON en ${DATA_ROOT}.`);
    return;
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  databaseEnabled = true;
  await migrarJsonLocalSiHaceFalta();
  console.log('[DB] Persistencia PostgreSQL activa.');
}

async function migrarJsonLocalSiHaceFalta() {
  await migrarArchivoSiHaceFalta(KEYS.historial, config.HISTORIAL_FILE, []);
  await migrarArchivoSiHaceFalta(KEYS.panel, config.PANEL_FILE, {});
  await migrarArchivoSiHaceFalta(KEYS.contador, config.CONTADOR_FILE, {});
  await migrarArchivoSiHaceFalta(KEYS.prioTemporal, config.PRIO_TEMPORAL_FILE, []);
}

async function migrarArchivoSiHaceFalta(key, fileName, fallback) {
  const existing = await pool.query(`SELECT 1 FROM ${TABLE_NAME} WHERE key = $1`, [key]);
  if (existing.rowCount > 0) return;

  const filePath = getFilePath(fileName);
  if (!fs.existsSync(filePath)) return;

  const value = readJsonFile(fileName, fallback);
  await saveState(key, value);
  console.log(`[DB] Migrado ${fileName} a PostgreSQL.`);
}

async function loadState(key, fileName, fallback) {
  if (!databaseEnabled) return readJsonFile(fileName, fallback);

  try {
    const result = await pool.query(`SELECT value FROM ${TABLE_NAME} WHERE key = $1`, [key]);
    if (result.rowCount === 0) return fallback;
    return result.rows[0].value;
  } catch (err) {
    console.error(`[DB] Error cargando ${key}:`, err.message);
    return readJsonFile(fileName, fallback);
  }
}

async function saveState(key, value, fileName = null) {
  if (!databaseEnabled) {
    if (fileName) writeJsonFile(fileName, value);
    return;
  }

  try {
    await pool.query(
      `
        INSERT INTO ${TABLE_NAME} (key, value, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [key, JSON.stringify(value)]
    );
  } catch (err) {
    console.error(`[DB] Error guardando ${key}:`, err.message);
    if (fileName) writeJsonFile(fileName, value);
  }
}

async function guardarHistorial() {
  await saveState(KEYS.historial, state.historialMamut, config.HISTORIAL_FILE);
}

function getHistorialEntryKey(entry) {
  return [
    entry.timestamp || entry.fecha || '',
    entry.usuario || '',
    entry.ciudad || '',
    entry.mensajes || 0,
  ].join('|');
}

function readHistorialRecovery() {
  if (!fs.existsSync(HISTORIAL_RECOVERY_FILE)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(HISTORIAL_RECOVERY_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Error leyendo la recuperación del historial:', err.message);
    return [];
  }
}

async function historialRecoveryApplied() {
  if (!databaseEnabled) {
    return fs.existsSync(getFilePath(HISTORIAL_RECOVERY_MARKER_FILE));
  }

  const result = await pool.query(
    `SELECT 1 FROM ${TABLE_NAME} WHERE key = $1`,
    [KEYS.historialRecovery]
  );
  return result.rowCount > 0;
}

async function applyHistorialRecovery(data) {
  if (await historialRecoveryApplied()) return data;

  const recoveryEntries = readHistorialRecovery();
  if (recoveryEntries.length === 0) return data;

  const existingKeys = new Set(data.map(getHistorialEntryKey));
  const missingEntries = recoveryEntries.filter(
    entry => !existingKeys.has(getHistorialEntryKey(entry))
  );
  const restoredData = [...data, ...missingEntries].slice(0, config.MAX_HISTORIAL);

  await saveState(KEYS.historial, restoredData, config.HISTORIAL_FILE);
  await saveState(
    KEYS.historialRecovery,
    {
      appliedAt: new Date().toISOString(),
      restoredEntries: missingEntries.length,
    },
    HISTORIAL_RECOVERY_MARKER_FILE
  );

  console.log(`[DB] Recuperados ${missingEntries.length} registros del historial MAMUT.`);
  return restoredData;
}

async function cargarHistorial() {
  const data = await loadState(KEYS.historial, config.HISTORIAL_FILE, []);
  const historial = Array.isArray(data) ? data : [];
  state.historialMamut = await applyHistorialRecovery(historial);
}

async function guardarPanel() {
  await saveState(
    KEYS.panel,
    {
      channelId: state.panelChannelId,
      messageId: state.panelMessageId,
    },
    config.PANEL_FILE
  );
}

async function cargarPanel() {
  const data = await loadState(KEYS.panel, config.PANEL_FILE, {});
  state.panelChannelId = data?.channelId || null;
  state.panelMessageId = data?.messageId || null;
}

async function guardarContador() {
  await saveState(
    KEYS.contador,
    {
      channelId: state.contadorChannelId,
      messageId: state.contadorMessageId,
      activo: state.contadorActivo,
    },
    config.CONTADOR_FILE
  );
}

async function cargarContador() {
  const data = await loadState(KEYS.contador, config.CONTADOR_FILE, {});
  state.contadorChannelId = data?.channelId || null;
  state.contadorMessageId = data?.messageId || null;
  state.contadorActivo = data?.activo === true;
}

async function guardarPrioTemporal() {
  await saveState(
    KEYS.prioTemporal,
    [...state.prioTemporalExpirations.entries()],
    config.PRIO_TEMPORAL_FILE
  );
}

async function cargarPrioTemporal() {
  const data = await loadState(KEYS.prioTemporal, config.PRIO_TEMPORAL_FILE, []);
  state.prioTemporalExpirations = new Map(Array.isArray(data) ? data : []);
}

module.exports = {
  inicializarPersistencia,
  guardarHistorial,
  cargarHistorial,
  guardarPanel,
  cargarPanel,
  guardarContador,
  cargarContador,
  guardarPrioTemporal,
  cargarPrioTemporal,
};
