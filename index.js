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

// AYARLARIN
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`${client.user.tag} Bilet Sistemi Baştan Kuruldu!`);
});

// PANEL: !bilet
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Destek Merkezi")
      .setDescription("Bizimle iletişime geçmek için lütfen bilet açın.")
      .setColor("#2f3136");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("create_ticket").setLabel("Bilet oluştur").setEmoji("📩").setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const { guild, user, channel } = interaction;

  // 1. BİLET AÇMA
  if (interaction.customId === "create_ticket") {
    const category = guild.channels.cache.get(CATEGORY_ID);
    const existing = category.children.cache.find(c => c.topic === user.id);

    if (existing) return interaction.reply({ content: "Zaten açık bir biletin var!", ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const ticketChannel = await guild.channels.create({
      name: `bilet-${user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    await ticketChannel.setTopic(user.id);

    const welcomeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_ask").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({ 
      content: `<@${user.id}> Hoş Geldin`, 
      embeds: [new EmbedBuilder().setDescription("Yetkililer kısa süre içinde sizinle ilgilenecektir.").setColor("#2f3136")],
      components: [welcomeRow]
    });

    await interaction.editReply({ content: "Biletin açıldı!" });
  }

  // 2. KAPATMA SORUSU (ONAY)
  if (interaction.customId === "close_ask") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Kapat").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("İptal").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ content: "Bileti kapatmak istediğine emin misin?", components: [confirmRow] });
  }

  // 3. BİLETİ KAPAT (ÜYEYİ AT VE YETKİLİ PANELİ AT)
  if (interaction.customId === "confirm_close") {
    // Çift mesaj engelleme kontrolü
    if (channel.name.startsWith("kapalı-")) return;

    await interaction.deferUpdate();
    const ownerId = channel.topic;

    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});
    }

    await interaction.message.delete().catch(() => {});
    await channel.setName(`kapalı-${channel.name}`);

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("delete_now").setLabel("Sil").setEmoji("⛔").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ 
      embeds: [
        new EmbedBuilder().setDescription(`Bilet <@${user.id}> tarafından kapatıldı.`).setColor("#f1c40f"),
        new EmbedBuilder().setDescription("
http://googleusercontent.com/immersive_entry_chip/0

### Neler Değişti ve Neden Daha İyi?
* **Üst Üste Binme Yok:** `kapalı-` kontrolü sayesinde bilet bir kez kapandıysa butonlara tekrar basıldığında aynı panelleri defalarca atmaz.
* **Güvenli Kapatma:** Bilet anında silinmez. Önce üye dışarı atılır (kanalı göremez hale gelir), ardından kanal yetkililerde kalır. Yetkili "Sil" dediğinde kanal temizlenir.
* **Hız Kontrolü:** 3 saniyelik o hızlı silme işlemini daha kontrollü ve mesajlı hale getirdim.

Bu kod şu an en "temiz" çalışan versiyon. Bunu kurduktan sonra istersen üzerine görsel eklemeler yapabiliriz. Denemek ister misin?
