const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, // MESAJLARI OKUMAK İÇİN ŞART
    GatewayIntentBits.GuildMembers
  ]
});

// AYARLARIN - ID'leri kontrol et
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} Aktif!`);
});

// ANA PANEL GÖNDERME
client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const embed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Bilet açmak için butona bas.")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("b_ac").setLabel("Bilet Oluştur").setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  // 1. BİLET AÇMA
  if (i.customId === "b_ac") {
    await i.deferReply({ ephemeral: true });

    const cat = i.guild.channels.cache.get(CATEGORY_ID);
    const varMi = cat.children.cache.find(c => c.topic === i.user.id);

    if (varMi) return i.editReply(`Zaten biletin var: <#${varMi.id}>`);

    const kanal = await i.guild.channels.create({
      name: `bilet-${i.user.username}`,
      parent: CATEGORY_ID,
      topic: i.user.id,
      permissionOverwrites: [
        { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("b_kapat").setLabel("Kapat").setStyle(ButtonStyle.Danger)
    );

    await kanal.send({ content: `Hoş geldin <@${i.user.id}>`, components: [row] });
    await i.editReply("Biletin açıldı!");
  }

  // 2. BİLET KAPATMA (Üyeyi atar, kanalı silmez)
  if (i.customId === "b_kapat") {
    const sahibi = i.channel.topic;
    if (sahibi) {
      await i.channel.permissionOverwrites.edit(sahibi, { ViewChannel: false });
    }

    await i.reply("Bilet kapatıldı. Üyenin erişimi kesildi.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("b_sil").setLabel("Kalıcı Sil").setStyle(ButtonStyle.Secondary)
    );

    await i.channel.send({ content: "Yetkili Paneli:", components: [row] });
  }

  // 3. KALICI SİLME
  if (i.customId === "b_sil") {
    await i.reply("Kanal siliniyor...");
    setTimeout(() => i.channel.delete(), 2000);
  }
});

client.login(process.env.TOKEN); // Tokeni buradan çekmeye devam eder
