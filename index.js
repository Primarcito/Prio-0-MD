require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require('discord.js');

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1476138650331906163';
const GUILD_ID = '969420681349574677';
const ROLE_AUTORIZADO = '1476467289418367158';
const ROLE_OBJETIVO = '1476467289418367158';
const CANAL_PERMITIDO = '1476468295006818304'; // ✅ Canal donde SÍ funciona
const CANAL_URL = 'https://discord.com/channels/969420681349574677/1476467569664852009';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('clientReady', async () => {
  console.log(`PRIO 0 conectado como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('mamut')
      .setDescription('🦣')
      .addStringOption(option =>
        option.setName('lock')
          .setDescription('Selecciona el lock')
          .setRequired(true)
          .addChoices(
            { name: 'Lymhurst', value: 'Lymhurst' },
            { name: 'Martlock', value: 'Martlock' },
            { name: 'Fort Sterling', value: 'Fort Sterling' },
            { name: 'Thetford', value: 'Thetford' },
            { name: 'Bridgewatch', value: 'Bridgewatch' },
            { name: 'Roja', value: 'Roja' }
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

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log('Slash commands registrados.');
});

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isChatInputCommand()) return;
  if (interaction.guildId !== GUILD_ID) return;

  // 🔒 Bloquea uso fuera del canal permitido
  if (interaction.channelId !== CANAL_PERMITIDO) {
    return interaction.reply({
      content: 'Este comando solo se puede usar en el canal autorizado.',
      ephemeral: true
    });
  }

  try {

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(ROLE_AUTORIZADO)) {
      return interaction.reply({ content: 'No autorizado.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const targets = interaction.guild.members.cache.filter(m =>
      m.roles.cache.has(ROLE_OBJETIVO)
    );

    let contador = 0;

    // -------- MAMUT --------
    if (interaction.commandName === 'mamut') {

      const lock = interaction.options.getString('lock');

      const mensajeFinal = `---- 🦣🦣🦣 ----
**LOCK:** ||${lock}||
---- 🦣🦣🦣 ----
${CANAL_URL}`;

      for (const [, target] of targets) {
        for (let i = 0; i < 3; i++) {
          try {
            await target.send(mensajeFinal);
            contador++;
          } catch (err) {
            console.log("Error enviando DM:", err.message);
          }
        }
      }

      return interaction.editReply(`✔ Enviados ${contador} mensajes.`);
    }

    // -------- MENSAJE --------
    if (interaction.commandName === 'mensaje') {

      const texto = interaction.options.getString('texto');

      for (const [, target] of targets) {
        try {
          await target.send(texto);
          contador++;
        } catch (err) {
          console.log("Error enviando DM:", err.message);
        }
      }

      return interaction.editReply(`✔ Enviados ${contador} mensajes.`);
    }

  } catch (err) {
    console.error(err);
    if (interaction.deferred) {
      return interaction.editReply("Error.");
    } else {
      return interaction.reply({ content: "Error.", ephemeral: true });
    }
  }

});

client.login(TOKEN);