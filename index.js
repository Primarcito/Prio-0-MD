require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1476138650331906163';
const GUILD_ID = '969420681349574677';
const ROLE_AUTORIZADO = '1476467289418367158';
const ROLE_OBJETIVO = '1476467289418367158';
const CANAL_PERMITIDO = '1476468295006818304';
const CANAL_URL = 'https://discord.com/channels/969420681349574677/1476467569664852009';

const CIUDADES = ['Lymhurst', 'Martlock', 'Fort Sterling', 'Thetford', 'Bridgewatch', 'Roja'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ─── Construye el embed + botón del panel ────────────────────────────────────
function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🦣 Panel Mamut')
    .setColor(0x8B0000)
    .setDescription('Presioná el botón para notificar el mamut a toda la guild por DM.')
    .addFields(
      { name: '📢 /mamut', value: 'Notifica el lock con la ciudad elegida (3 DMs por persona)', inline: false }
    )
    .setFooter({ text: 'Solo puede usarlo quien tenga el rol autorizado' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abrir_selector_mamut')
      .setLabel('MAMUT')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🦣')
  );

  return { embeds: [embed], components: [row] };
}

// ─── Construye el selector de ciudades ───────────────────────────────────────
function buildSelectorCiudades() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('selector_ciudad')
    .setPlaceholder('Seleccioná la ciudad del lock...')
    .addOptions(
      CIUDADES.map(c =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c)
          .setValue(c)
          .setEmoji('🦣')
      )
    );

  const row = new ActionRowBuilder().addComponents(select);
  return { content: '🦣 **¿En qué ciudad salió el mamut?**', components: [row], ephemeral: true };
}

// ─── Envía DMs a todos los miembros del rol ───────────────────────────────────
async function enviarMamut(guild, lock) {
  await guild.members.fetch(); // ✅ Fix: asegura que todos los miembros estén cargados

  const targets = guild.members.cache.filter(m => m.roles.cache.has(ROLE_OBJETIVO));

  const mensajeFinal = `---- 🦣🦣🦣 ----
**LOCK:** ||${lock}||
---- 🦣🦣🦣 ----
${CANAL_URL}`;

  let contador = 0;
  for (const [, target] of targets) {
    for (let i = 0; i < 3; i++) {
      try {
        await target.send(mensajeFinal);
        contador++;
      } catch (err) {
        console.log(`Error enviando DM a ${target.user.tag}:`, err.message);
      }
    }
  }
  return contador;
}

// ─── Crea o actualiza el panel en el canal ────────────────────────────────────
async function sincronizarPanel(guild) {
  console.log(`Buscando canal: ${CANAL_PERMITIDO}`);
  const canal = await guild.channels.fetch(CANAL_PERMITIDO).catch(err => {
    console.error('Error al buscar canal:', err.message);
    return null;
  });
  if (!canal) {
    console.error('Canal no encontrado o sin acceso.');
    return;
  }
  console.log(`Canal encontrado: #${canal.name}`);

  // Busca si ya existe un mensaje del bot con el panel
  const mensajes = await canal.messages.fetch({ limit: 50 });
  const panelExistente = mensajes.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );

  const panelData = buildPanel();

  if (panelExistente) {
    await panelExistente.edit(panelData);
    console.log('Panel actualizado.');
  } else {
    await canal.send(panelData);
    console.log('Panel creado.');
  }
}

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once('clientReady', async () => {
  console.log(`PRIO 0 conectado como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('mamut')
      .setDescription('🦣 Notifica el lock a toda la guild')
      .addStringOption(option =>
        option.setName('lock')
          .setDescription('Selecciona el lock')
          .setRequired(true)
          .addChoices(
            ...CIUDADES.map(c => ({ name: c, value: c }))
          )
      ),
    new SlashCommandBuilder()
      .setName('mensaje')
      .setDescription('Actualizar estado')
      .addStringOption(option =>
        option.setName('texto')
          .setDescription('Texto a enviar')
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('Slash commands registrados.');

  // Sincroniza el panel al iniciar
  const guild = await client.guilds.fetch(GUILD_ID);
  await sincronizarPanel(guild);
});

// ─── Interacciones ────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {

  if (interaction.guildId !== GUILD_ID) return;
  if (interaction.channelId !== CANAL_PERMITIDO) {
    if (interaction.isRepliable()) {
      return interaction.reply({ content: 'Este comando solo se puede usar en el canal autorizado.', ephemeral: true });
    }
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const autorizado = member.roles.cache.has(ROLE_AUTORIZADO);

  try {

    // ── Botón principal MAMUT → abre selector ────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'abrir_selector_mamut') {

      if (!autorizado) {
        return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
      }

      return interaction.reply(buildSelectorCiudades());
    }

    // ── Selector de ciudad → envía DMs ───────────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'selector_ciudad') {

      if (!autorizado) {
        return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
      }

      const lock = interaction.values[0];
      await interaction.deferReply({ ephemeral: true });

      const contador = await enviarMamut(interaction.guild, lock);
      return interaction.editReply(`✅ Mamut **${lock}** notificado. Enviados ${contador} mensajes.`);
    }

    // ── Slash commands ───────────────────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;

    if (!autorizado) {
      return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    if (interaction.commandName === 'mamut') {
      const lock = interaction.options.getString('lock');
      const contador = await enviarMamut(interaction.guild, lock);
      return interaction.editReply(`✅ Enviados ${contador} mensajes. Lock: **${lock}**`);
    }

    if (interaction.commandName === 'mensaje') {
      const texto = interaction.options.getString('texto');

      await interaction.guild.members.fetch(); // ✅ Fix también aquí
      const targets = interaction.guild.members.cache.filter(m => m.roles.cache.has(ROLE_OBJETIVO));

      let contador = 0;
      for (const [, target] of targets) {
        try {
          await target.send(texto);
          contador++;
        } catch (err) {
          console.log(`Error enviando DM a ${target.user.tag}:`, err.message);
        }
      }
      return interaction.editReply(`✅ Enviados ${contador} mensajes.`);
    }

  } catch (err) {
    console.error(err);
    if (interaction.deferred) {
      return interaction.editReply('❌ Error interno.');
    } else if (interaction.isRepliable()) {
      return interaction.reply({ content: '❌ Error interno.', ephemeral: true });
    }
  }

});

client.login(TOKEN);
