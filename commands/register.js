const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('../config');

const commandDefs = [
  new SlashCommandBuilder()
    .setName('mamut')
    .setDescription('🦣 Notifica el lock a toda la guild')
    .addStringOption(option =>
      option.setName('lock')
        .setDescription('Selecciona el lock')
        .setRequired(true)
        .addChoices(
          ...config.CIUDADES.map(c => ({ name: c, value: c }))
        )
    ),

  new SlashCommandBuilder()
    .setName('mensaje')
    .setDescription('📨 Envía un mensaje a todos los miembros del rol')
    .addStringOption(option =>
      option.setName('texto')
        .setDescription('Texto a enviar')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('🔧 Recrea el panel en el canal (solo admins)'),

  new SlashCommandBuilder()
    .setName('mamut-panel')
    .setDescription('Recrea el panel de MAMUT en el canal'),

  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('📋 Muestra el historial de mamuts enviados (solo admins)'),

  require('./mover').data,
];

// Map para el router de interacciones
const commandsMap = new Map();

function getCommandsMap() {
  // Se llena después de importar los archivos de cada comando
  const mamut = require('./mamut');
  const mensaje = require('./mensaje');
  const panel = require('./panel');
  const logs = require('./logs');
  const mover = require('./mover');

  commandsMap.set('mamut', mamut);
  commandsMap.set('mensaje', mensaje);
  commandsMap.set('panel', panel);
  commandsMap.set('mamut-panel', panel);
  commandsMap.set('logs', logs);
  commandsMap.set('mover', mover);

  return commandsMap;
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.TOKEN);
  const botUser = await rest.get('/users/@me');
  const applicationId = botUser.id;

  if (config.CLIENT_ID !== applicationId) {
    console.warn(`CLIENT_ID configurado (${config.CLIENT_ID}) no coincide con el bot (${applicationId}); usando el ID del token.`);
  }

  await rest.put(
    Routes.applicationGuildCommands(applicationId, config.GUILD_ID),
    { body: commandDefs.map(cmd => cmd.toJSON()) }
  );
  console.log('Slash commands registrados.');
}

module.exports = { registerCommands, getCommandsMap };
