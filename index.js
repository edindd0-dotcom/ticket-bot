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

const STAFF_ROLE_ID = "1476303358494113969";
const CATEGORY_ID = "1476319633387815124";

let ticketCount = {};

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!bilet") {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Destek Sistemi")
      .setDescription("Destek almak için aşağıdaki butona bas.")
      .setColor("Green");

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("🎫 Bilet Aç")
          .setStyle(ButtonStyle.Success)
      );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const user = interaction.user;
  const guild = interaction.guild;

  // 🎫 BİLET OLUŞTUR
  if (interaction.customId === "create_ticket") {

    if (!ticketCount[user.id]) ticketCount[user.id] = 1;
    else ticketCount[user.id]++;

    const channelName = `bilet-${user.username}-${ticketCount[user.id]}`;

    const channel = await guild.channels.create({
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
            PermissionsBitField.Flags.SendMessages],
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("request_close")
        .setLabel("🔒 Kapat")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `🎫 Hoşgeldin ${user}\nYetkililer seninle ilgilenecek.`,
      components: [closeButton]
    });

    await interaction.reply({ content: "✅ Bilet oluşturuldu!", ephemeral: true });
  }

  // 🔒 KAPAT BUTONU (TICKET TOOL MANTIĞI)
  if (interaction.customId === "request_close") {

    // Eğer yetkiliyse direkt kapat
    if (interaction.member.roles.cache.has(STAFF_ROLE_ID)) {

      await interaction.reply({ 
        content: "🛑 Bilet kapatılıyor...", 
        ephemeral: false 
      });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 2000);

    } else {

      // Üye ise sadece talep gönder
      await interaction.reply({ 
        content: "📩 Kapatma talebi gönderildi. Yetkililer onaylayınca kapanacaktır.", 
        ephemeral: true 
      });

      interaction.channel.send("⚠️ Bu bilet için kapatma talebi gönderildi. Yetkililer onaylayabilir.");
    }
  }
});

client.login(process.env.TOKEN);
