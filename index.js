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
  console.log(`${client.user.tag} Hazır! Kapatınca silme modu aktif.`);
});

// PANEL KOMUTU
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Yeni bir destek talebi oluşturmak için aşağıdaki butona basın.")
      .setColor("#3498db");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("create_ticket").setLabel("Bilet oluştur").setEmoji("📩").setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const { guild, user, channel } = interaction;

  // 1. YENİ BİLET AÇMA
  if (interaction.customId === "create_ticket") {
    // Kategori içindeki bilet kontrolü (1 Limit)
    const category = guild.channels.cache.get(CATEGORY_ID);
    const existingTicket = category.children.cache.find(c => c.topic === user.id);

    if (existingTicket) {
      return interaction.reply({ content: `❌ Zaten açık bir biletiniz var: <#${existingTicket.id}>`, ephemeral: true });
    }

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

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_now").setLabel("Bileti Kapat ve Sil").setEmoji("🔒").setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ 
      content: `<@${user.id}> Hoş Geldin`, 
      embeds: [new EmbedBuilder().setDescription("Sorununuzu yazın, işiniz bitince aşağıdaki butona basarak bileti kapatabilirsiniz.").setColor("#3498db")],
      components: [row]
    });

    await interaction.editReply({ content: "Biletin başarıyla açıldı!" });
  }

  // 2. KAPAT VE ANINDA SİL
  if (interaction.customId === "close_now") {
    await interaction.reply({ content: "Bilet kapatılıyor ve 3 saniye içinde siliniyor..." });
    
    // 3 saniye bekle ve kanalı tamamen yok et
    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (e) {
        console.log("Kanal silinirken hata oluştu.");
      }
    }, 3000);
  }
});

client.login(process.env.TOKEN);
