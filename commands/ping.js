// commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('顯示機器人延遲'),
  async execute(interaction) {
    // 取得機器人與 Discord API 的延遲
    const apiLatency = interaction.client.ws.ping;

    // 傳送第一則訊息，取得訊息往返時間
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const messageLatency = sent.createdTimestamp - interaction.createdTimestamp;

    // 編輯第一則訊息，顯示延遲時間
    await interaction.editReply(`API 延遲：${apiLatency} 毫秒\n訊息延遲：${messageLatency} 毫秒`);
  },
};