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

// SENİN ID'LERİN
const STAFF_ROLE_ID = "1482883734817603785";
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`${client.user.tag} Ticket Sistemi Hazır!`);
});

client.on("messageCreate", async (message) => {
  if (message.content === "!bilet") {
    const mainEmbed = new EmbedBuilder()
      .setTitle("Ticket Tool")
      .setDescription("Support will be with you shortly.\nTo close this press the close button")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool.xyz - Ticketing without clutter" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Create ticket")
        .setEmoji("📩")
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [mainEmbed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const { guild, user, channel } = interaction;

  // 1. BİLET AÇMA
  if (interaction.customId === "create_ticket") {
    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    // Metadata: Kanalın kime ait olduğunu anlamak için konuya (topic) ID yazalım
    await ticketChannel.setTopic(user.id);

    const welcomeEmbed = new EmbedBuilder()
      .setAuthor({ name: `${user.username} Welcome`, iconURL: user.displayAvatarURL() })
      .setDescription("Support will be with you shortly.\nTo close this press the close button")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool.xyz - Ticketing without clutter" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_request").setLabel("Close").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({ content: `<@${user.id}> Welcome`, embeds: [welcomeEmbed], components: [row] });
    await interaction.reply({ content: `Bilet açıldı: <#${ticketChannel.id}>`, ephemeral: true });
  }

  // 2. KAPATMA ONAYI
  if (interaction.customId === "close_request") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ content: "Are you sure you would like to close this ticket?", components: [confirmRow] });
  }

  // 3. BİLETİ KAPAT (ÜYENİN YETKİSİNİ AL)
  if (interaction.customId === "confirm_close") {
    await interaction.message.delete();
    
    // Bileti açan kişinin ID'sini kanaldan alalım
    const ownerId = channel.topic;

    // ÜYENİN ERİŞİMİNİ KES (Hem görmeyi hem yazmayı kapat)
    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { 
        ViewChannel: false,
        SendMessages: false 
      }).catch(e => console.log("Yetki hatası: Üye sunucudan çıkmış olabilir."));
    }

    const closedEmbed = new EmbedBuilder()
      .setDescription(`Ticket Closed by <@${user.id}>`)
      .setColor("#f1c40f");

    const controlEmbed = new EmbedBuilder()
      .setDescription("```Support team ticket controls```")
      .setColor("#34495e");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("transcript").setLabel("Transcript").setEmoji("📑").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("reopen").setLabel("Open").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("delete_ticket").setLabel("Delete").setEmoji("⛔").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [closedEmbed, controlEmbed], components: [row] });
  }

  // 4. BİLETİ GERİ AÇ (ÜYEYE YETKİ VER)
  if (interaction.customId === "reopen") {
    const ownerId = channel.topic;
    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { 
        ViewChannel: true,
        SendMessages: true 
      });
    }
    await interaction.reply({ content: "Ticket has been reopened!", ephemeral: true });
    await interaction.message.delete();
  }

  // 5. İPTAL VE SİLME
  if (interaction.customId === "cancel_close") {
    await interaction.message.delete();
  }

  if (interaction.customId === "delete_ticket") {
    const deleteEmbed = new EmbedBuilder()
      .setDescription("Ticket will be deleted in a few seconds")
      .setColor("#e74c3c");

    await interaction.reply({ embeds: [deleteEmbed] });
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.TOKEN);
