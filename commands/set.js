// commands/set.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { checkPermissions } = require('../utils/permissions');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set')
    .setDescription('設定 AI 對話頻道')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('要設定的 AI 對話頻道')
        .setRequired(false)
    ),
  async execute(interaction) {
    // 檢查使用者是否有權限
    if (!checkPermissions(interaction.member, 'ManageChannels')) {
      return interaction.reply({ content: '你沒有權限使用這個指令。', ephemeral: true });
    }

    const channelOption = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    // 如果沒有提供頻道參數，則使用目前的頻道
    const channel = channelOption || interaction.channel;

    // 檢查機器人是否有權限在該頻道傳送訊息
    if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
      return interaction.reply(`機器人沒有權限在 <#${channel.id}> 傳送訊息`);
    }

    // 讀取 aiChannels.json 檔案
    const aiChannelsFilePath = path.join(__dirname, '../aiChannels.json');
    let aiChannels = {};
    try {
      aiChannels = JSON.parse(fs.readFileSync(aiChannelsFilePath, 'utf-8'));
    } catch (error) {
      // 如果檔案不存在或無法解析，則初始化 aiChannels 物件
      console.error('讀取 aiChannels.json 檔案發生錯誤:', error);
    }

    // 檢查是否已經加入
    if (aiChannels[guildId] && aiChannels[guildId].includes(channel.id)) {
      return interaction.reply(`<#${channel.id}> 已經是 AI 對話頻道了。`);
    }

    // 更新 aiChannels 物件
    if (!aiChannels[guildId]) {
      aiChannels[guildId] = [];
    }
    aiChannels[guildId].push(channel.id);

    // 將修改後的 aiChannels 寫回 aiChannels.json 檔案
    fs.writeFileSync(aiChannelsFilePath, JSON.stringify(aiChannels, null, 2));

    await interaction.reply(`已將 <#${channel.id}> 加入 AI 對話頻道。`);
  },
};