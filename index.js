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

// AYARLARIN (Burası senin verdiğin ID'ler)
const STAFF_ROLE_ID = "1476645986842447995";
const CATEGORY_ID = "1482906193935597751";

let ticketCount = {};

client.once("ready", () => {
  console.log(`${client.user.tag} aktif ve biletleri bekliyor!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // Paneli göndermek için komut: !bilet
  if (message.content === "!bilet") {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Destek Sistemi")
      .setDescription("Destek almak için aşağıdaki butona bas.")
      .setColor("Green");

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Bilet Aç")
          .setStyle(ButtonStyle.Success)
      );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { user, guild, channel } = interaction;

  // BİLET OLUŞTURMA
  if (interaction.customId === "create_ticket") {
    if (!ticketCount[user.id]) ticketCount[user.id] = 1;
    else ticketCount[user.id]++;

    const channelName = `bilet-${user.username}-${ticketCount[user.id]}`;

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
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
            .setLabel("❌ Bileti Kapat")
            .setStyle(ButtonStyle.Danger)
        );

      await ticketChannel.send({
        content: `🎫 Hoş geldin <@${user.id}>, yetkililer yakında seninle ilgilenecek.`,
        components: [closeButton]
      });

      await interaction.reply({ 
        content: `✅ Biletin oluşturuldu: <#${ticketChannel.id}>`, 
        ephemeral: true 
      });

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "❌ Bilet oluşturulurken bir hata oluştu. Kategori ID'sini veya yetkileri kontrol et!", ephemeral: true });
    }
  }

  // BİLET KAPATMA
  if (interaction.customId === "close_ticket") {
    await interaction.reply({ content: "⏳ Bilet 5 saniye içinde kapatılıyor...", ephemeral: true });
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

// Hosting üzerinden çalışması için TOKEN değişkeni
client.login(process.env.TOKEN);
