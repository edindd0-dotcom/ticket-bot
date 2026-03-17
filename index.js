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

// GÜNCELLEDİĞİN ID'LER
const STAFF_ROLE_ID = "1482883734817603785";
const CATEGORY_ID = "1482906193935597751";

client.once("ready", () => {
  console.log(`${client.user.tag} Ticket Tool Modu Aktif!`);
});

// PANEL OLUŞTURMA: !bilet
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

  // 1. ADIM: BİLET AÇMA (3. Fotoğraftaki gibi)
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

    const welcomeEmbed = new EmbedBuilder()
      .setAuthor({ name: `${user.username} Welcome`, iconURL: user.displayAvatarURL() })
      .setDescription("Support will be with you shortly.\nTo close this press the close button")
      .setColor("#2ecc71")
      .setFooter({ text: "TicketTool.xyz - Ticketing without clutter" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_request")
        .setLabel("Close")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({ content: `<@${user.id}> Welcome`, embeds: [welcomeEmbed], components: [row] });
    await interaction.reply({ content: `Bilet açıldı: <#${ticketChannel.id}>`, ephemeral: true });
  }

  // 2. ADIM: KAPATMA ONAYI (4. Fotoğraftaki gibi)
  if (interaction.customId === "close_request") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_close").setLabel("Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_close").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ content: "Are you sure you would like to close this ticket?", components: [confirmRow] });
  }

  // 3. ADIM: BİLETİ KİLİTLE VE KONTROL PANELİ AÇ (5. Fotoğraftaki gibi)
  if (interaction.customId === "confirm_close") {
    await interaction.message.delete();
    
    // Kullanıcının yazma yetkisini al
    const ticketOwner = guild.members.cache.find(m => channel.name.includes(m.user.username.toLowerCase()));
    if(ticketOwner) {
        await channel.permissionOverwrites.edit(ticketOwner.id, { SendMessages: false });
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

  // 4. ADIM: İPTAL VE SİLME (6. Fotoğraftaki gibi)
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

  // BİLETİ GERİ AÇMA (Reopen)
  if (interaction.customId === "reopen") {
    const ticketOwner = guild.members.cache.find(m => channel.name.includes(m.user.username.toLowerCase()));
    if(ticketOwner) {
        await channel.permissionOverwrites.edit(ticketOwner.id, { SendMessages: true });
    }
    await interaction.reply({ content: "Ticket has been reopened!", ephemeral: true });
    await interaction.message.delete();
  }
});

client.login(process.env.TOKEN);
