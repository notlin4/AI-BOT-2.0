// commands/unset.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { checkPermissions } = require('../utils/permissions'); // 引入權限檢查函式
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unset')
    .setDescription('取消設定 AI 對話頻道')
    .addStringOption(option =>
      option.setName('all')
        .setDescription('是否取消設定所有 AI 對話頻道（輸入「yes」即可）')
        .setRequired(false)
    ),
  async execute(interaction) {
    // 檢查使用者是否有權限
    if (!checkPermissions(interaction.member, 'ManageChannels')) {
      return interaction.reply({ content: '你沒有權限使用這個指令。', ephemeral: true });
    }

    const allOption = interaction.options.getString('all');
    const guildId = interaction.guild.id;

    // 讀取 aiChannels.json 檔案
    const aiChannelsFilePath = path.join(__dirname, '../aiChannels.json');
    let aiChannels = {};
    try {
      aiChannels = JSON.parse(fs.readFileSync(aiChannelsFilePath, 'utf-8'));
    } catch (error) {
      // 如果檔案不存在或無法解析，則初始化 aiChannels 物件
      console.error('讀取 aiChannels.json 檔案發生錯誤:', error);
      return interaction.reply('讀取 AI 對話頻道列表發生錯誤。');
    }

    if (allOption && allOption.toLowerCase() === 'yes') {
      // 取消設定所有 AI 頻道
      if (aiChannels[guildId]) {
        delete aiChannels[guildId];
      }
      await interaction.reply('已取消設定所有 AI 對話頻道。');
    } else {
      // 預設取消設定目前的頻道
      if (aiChannels[guildId] && aiChannels[guildId].includes(interaction.channel.id)) {
        aiChannels[guildId] = aiChannels[guildId].filter(channelId => channelId !== interaction.channel.id);

        await interaction.reply(`已將 <#${interaction.channel.id}> 從 AI 對話頻道移除。`);
      } else {
        await interaction.reply('這個頻道並非 AI 對話頻道。');
      }
    }

    // 將修改後的 aiChannels 寫回 aiChannels.json 檔案
    fs.writeFileSync(aiChannelsFilePath, JSON.stringify(aiChannels, null, 2));
  },
};