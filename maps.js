const settings = require('./settings');

const MAPAS_API_URL = settings.maps.apiUrl;
const CACHE_MS = settings.maps.cacheMs;
const CITY_ALIASES = settings.maps.cityAliases;

let cache = {
  loadedAt: 0,
  data: {},
};

async function getAllMaps() {
  const now = Date.now();
  if (now - cache.loadedAt < CACHE_MS) return cache.data;

  const response = await fetch(MAPAS_API_URL);
  if (!response.ok) throw new Error(`Mapas API respondió ${response.status}`);

  const data = await response.json();
  cache = {
    loadedAt: now,
    data,
  };

  return data;
}

async function getMapsForCity(city) {
  try {
    const maps = await getAllMaps();
    const sourceCity = CITY_ALIASES[city] || city;
    return maps[sourceCity] || [];
  } catch (err) {
    console.error('[MAPAS API]', err.message);
    return [];
  }
}

module.exports = {
  MAPAS_API_URL,
  getMapsForCity,
};
