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

// --- AYARLARIN ---
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";
const TICKET_LIMIT = 2; // Bilet limitini buradan ayarlayabilirsin

client.once("ready", () => {
  console.log(`${client.user.tag} Bilet Sistemi v3.1 (2 Limitli) Aktif!`);
});

// ANA PANEL KOMUTU
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Yardım almak için aşağıdaki butona basarak bilet açabilirsiniz.\n\n*Not: Aynı anda en fazla 2 bilet açabilirsiniz.*")
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

  // 1. BİLET OLUŞTURMA (2 Limitli)
  if (interaction.customId === "create_ticket") {
    const category = guild.channels.cache.get(CATEGORY_ID);
    
    // Kullanıcının bu kategoride kaç tane bileti (kanalı) olduğunu sayıyoruz
    const userTickets = category.children.cache.filter(c => c.topic === user.id);

    if (userTickets.size >= TICKET_LIMIT) {
      return interaction.reply({ 
        content: `❌ Zaten ${TICKET_LIMIT} adet açık biletin var. Yeni bir tane açmak için eskilerini kapatıp sildirmen gerekir.`, 
        ephemeral: true 
      });
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
    } catch (e) { 
      console.log(e);
      await interaction.editReply("Bilet oluşturulurken hata oluştu!"); 
    }
  }

  // 2. KAPATMA TALEBİ
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

  // 3. GERİ AÇMA
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
