// commands/unset.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config.json');
const fs = require('fs');
const { checkPermissions } = require('../utils/permissions'); // 引入權限檢查函式

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
    if (!checkPermissions(interaction.member)) {
      return interaction.reply({ content: '你沒有權限使用這個指令。', ephemeral: true });
    }

    const allOption = interaction.options.getString('all');
    const guildId = interaction.guild.id;

    if (allOption && allOption.toLowerCase() === 'yes') {
      // 取消設定所有 AI 頻道
      delete config.aiChannels[guildId];
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      await interaction.reply('已取消設定所有 AI 對話頻道。');
    } else {
      // 預設取消設定目前的頻道
      if (config.aiChannels[guildId] && config.aiChannels[guildId].includes(interaction.channel.id)) {
        config.aiChannels[guildId] = config.aiChannels[guildId].filter(channelId => channelId !== interaction.channel.id);
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        await interaction.reply(`已將 <#${interaction.channel.id}> 從 AI 對話頻道移除。`);
      } else {
        await interaction.reply('這個頻道並非 AI 對話頻道。');
      }
    }
  },
};