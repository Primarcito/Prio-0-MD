require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const state = require('./data/state');
const { cargarHistorial, cargarPanel, guardarPanel } = require('./data/persistence');
const { registerCommands, getCommandsMap } = require('./commands/register');
const handleButton = require('./handlers/buttonHandler');
const handleSelect = require('./handlers/selectHandler');
const { buildPanel } = require('./embeds/mamutEmbeds');

/* ================= CARGAR DATOS PERSISTIDOS ================= */

cargarHistorial();
cargarPanel();

/* ================= CREAR CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

state.client = client;

/* ================= REGISTRAR SLASH COMMANDS ================= */

const commands = getCommandsMap();

(async () => {
  await registerCommands();
})();

/* ================= ROUTER DE INTERACCIONES ================= */

client.on('interactionCreate', async interaction => {
  // Filtrar guild y canal
  if (interaction.guildId !== config.GUILD_ID) return;
  if (interaction.channelId !== config.CANAL_PERMITIDO) {
    if (interaction.isRepliable()) {
      return interaction.reply({
        content: '❌ Este comando solo se puede usar en el canal autorizado.',
        ephemeral: true
      });
    }
    return;
  }

  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) return cmd.execute(interaction);
    }

    // Botones
    if (interaction.isButton()) return handleButton(interaction);

    // Select menus
    if (interaction.isStringSelectMenu()) return handleSelect(interaction);

  } catch (err) {
    console.error('[ERROR]', err);
    if (interaction.deferred) {
      return interaction.editReply('❌ Error interno.');
    } else if (interaction.isRepliable()) {
      return interaction.reply({ content: '❌ Error interno.', ephemeral: true });
    }
  }
});

/* ================= HANDLER GLOBAL DE ERRORES ================= */

process.on('unhandledRejection', (err) => {
  if (err?.code === 10062) return; // Unknown interaction — ignorar
  console.error('Unhandled rejection:', err);
});

client.on('error', (err) => {
  console.error('Client error:', err);
});

/* ================= HANDLER DE PANEL PEGAJOSO ================= */
let stickyTimeout = null;

client.on('messageCreate', async (message) => {
  if (message.guildId !== config.GUILD_ID) return;
  if (message.channelId !== config.CANAL_PERMITIDO) return;

  // Evitar bucle infinito: si el mensaje que se acaba de enviar ES el panel, lo ignoramos.
  if (message.author.id === client.user.id) {
    if (message.embeds.length > 0 && message.embeds[0].footer?.text?.includes('TyrannT')) {
      return;
    }
  }

  // Borrar el panel actual para que desaparezca de arriba
  if (state.panelMessage) {
    state.panelMessage.delete().catch(() => {});
    state.panelMessage = null;
  }

  // Debounce: Esperar 2 segundos sin mensajes nuevos para recrearlo al fondo
  if (stickyTimeout) clearTimeout(stickyTimeout);
  stickyTimeout = setTimeout(async () => {
    if (message.guild) await sincronizarPanel(message.guild);
  }, 2000);
});

/* ================= SINCRONIZAR PANEL ================= */

async function sincronizarPanel(guild) {
  const canal = await guild.channels.fetch(config.CANAL_PERMITIDO).catch(err => {
    console.error('Error al buscar canal:', err.message);
    return null;
  });
  if (!canal) return;

  const panelData = buildPanel();

  // Si ya tenemos un panel persistido, editar en lugar de borrar/recrear
  if (state.panelMessage) {
    try {
      await state.panelMessage.edit(panelData);
      console.log('Panel actualizado (edit).');
      return;
    } catch (err) {
      console.log('No se pudo editar el panel, recreando...', err.message);
      state.panelMessage = null;
    }
  }

  // Borrar paneles anteriores huérfanos (que tengan "PANEL MAMUT" en el embed)
  const mensajes = await canal.messages.fetch({ limit: 50 });
  const paneles = mensajes.filter(
    m => m.author.id === client.user.id &&
         m.embeds.length > 0 &&
         m.embeds[0].footer?.text?.includes('TyrannT')
  );
  for (const [, msg] of paneles) {
    await msg.delete().catch(() => {});
  }

  // Crear nuevo panel
  const msg = await canal.send(panelData);

  // Persistir referencia
  state.panelChannelId = canal.id;
  state.panelMessageId = msg.id;
  state.panelMessage = msg;
  guardarPanel();

  console.log('Panel creado.');
}

/* ================= READY ================= */

client.once('clientReady', async () => {
  console.log(`PRIO 0 conectado como ${client.user.tag}`);

  const guild = await client.guilds.fetch(config.GUILD_ID);

  // Cargar todos los miembros en caché
  await guild.members.fetch();
  console.log(`Miembros cargados: ${guild.members.cache.size}`);

  // Intentar recuperar el panel existente
  if (state.panelChannelId && state.panelMessageId) {
    try {
      const channel = await client.channels.fetch(state.panelChannelId);
      state.panelMessage = await channel.messages.fetch(state.panelMessageId);
      console.log('Panel recuperado correctamente.');
    } catch (err) {
      console.log('Panel no encontrado, recreando...');
      state.panelChannelId = null;
      state.panelMessageId = null;
      state.panelMessage = null;
      guardarPanel();
    }
  }

  // Si no se recuperó, crear nuevo. Si se recuperó, actualizar contenido.
  await sincronizarPanel(guild);

  // Auto-actualización del panel cada hora (edita en lugar de recrear)
  setInterval(async () => {
    await sincronizarPanel(guild);
  }, config.AUTO_PANEL_INTERVAL_MS);
});

/* ================= LOGIN ================= */

client.login(config.TOKEN);
