// index.js

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Routes, ActivityType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [];
client.commands = new Collection();

// 載入指令
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

// 載入事件
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// 機器人啟動時同步指令
client.on('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log(`已開始重新整理 ${commands.length} 個應用程式 (/) 指令`);

    // 將指令部署到全域指令，需要最多 1 小時的快取時間
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );

    console.log(`已成功重新載入 ${data.length} 個應用程式 (/) 指令。`);
  } catch (error) {
    console.error(error);
  }

  console.log(`已登入為 ${client.user.tag}!`);
  client.user.setActivity('AI BOT 2.0', { type: ActivityType.Playing });
});

// 處理指令互動
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName); // 使用指令名稱，不使用子指令

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '執行這個指令時發生錯誤！', ephemeral: true });
  }
});

client.login(config.token);