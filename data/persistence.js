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
  prioTemporal: 'prio_temporal',
};

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

async function cargarHistorial() {
  const data = await loadState(KEYS.historial, config.HISTORIAL_FILE, []);
  state.historialMamut = Array.isArray(data) ? data : [];
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
  guardarPrioTemporal,
  cargarPrioTemporal,
};
