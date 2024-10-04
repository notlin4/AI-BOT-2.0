// commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('顯示指令清單和說明'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('AI BOT 2.0 指令清單')
      .setDescription('下列為可用的指令：')
      .addFields(
        { name: '/ping', value: '顯示機器人延遲', inline: true },
        { name: '/list', value: '列出 AI 對話頻道（需要管理頻道權限）', inline: true },
        { name: '/set', value: '設定 AI 對話頻道（需要管理頻道權限）', inline: true },
        { name: '/unset', value: '取消設定 AI 對話頻道（需要管理頻道權限）', inline: true },
        { name: '/reset', value: '重設 AI 的對話記錄（需要管理訊息權限）', inline: true },
        { name: '/setsafety', value: '調整 AI 的安全設定（僅限擁有者使用）', inline: true },
        { name: '/help', value: '顯示這則說明訊息', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};