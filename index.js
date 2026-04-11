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
  ButtonStyle
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

// ─── Construye el embed + botones del panel ───────────────────────────────────
function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🦣 Panel Mamut')
    .setColor(0x8B0000)
    .setDescription('Presioná el botón de la ciudad para notificar a toda la guild por DM.')
    .addFields(
      { name: '📢 /mamut', value: 'Notifica el lock con la ciudad elegida (3 DMs por persona)', inline: false },
      { name: '💬 /mensaje', value: 'Envía un mensaje libre a todos los miembros del rol', inline: false }
    )
    .setFooter({ text: 'Solo puede usarlo quien tenga el rol autorizado' });

  // Dos filas de botones (máx 5 por fila)
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mamut_Lymhurst').setLabel('Lymhurst').setStyle(ButtonStyle.Danger).setEmoji('🦣'),
    new ButtonBuilder().setCustomId('mamut_Martlock').setLabel('Martlock').setStyle(ButtonStyle.Danger).setEmoji('🦣'),
    new ButtonBuilder().setCustomId('mamut_Fort Sterling').setLabel('Fort Sterling').setStyle(ButtonStyle.Danger).setEmoji('🦣'),
    new ButtonBuilder().setCustomId('mamut_Thetford').setLabel('Thetford').setStyle(ButtonStyle.Danger).setEmoji('🦣'),
    new ButtonBuilder().setCustomId('mamut_Bridgewatch').setLabel('Bridgewatch').setStyle(ButtonStyle.Danger).setEmoji('🦣')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mamut_Roja').setLabel('Roja').setStyle(ButtonStyle.Danger).setEmoji('🦣')
  );

  return { embeds: [embed], components: [row1, row2] };
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
  const canal = await guild.channels.fetch(CANAL_PERMITIDO);
  if (!canal) return;

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

    // ── Botones ──────────────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('mamut_')) {

      if (!autorizado) {
        return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
      }

      const lock = interaction.customId.replace('mamut_', '');
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
