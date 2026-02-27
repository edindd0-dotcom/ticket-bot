const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const STAFF_ROLE_ID = "1476303358494113969";
const CATEGORY_ID = "1476319633387815124";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("clientReady", () => {
  console.log(`${client.user.tag} aktif!`);
});


// Ticket mesajı oluşturma
client.on("messageCreate", async (message) => {
  if (message.content === "!ticket") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("🎫 Ticket Aç")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: "Destek almak için butona basın.",
      components: [row]
    });
  }
});


// Buton sistemi
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Ticket oluştur
  if (interaction.customId === "create_ticket") {

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );

    if (existing) {
      return interaction.reply({ content: "Zaten açık ticketin var!", ephemeral: true });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
          ]
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
          ]
        }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Kapat")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle("🎫 Ticket Açıldı")
      .setDescription(`Hoşgeldin ${interaction.user}\nYetkililer seninle ilgilenecek.`);

    await channel.send({
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [embed],
      components: [closeRow]
    });

    interaction.reply({ content: `Ticket oluşturuldu: ${channel}`, ephemeral: true });
  }

  // Ticket kapatma
  if (interaction.customId === "close_ticket") {

    await interaction.reply("Ticket kapatılıyor...");

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription(`🔒 Ticket Closed by ${interaction.user}`);

    await interaction.channel.send({ embeds: [embed] });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }

});

client.login("BURAYA_TOKEN");
