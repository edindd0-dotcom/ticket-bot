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
    GatewayIntentBits.DirectMessages // DM için gerekli
  ]
});

// AYARLAR
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const { guild, user, channel } = interaction;

  // 1. BİLET KAPATMA ONAYI
  if (interaction.customId === "confirm_close") {
    await interaction.deferUpdate();
    const ownerId = channel.topic;

    if (ownerId) {
      // Üyeye erişimi kapat
      await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});

      // KULLANICIYA DM GÖNDER (Geri açabilmesi için)
      const dmEmbed = new EmbedBuilder()
        .setTitle("Biletin Kapatıldı")
        .setDescription(`**${guild.name}** sunucusundaki biletin kapatıldı. Eğer işin bitmediyse aşağıdaki butona basarak geri açabilirsin.`)
        .setColor("#f1c40f");

      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`reopen_${channel.id}`) // Kanal ID'sini butona gömüyoruz
          .setLabel("Bileti Geri Aç")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Success)
      );

      await user.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => {
        console.log("Kullanıcının DM'leri kapalı, mesaj atılamadı.");
      });
    }

    await interaction.message.delete().catch(() => {});

    // Yetkililer için kanala kontrol paneli at
    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("reopen").setLabel("Aç").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("delete_ticket").setLabel("Sil").setEmoji("⛔").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ 
      embeds: [new EmbedBuilder().setDescription(`Bilet <@${user.id}> tarafından kapatıldı.`).setColor("#f1c40f")], 
      components: [controlRow] 
    });
  }

  // 2. GERİ AÇMA (Hem Kanal İçinden Hem DM'den Çalışır)
  if (interaction.customId === "reopen" || interaction.customId.startsWith("reopen_")) {
    // Eğer DM'den basıldıysa kanalı bulalım
    let targetChannel = channel;
    if (interaction.customId.startsWith("reopen_")) {
      const targetId = interaction.customId.split("_")[1];
      targetChannel = guild.channels.cache.get(targetId);
      if (!targetChannel) return interaction.reply({ content: "Bilet kanalı silinmiş!", ephemeral: true });
    }

    await interaction.deferUpdate().catch(() => {});
    const ownerId = targetChannel.topic;

    if (ownerId) {
      await targetChannel.permissionOverwrites.edit(ownerId, { ViewChannel: true, SendMessages: true });
      
      // Kanal içindeki eski kontrol mesajlarını temizle (eğer kanal içindeysek)
      if (interaction.message && !interaction.customId.startsWith("reopen_")) {
        await interaction.message.delete().catch(() => {});
      }

      const reopenEmbed = new EmbedBuilder()
        .setDescription(`🔓 Bilet <@${user.id}> tarafından tekrar açıldı!`)
        .setColor("#2ecc71");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
      );

      await targetChannel.send({ embeds: [reopenEmbed], components: [row] });
      
      if (interaction.customId.startsWith("reopen_")) {
        await interaction.followUp({ content: "Biletin başarıyla geri açıldı!", ephemeral: true });
      }
    }
  }

  // ... (Create ve Delete kısımları aynı)
});

client.login(process.env.TOKEN);
