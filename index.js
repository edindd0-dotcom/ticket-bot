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

// AYARLARIN
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`${client.user.tag} Bilet Sistemi Aktif!`);
});

// PANEL OLUŞTURMA: !bilet
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Size yardımcı olabilmemiz için lütfen bilet oluşturun.\nBileti kapatmak için kapat butonuna basın.")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool.xyz - Karmaşasız Bilet Sistemi" });

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

  // 1. ADIM: BİLET OLUŞTURMA
  if (interaction.customId === "create_ticket") {
    // Aynı isimde kanal varsa engelle (İsteğe bağlı)
    const existing = guild.channels.cache.find(c => c.name === `bilet-${user.username.toLowerCase()}`);
    if (existing) return interaction.reply({ content: "Zaten açık bir biletin var!", ephemeral: true });

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
      .setDescription("Destek ekibi kısa süre içinde sizinle ilgilenecektir.\nBileti kapatmak için aşağıdaki butona basın.")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool.xyz - Karmaşasız Bilet Sistemi" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({ content: `<@${user.id}> Hoş Geldin`, embeds: [welcomeEmbed], components: [row] });
    await interaction.reply({ content: `Bilet açıldı: <#${ticketChannel.id}>`, ephemeral: true });
  }

  // 2. ADIM: KAPATMA ONAYI
  if (interaction.customId === "close_request") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Kapat").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("İptal").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ content: "Bu bileti kapatmak istediğinizden emin misiniz?", components: [confirmRow] });
  }

  // 3. ADIM: BİLETİ KAPAT VE ÜYEYİ ÇIKAR (KORUMALI)
  if (interaction.customId === "confirm_close") {
    // Eğer kanal zaten 'kapalı' ismini aldıysa işlemi yapma (Çift mesajı engeller)
    if (channel.name.startsWith("kapalı-")) return;

    await interaction.message.delete().catch(() => {});
    
    const ownerId = channel.topic;

    // Üyenin yetkisini al
    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { 
        ViewChannel: false,
        SendMessages: false 
      }).catch(() => {});
    }

    // Kanal ismini değiştir (Koruma için)
    await channel.setName(`kapalı-${channel.name}`);

    const closedEmbed = new EmbedBuilder()
      .setDescription(`Bilet <@${user.id}> tarafından kapatıldı.`)
      .setColor("#f1c40f");

    const controlEmbed = new EmbedBuilder()
      .setDescription("```Destek ekibi bilet kontrolleri```")
      .setColor("#34495e");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("transcript").setLabel("Transcript").setEmoji("📑").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("reopen").setLabel("Aç").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("delete_ticket").setLabel("Sil").setEmoji("⛔").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [closedEmbed, controlEmbed], components: [row] });
  }

  // 4. ADIM: GERİ AÇ (REOPEN)
  if (interaction.customId === "reopen") {
    const ownerId = channel.topic;
    
    // Kanal ismini eski haline getir
    const newName = channel.name.replace("kapalı-", "");
    await channel.setName(newName);

    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { 
        ViewChannel: true,
        SendMessages: true 
      });
    }

    // Kontrol panelini sil ve bilgi mesajı at
    await interaction.message.delete();
    await channel.send("Bilet yetkili tarafından tekrar açıldı!");
  }

  // 5. ADIM: İPTAL VE SİLME
  if (interaction.customId === "cancel_close") {
    await interaction.message.delete();
  }

  if (interaction.customId === "delete_ticket") {
    const deleteEmbed = new EmbedBuilder()
      .setDescription("Bilet birkaç saniye içinde silinecektir...")
      .setColor("#e74c3c");

    await interaction.reply({ embeds: [deleteEmbed] });
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.TOKEN);
