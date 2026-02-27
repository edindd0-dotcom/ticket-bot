const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.login(process.env.TOKEN);
const STAFF_ROLE_ID = "1476303358494113969";
const CATEGORY_ID = "1476319633387815124";

let ticketCount = {};

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

client.on("messageCreate", async (message) => {
  if (message.content === "!ticket") {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Destek Sistemi")
      .setDescription("Ticket açmak için aşağıdaki butona bas.")
      .setColor("Green");

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("🎫 Ticket Aç")
          .setStyle(ButtonStyle.Success)
      );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "create_ticket") {

    const user = interaction.user;
    const guild = interaction.guild;

    if (!ticketCount[user.id]) ticketCount[user.id] = 1;
    else ticketCount[user.id]++;

    const channelName = `${user.username}-${ticketCount[user.id]}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
      ],
    });

    const closeButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("❌ Ticket Kapat")
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({
      content: `🎫 Hoşgeldin ${user}, yetkililer seninle ilgilenecek.`,
      components: [closeButton]
    });

    await interaction.reply({ content: "Ticket oluşturuldu!", ephemeral: true });
  }

  if (interaction.customId === "close_ticket") {
    await interaction.channel.delete();
  }
});

client.login(TOKEN);
