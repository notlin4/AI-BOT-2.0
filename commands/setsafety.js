// commands/setsafety.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config.json');
const fs = require('fs');
const { HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setsafety')
    .setDescription('調整 AI 的安全設定')
    .addStringOption(option =>
      option.setName('safety')
        .setDescription('要設定的安全篩選等級')
        .setRequired(true)
        .addChoices(
          { name: '不篩選', value: 'none' },
          { name: '篩選少部分', value: 'few' },
          { name: '篩選部分', value: 'some' },
          { name: '篩選大部分', value: 'most' }
        ))
    .addStringOption(option =>
      option.setName('guildid')
        .setDescription('要設定的伺服器 ID (可選)')
        .setRequired(false)
    ),
  async execute(interaction) {
    // 檢查使用者是否為 ownerId
    if (!config.ownerId.includes(interaction.user.id)) {
      return interaction.reply({ content: '你沒有權限使用這個指令。', ephemeral: true });
    }

    const level = interaction.options.getString('safety');
    const guildIdOption = interaction.options.getString('guildid');
    const guildId = guildIdOption || interaction.guild.id; // 使用提供的 guildId 或目前的 guildId

    let threshold;
    let levelChinese; // 新增一個變數儲存繁體中文的安全等級

    switch (level) {
      case 'none':
        threshold = HarmBlockThreshold.BLOCK_NONE;
        levelChinese = '不篩選';
        break;
      case 'few':
        threshold = HarmBlockThreshold.BLOCK_ONLY_HIGH;
        levelChinese = '篩選少部分';
        break;
      case 'some':
        threshold = HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
        levelChinese = '篩選部分';
        break;
      case 'most':
        threshold = HarmBlockThreshold.BLOCK_LOW_AND_ABOVE;
        levelChinese = '篩選大部分';
        break;
      default:
        return interaction.reply('無效的安全等級');
    }

    const newSafetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: threshold,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: threshold,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: threshold,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: threshold,
      },
    ];

    // 更新 config.json 中的安全設定，使用 aiChannels 屬性
    config.safetySettings[guildId] = newSafetySettings;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    // 更新後重置 chat
    const { resetChat } = require('../utils/geminiAPI');
    resetChat(guildId);

    await interaction.reply(`已將安全等級設為${levelChinese}。`); // 使用 levelChinese 變數顯示繁體中文
  },
};