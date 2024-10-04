// utils/geminiAPI.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { GoogleAIFileManager, FileState } = require("@google/generative-ai/server"); // 從 server 引入
const config = require('../config.json');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { convertText } = require('./textConverter');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const fileManager = new GoogleAIFileManager(config.geminiApiKey); // 建立 fileManager 物件

// 讀取 prompts.txt 中的系統指示
const systemInstruction = fs.readFileSync('./prompts.txt', 'utf-8');

// 使用一個物件來儲存每個伺服器的 chat
const chats = {};

function resetChat(guildId) {
  // 從 config.json 中讀取安全設定
  let safetySettings = config.safetySettings[guildId] || [
    // 預設安全設定
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  let model = genAI.getGenerativeModel({ model: config.geminiModel, safetySettings, systemInstruction });

  // 將 chat 儲存在以 guildId 為鍵的物件中
  chats[guildId] = model.startChat({
    generationConfig: {
      maxOutputTokens: 8192,
    },
  });
}

async function generateResponse(messagecontent, attachments, guildId, message) {
  try {
    // 檢查 chats 物件中是否存在該伺服器的 chat
    if (!chats[guildId]) {
      resetChat(guildId);
    }

    // 使用該伺服器的 chat
    const chat = chats[guildId];

    let parts = [{ text: `${message.member.displayName} (${message.author.username})：${message.content}` }];

    // 處理 Tenor 連結
    const tenorLinks = message.content.match(/https:\/\/tenor\.com\/view\/[^\s]+/g);
    if (tenorLinks) {
      for (const tenorLink of tenorLinks) {
        try {
          // 從 Tenor 連結中提取 GIF URL
          const response = await axios.get(tenorLink);
          const gifUrl = response.data.match(/src="(https:\/\/media\.tenor\.com\/[^\s]+)"/)[1];

          // 下載 GIF 到本機
          const gifResponse = await fetch(gifUrl);
          const gifBuffer = Buffer.from(await gifResponse.arrayBuffer());
          const gifFilename = path.basename(gifUrl);
          const localGifPath = path.join(os.tmpdir(), gifFilename);
          fs.writeFileSync(localGifPath, gifBuffer);

          // 使用 fluent-ffmpeg 將 GIF 直接轉換成 MP4 影片
          const mp4Filename = gifFilename.replace('.gif', '.mp4');
          const localMp4Path = path.join(os.tmpdir(), mp4Filename);
          await new Promise((resolve, reject) => {
            ffmpeg(localGifPath)
              .output(localMp4Path)
              .on('end', resolve)
              .on('error', reject)
              .run();
          });

          // 上傳 MP4 檔案
          const uploadResponse = await fileManager.uploadFile(localMp4Path, {
            mimeType: 'video/mp4',
            displayName: mp4Filename,
          });
          const uploadedFile = uploadResponse.file;

          // 檢查檔案狀態直到變成 ACTIVE
          while (true) {
            const file = await fileManager.getFile(uploadedFile.name);
            if (file.state === FileState.ACTIVE) {
              break;
            } else if (file.state === FileState.FAILED) {
              throw new Error(`影片處理失敗：${uploadedFile.name}`);
            }
            console.log(`檔案 ${uploadedFile.name} 狀態：${file.state}, 等待中...`);
            await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待 5 秒
          }

          // 將 MP4 檔案加入 parts 陣列
          parts.push({
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri,
            },
          });

          // 在訊息中告訴 Gemini MP4 檔案名稱
          parts.push({ text: `系統：${message.member.displayName} (${message.author.username}) 上傳了 GIF 檔案 ${gifFilename}` });

          // 刪除本機 GIF 和 MP4 檔案
          fs.unlinkSync(localGifPath);
          fs.unlinkSync(localMp4Path);

        } catch (error) {
          console.error(`下載或上傳 Tenor GIF 檔案失敗：`, error);
          await message.reply(`下載或上傳 Tenor GIF 檔案失敗，請稍後再試。`);
        }
      }
    }

    // 處理附件中的檔案
    for (const [id, attachment] of attachments) {
      let filePart;

      // 判斷檔案大小，選擇上傳方式
      if (attachment.size > 20 * 1024 * 1024) { // 超過 20MB，使用 File API
        let uploadedFile = null;
        let localFilePath;

        // 下載附件到本機
        try {
          const response = await fetch(attachment.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          localFilePath = path.join(os.tmpdir(), attachment.name);
          fs.writeFileSync(localFilePath, buffer);
        } catch (downloadError) {
          console.error(`下載檔案 ${attachment.name} 失敗：`, downloadError);
          await message.reply(`下載檔案 ${attachment.name} 失敗，請稍後再試。`);
          continue; // 跳過處理此附件
        }

        // 使用 File API 上傳檔案
        try {
          const uploadResponse = await fileManager.uploadFile(localFilePath, {
            mimeType: attachment.contentType,
            displayName: attachment.name,
          });
          uploadedFile = uploadResponse.file;
        } catch (uploadError) {
          console.error(`上傳檔案 ${attachment.name} 失敗：`, uploadError);
          await message.reply(`上傳檔案 ${attachment.name} 失敗，請稍後再試。`);
          continue; // 跳過處理此附件
        } finally {
          // 刪除本機檔案
          fs.unlinkSync(localFilePath);
        }

        // 判斷 uploadedFile 是否為 null
        if (!uploadedFile) {
          continue; // 跳過處理此附件
        }

        filePart = {
          fileData: {
            mimeType: uploadedFile.mimeType,
            fileUri: uploadedFile.uri,
          },
        };
      } else { // 小於 20MB，使用 inline data
        try {
          const response = await fetch(attachment.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          filePart = {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: attachment.contentType,
            },
          };
        } catch (downloadError) {
          console.error(`下載檔案 ${attachment.name} 失敗：`, downloadError);
          await message.reply(`下載檔案 ${attachment.name} 失敗，請稍後再試。`);
          continue; // 跳過處理此附件
        }
      }

      parts.push(filePart);

      // 在訊息中告訴 Gemini 檔案名稱
      parts.push({ text: `系統：${message.member.displayName} (${message.author.username}) 上傳了檔案 ${attachment.name}` });
    }

    // 記錄開始時間
    const startTime = Date.now();

    const result = await chat.sendMessage(parts);
    const response = await result.response;

    // 計算延遲時間
    const endTime = Date.now();
    const geminiLatency = endTime - startTime;

    // 輸出 Gemini API 延遲和回應到主控台
    console.log(`Gemini API 延遲：${geminiLatency} 毫秒`);
    console.log(`Gemini API 回應：${response.text()}`);

    const convertedResponse = await convertText(response.text());
    return convertedResponse;
  } catch (error) {
    console.error('產生回覆時發生錯誤', error);
    if (error.message.includes('blocked')) {
      return "很抱歉，基於安全考量，我無法回應這個問題。";
    } else if (error.message.includes('429 Too Many Requests')) {
      return "發生錯誤：[429 請求過多] 請減少提示內容、使用 `/resetchat` 指令重設對話或稍後再試。"
    }
    throw error;
  }
}

async function uploadToGemini(url, mimeType) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  // 建立臨時檔案
  const tempFilePath = path.join(os.tmpdir(), 'temp_image.png');
  fs.writeFileSync(tempFilePath, buffer);

  // 使用 GoogleAIFileManager 上傳檔案，傳遞檔案路徑
  const uploadResult = await fileManager.uploadFile(tempFilePath, {
    mimeType,
    displayName: url,
  });

  // 刪除臨時檔案
  fs.unlinkSync(tempFilePath);

  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

function updateSafetySettings(newSettings, guildId) {
  config.safetySettings[guildId] = newSettings;
  fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
  resetChat(guildId); // 傳入 guildId
}

module.exports = { generateResponse, resetChat, updateSafetySettings };