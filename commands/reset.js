// commands/reset.js
const { SlashCommandBuilder } = require('discord.js');
const { resetChat } = require('../utils/geminiAPI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset') // 修改指令名稱
    .setDescription('重設 AI 的對話記錄'),
  async execute(interaction) {
    // 檢查使用者是否有權限
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ content: '你沒有權限使用這個指令。', ephemeral: true });
    }

    resetChat(interaction.guild.id); // 傳入 guildId
    await interaction.reply('已重設對話記錄。');
  },
};