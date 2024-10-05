// commands/set.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config.json');
const fs = require('fs');

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
    if (!interaction.member.permissions.has('ManageChannels')) {
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

    // 使用陣列儲存每個伺服器的多個 AI 頻道
    if (!config.aiChannels[guildId]) {
      config.aiChannels[guildId] = [];
    }
    config.aiChannels[guildId].push(channel.id);
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    await interaction.reply(`已將 <#${channel.id}> 加入 AI 對話頻道。`);
  },
};