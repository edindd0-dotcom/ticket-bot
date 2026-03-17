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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // Intent'lerin açık olması şart!
  ]
});

const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`${client.user.tag} Bilet Sistemi Hazır!`);
});

// PANEL OLUŞTURMA
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Destek talebi oluşturmak için aşağıdaki butona basın.")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool Tasarımı" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Bilet oluştur")
        .setEmoji("📩")
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const { guild, user, channel } = interaction;

  // 1. BİLET OLUŞTURMA (Hata korumalı)
  if (interaction.customId === "create_ticket") {
    // "Etkileşim başarısız" hatasını önlemek için hemen yanıt veriyoruz
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticketChannel = await guild.channels.create({
        name: `bilet-${user.username}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ],
      });

      await ticketChannel.setTopic(user.id);

      const welcomeEmbed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} Hoş Geldin`, iconURL: user.displayAvatarURL() })
        .setDescription("Yetkililer kısa süre içinde burada olacaktır.\nKapatmak için butona basın.")
        .setColor("#2ecc71");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
      );

      await ticketChannel.send({ content: `<@${user.id}> Hoş Geldin`, embeds: [welcomeEmbed], components: [row] });
      await interaction.editReply({ content: `Bilet açıldı: <#${ticketChannel.id}>` });

    } catch (e) {
      console.error(e);
      await interaction.editReply({ content: "Bilet oluşturulurken bir hata oluştu. Kategori ID'sini kontrol et!" });
    }
  }

  // 2. KAPATMA İŞLEMİ
  if (interaction.customId === "close_request") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Kapat").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("İptal").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ content: "Bu bileti kapatmak istediğinizden emin misiniz?", components: [confirmRow] });
  }

  // 3. ONAY VE ERİŞİM KESME
  if (interaction.customId === "confirm_close") {
    if (channel.name.startsWith("kapalı-")) return;
    await interaction.message.delete().catch(() => {});
    
    const ownerId = channel.topic;
    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});
    }

    await channel.setName(`kapalı-${channel.name}`);

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("reopen").setLabel("Aç").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("delete_ticket").setLabel("Sil").setEmoji("⛔").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ 
      embeds: [
        new EmbedBuilder().setDescription(`Bilet <@${user.id}> tarafından kapatıldı.`).setColor("#f1c40f"),
        new EmbedBuilder().setDescription("```Destek ekibi kontrolleri```").setColor("#34495e")
      ], 
      components: [controlRow] 
    });
  }

  if (interaction.customId === "delete_ticket") {
    await interaction.reply("Bilet siliniyor...");
    setTimeout(() => channel.delete().catch(() => {}), 3000);
  }
});

client.login(process.env.TOKEN);
