const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- AYARLARIN ---
const TOKEN = "BURAYA_BOT_TOKENINI_YAZ";
const STAFF_ROLE_ID = "1482883734817603785"; 
const CATEGORY_ID = "1482906193935597751";

client.on("ready", () => {
  console.log(`${client.user.tag} çalışıyor! Eğer tepki vermezse terminali kontrol et.`);
});

// PANEL GÖNDERME
client.on("messageCreate", async (msg) => {
  if (msg.content === "!bilet") {
    const embed = new EmbedBuilder()
      .setTitle("Bilet Sistemi")
      .setDescription("Bilet açmak için butona bas.")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ac").setLabel("Bilet Oluştur").setStyle(ButtonStyle.Primary)
    );

    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  // BİLET AÇMA
  if (i.customId === "ac") {
    const category = i.guild.channels.cache.get(CATEGORY_ID);
    const varMi = category.children.cache.find(c => c.topic === i.user.id);

    if (varMi) return i.reply({ content: "Zaten bir biletin var!", ephemeral: true });

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
      new ButtonBuilder().setCustomId("sil").setLabel("Kapat ve Sil").setStyle(ButtonStyle.Danger)
    );

    await kanal.send({ content: `Hoş geldin <@${i.user.id}>`, components: [row] });
    await i.reply({ content: "Biletin açıldı!", ephemeral: true });
  }

  // BİLET SİLME
  if (i.customId === "sil") {
    await i.reply("Bilet siliniyor...");
    setTimeout(() => i.channel.delete(), 2000);
  }
});

client.login(TOKEN);
