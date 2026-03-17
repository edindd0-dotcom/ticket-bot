// ... (Diğer kodlar aynı kalacak)

  // 1. BİLET KAPATMA KISMINDAKİ DM GÖNDERME AYARI
  if (interaction.customId === "confirm_close") {
    await interaction.deferUpdate();
    const ownerId = channel.topic;

    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});

      const dmEmbed = new EmbedBuilder()
        .setTitle("Biletin Kapatıldı")
        .setDescription(`**${guild.name}** sunucusundaki biletin kapatıldı. Geri açmak için butona bas.`)
        .setColor("#f1c40f");

      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          // BURASI ÖNEMLİ: Hem sunucu ID hem kanal ID'sini gönderiyoruz
          .setCustomId(`reopen_${guild.id}_${channel.id}`) 
          .setLabel("Bileti Geri Aç")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Success)
      );

      await user.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => {});
    }
    // ... (Yetkili kontrol paneli gönderimi aynı)
  }

  // 2. DM'DEN GELEN "GERİ AÇ" ETKİLEŞİMİ
  if (interaction.customId.startsWith("reopen_")) {
    // ID'leri parçalarına ayırıyoruz
    const [ , guildId, channelId] = interaction.customId.split("_");
    
    // Sunucuyu ve Kanalı buluyoruz
    const targetGuild = client.guilds.cache.get(guildId);
    if (!targetGuild) return interaction.reply({ content: "Sunucu bulunamadı.", ephemeral: true });
    
    const targetChannel = targetGuild.channels.cache.get(channelId);
    if (!targetChannel) return interaction.reply({ content: "Bilet kanalı artık mevcut değil.", ephemeral: true });

    await interaction.deferUpdate(); // "Etkileşim başarısız" hatasını burada durduruyoruz

    try {
      // Üyeye yetkisini geri ver
      await targetChannel.permissionOverwrites.edit(user.id, { 
        ViewChannel: true, 
        SendMessages: true,
        ReadMessageHistory: true 
      });

      const reopenEmbed = new EmbedBuilder()
        .setDescription(`🔓 Bilet <@${user.id}> tarafından DM yoluyla tekrar açıldı!`)
        .setColor("#2ecc71");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_request").setLabel("Kapat").setEmoji("🔒").setStyle(ButtonStyle.Secondary)
      );

      await targetChannel.send({ embeds: [reopenEmbed], components: [row] });
      // Kullanıcıya DM'den onay ver
      await interaction.followUp({ content: "Biletin başarıyla sunucuda tekrar açıldı!", ephemeral: true }).catch(() => {});
      
    } catch (e) {
      console.error(e);
      await interaction.followUp({ content: "Yetki verirken bir hata oluştu.", ephemeral: true });
    }
  }
