require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const state = require('./data/state');
const {
  inicializarPersistencia,
  cargarHistorial,
  cargarPanel,
  cargarPrioTemporal,
  cargarContador,
  guardarPanel,
} = require('./data/persistence');
const { registerCommands, getCommandsMap } = require('./commands/register');
const handleButton = require('./handlers/buttonHandler');
const handleSelect = require('./handlers/selectHandler');
const { buildPanel } = require('./embeds/mamutEmbeds');
const { restaurarPrioTemporal } = require('./utils/prioTemporal');
const { restaurarContador } = require('./utils/contador');

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

/* ================= ROUTER DE INTERACCIONES ================= */

client.on('interactionCreate', async interaction => {
  try {
    const isMainGuild = interaction.guildId === config.GUILD_ID;
    const isRolGuild = interaction.guildId === config.GUILD_ID_ROL;

    // Servidor exclusivo de /rol — solo responde autocomplete y /rol
    if (isRolGuild) {
      if (interaction.isAutocomplete()) {
        const cmd = commands.get(interaction.commandName);
        if (cmd && cmd.autocomplete) return cmd.autocomplete(interaction);
      }
      if (interaction.isChatInputCommand() && interaction.commandName === 'rol') {
        const cmd = commands.get('rol');
        if (cmd) return cmd.execute(interaction);
      }
      return;
    }

    // A partir de acá solo el servidor principal
    if (!isMainGuild) return;

    // mover y mamut bypassan el filtro de canal
    if (
      interaction.isChatInputCommand() &&
      ['mover', 'mamut'].includes(interaction.commandName)
    ) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) return cmd.execute(interaction);
    }

    if (interaction.channelId !== config.CANAL_PERMITIDO) {
      if (interaction.isAutocomplete()) return;
      if (interaction.isRepliable()) {
        return interaction.reply({
          content: '❌ Este comando solo se puede usar en el canal permitido.',
          ephemeral: true
        });
      }
      return;
    }

    // Autocomplete
    if (interaction.isAutocomplete()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd && cmd.autocomplete) return cmd.autocomplete(interaction);
    }

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

  // Borrar paneles anteriores huérfanos.
  const mensajes = await canal.messages.fetch({ limit: 50 });
  const paneles = mensajes.filter(
    m => m.author.id === client.user.id &&
         m.embeds.length > 0 &&
         m.embeds[0].description?.includes('PANEL MAMUT')
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
  await guardarPanel();

  console.log('Panel creado.');
}

async function recrearPanel(guild) {
  if (state.panelMessage) {
    await state.panelMessage.delete().catch(() => {});
  }

  state.panelChannelId = null;
  state.panelMessageId = null;
  state.panelMessage = null;
  await guardarPanel();

  await sincronizarPanel(guild);
}

function schedulePanelRepost(guild) {
  if (state.panelRepostTimeout) clearTimeout(state.panelRepostTimeout);

  state.panelRepostTimeout = setTimeout(async () => {
    try {
      await recrearPanel(guild);
      console.log('Panel reenviado 10 minutos después del MAMUT.');
    } catch (err) {
      console.error('Error reenviando panel después del MAMUT:', err);
    } finally {
      state.panelRepostTimeout = null;
    }
  }, config.PANEL_REPOST_AFTER_MAMUT_MS);
}

state.schedulePanelRepost = schedulePanelRepost;

/* ================= READY ================= */

client.once('clientReady', async () => {
  console.log(`PRIO 0 conectado como ${client.user.tag}`);

  const guild = await client.guilds.fetch(config.GUILD_ID);
  await restaurarPrioTemporal(guild);

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
      await guardarPanel();
    }
  }

  // Si no se recuperó, crear nuevo. Si se recuperó, actualizar contenido.
  await restaurarContador(guild);
  await sincronizarPanel(guild);

  // Auto-actualización del panel cada hora (edita en lugar de recrear)
  setInterval(async () => {
    await sincronizarPanel(guild);
  }, config.AUTO_PANEL_INTERVAL_MS);
});

/* ================= ARRANQUE ================= */

async function main() {
  try {
    await inicializarPersistencia();
    await cargarHistorial();
    await cargarPanel();
    await cargarPrioTemporal();
    await cargarContador();
    await registerCommands();
    await client.login(config.TOKEN);
  } catch (err) {
    console.error('Error iniciando PRIO 0:', err);
    process.exit(1);
  }
}

main();
