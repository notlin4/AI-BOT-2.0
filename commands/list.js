// commands/list.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { checkPermissions } = require('../utils/permissions'); // 引入權限檢查函式

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list') // 修改指令名稱
    .setDescription('列出 AI 對話頻道'),
  async execute(interaction) {
    // 檢查使用者是否有權限
    if (!checkPermissions(interaction.member, 'ManageChannels')) {
      return interaction.reply({ content: '你沒有權限使用這個指令。', ephemeral: true });
    }

    const guildId = interaction.guild.id;

    if (config.aiChannels && config.aiChannels[guildId] && config.aiChannels[guildId].length > 0) {
      const channelList = config.aiChannels[guildId].map(channelId => `<#${channelId}>`).join('\n');
      await interaction.reply(`目前的 AI 對話頻道：\n${channelList}`);
    } else {
      await interaction.reply('目前沒有設定任何 AI 對話頻道。');
    }
  },
};