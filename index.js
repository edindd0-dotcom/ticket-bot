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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

// --- AYARLARIN (Burası senin verdiğin ID'ler) ---
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`${client.user.tag} Bilet Sistemi v3 Aktif!`);
});

// ANA PANEL KOMUTU
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Yardım almak için aşağıdaki butona basarak bilet açabilirsiniz.")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool Tasarımı" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("create_ticket").setLabel("Bilet oluştur").setEmoji("📩").setStyle(ButtonStyle.Secondary)
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
    const hasTicket = category.children.cache.find(c => c.topic === user.id);

    if (hasTicket) {
      return interaction.reply({ content: `❌ Zaten bir biletin var: <#${hasTicket.id}>`, ephemeral: true });
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

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
      );

      await ticketChannel.send({ 
        content: `<@${user.id}> Hoş Geldin`, 
        embeds: [new EmbedBuilder().setDescription("Yetkililer kısa süre içinde ilgilenecektir.").setColor("#2ecc71")],
        components: [row]
      });

      await interaction.editReply({ content: "Biletin açıldı!" });
    } catch (e) { await interaction.editReply("Bilet oluşturulurken hata oluştu!"); }
  }

  // 2. KAPATMA TALEBİ VE DM GÖNDERME
  if (interaction.customId === "close_request") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Kapat").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("İptal").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ content: "Kapatmak istediğine emin misin?", components: [row] });
  }

  if (interaction.customId === "confirm_close") {
    await interaction.deferUpdate();
    const ownerId = channel.topic;

    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});
      
      // DM'DEN GERİ AÇMA BUTONU GÖNDER
      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`reopen_${guild.id}_${channel.id}`).setLabel("Bileti Geri Aç").setEmoji("🔓").setStyle(ButtonStyle.Success)
      );
      await user.send({ content: `**${guild.name}** biletin kapatıldı. Geri açmak için bas:`, components: [dmRow] }).catch(() => {});
    }

    await interaction.message.delete().catch(() => {});
    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("reopen_staff").setLabel("Aç").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("delete_ticket").setLabel("Sil").setEmoji("⛔").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ 
      embeds: [new EmbedBuilder().setDescription(`Bilet <@${user.id}> tarafından kapatıldı.`).setColor("#f1c40f")], 
      components: [controlRow] 
    });
  }

  // 3. GERİ AÇMA (DM ve SUNUCU İÇİ)
  if (interaction.customId === "reopen_staff" || interaction.customId.startsWith("reopen_")) {
    let targetChannel = channel;
    let targetGuild = guild;

    if (interaction.customId.startsWith("reopen_")) {
      const [, gId, cId] = interaction.customId.split("_");
      targetGuild = client.guilds.cache.get(gId);
      targetChannel = targetGuild?.channels.cache.get(cId);
    }

    if (!targetChannel) return interaction.reply({ content: "Bilet bulunamadı.", ephemeral: true });

    await interaction.deferUpdate().catch(() => {});
    const ownerId = targetChannel.topic;

    if (ownerId) {
      await targetChannel.permissionOverwrites.edit(ownerId, { ViewChannel: true, SendMessages: true });
      if (interaction.message && !interaction.customId.startsWith("reopen_")) await interaction.message.delete();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
      );

      await targetChannel.send({ 
        embeds: [new EmbedBuilder().setDescription(`🔓 Bilet <@${user.id}> tarafından tekrar açıldı!`).setColor("#2ecc71")], 
        components: [row] 
      });
    }
  }

  // 4. SİLME VE İPTAL
  if (interaction.customId === "cancel_close") await interaction.message.delete();
  if (interaction.customId === "delete_ticket") {
    await interaction.reply("Bilet siliniyor...");
    setTimeout(() => channel.delete().catch(() => {}), 3000);
  }
});

client.login(process.env.TOKEN);
