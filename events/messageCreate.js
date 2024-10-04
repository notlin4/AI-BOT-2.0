// events/messageCreate.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { generateResponse } = require('../utils/geminiAPI');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message) {
      console.error("message 未定義！");
      return;
    }

    if (message.author.bot) return;

    // 檢查訊息是否在 AI 對話頻道中或提及了機器人
    if ((message.guild && config.aiChannels && config.aiChannels[message.guild.id] && config.aiChannels[message.guild.id].includes(message.channel.id)) || message.mentions.users.has(client.user.id)) {
      try {
        // 模擬打字效果
        await message.channel.sendTyping();

        // 格式化訊息
        const formattedMessage = `${message.member.displayName} (${message.author.username})：${message.content}`;

        // 輸出格式化的訊息到主控台
        console.log(`[${message.guild.name} - #${message.channel.name}] ${formattedMessage}`);

        const response = await generateResponse(formattedMessage, message.attachments, message.guild.id, message);

        // 使用普通訊息回覆，而不是嵌入訊息，並允許提及所有人
        await message.reply({ content: response, allowedMentions: { parse: [] } });
      } catch (error) {
        console.error('產生回覆時發生錯誤', error);
        await message.reply('很抱歉，處理您的請求時發生錯誤。');
      }
    }
  },
};