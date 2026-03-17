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
    GatewayIntentBits.GuildMembers
  ]
});

// SENİN ID'LERİN
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`${client.user.tag} Bilet Sistemi (V2) Aktif!`);
});

// ANA PANEL KOMUTU: !bilet
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Yardıma mı ihtiyacınız var? Aşağıdaki butona basarak bir bilet oluşturabilirsiniz.")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool Sistemi" });

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

  // 1. BİLET OLUŞTURMA (LİMİTLİ)
  if (interaction.customId === "create_ticket") {
    const category = guild.channels.cache.get(CATEGORY_ID);
    const alreadyHasTicket = category.children.cache.find(c => c.topic === user.id);

    if (alreadyHasTicket) {
      return interaction.reply({ content: `❌ Zaten açık bir biletiniz var: <#${alreadyHasTicket.id}>`, ephemeral: true });
    }

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
        .setDescription("Yetkililer kısa süre içinde burada olacaktır.\nKapatmak için aşağıdaki butona basın.")
        .setColor("#2ecc71");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
      );

      await ticketChannel.send({ content: `<@${user.id}> Hoş Geldin`, embeds: [welcomeEmbed], components: [row] });
      await interaction.editReply({ content: `Biletin oluşturuldu: <#${ticketChannel.id}>` });

    } catch (e) {
      await interaction.editReply("Bilet oluşturulurken bir hata oluştu. Lütfen yetkileri kontrol edin.");
    }
  }

  // 2. KAPATMA ONAYI
  if (interaction.customId === "close_request") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Kapat").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("İptal").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ content: "Bu bileti kapatmak istediğinizden emin misiniz?", components: [confirmRow] });
  }

  // 3. BİLETİ KAPAT (ÜYEYİ SİSTEMDEN ÇIKAR)
  if (interaction.customId === "confirm_close") {
    await interaction.deferUpdate();
    const ownerId = channel.topic;

    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});
    }

    await interaction.message.delete().catch(() => {});

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

  // 4. BİLETİ GERİ AÇ (ÜYEYİ GERİ AL)
  if (interaction.customId === "reopen") {
    await interaction.deferUpdate();
    const ownerId = channel.topic;

    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { 
        ViewChannel: true, 
        SendMessages: true, 
        ReadMessageHistory: true 
      });

      await interaction.message.delete().catch(() => {});

      const reopenEmbed = new EmbedBuilder()
        .setDescription(`🔓 Bilet <@${user.id}> tarafından tekrar açıldı!`)
        .setColor("#2ecc71");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
      );

      await channel.send({ embeds: [reopenEmbed], components: [row] });
    }
  }

  // 5. İPTAL VE SİLME
  if (interaction.customId === "cancel_close") {
    await interaction.message.delete().catch(() => {});
  }

  if (interaction.customId === "delete_ticket") {
    await interaction.reply("Bilet 5 saniye içinde kalıcı olarak siliniyor...");
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.TOKEN);
