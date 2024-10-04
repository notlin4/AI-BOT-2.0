// utils/textConverter.js
const axios = require('axios');

async function convertText(text) {
  try {
    const response = await axios.post('https://api.zhconvert.org/convert', {
      text: text,
      converter: 'Taiwan',
      modules: JSON.stringify({
        "*": -1,
        QuotationMark: 1,
        RemoveSpaces: 1,
        EngNumFWToHW: 1
      })
});

    if (response.data && response.data.data && response.data.data.text) {
      console.log(`已從繁化姬轉換：${response.data.data.text}`)
      return response.data.data.text;
    } else {
      console.error('繁化姬 API 回應格式錯誤:', response.data);
      return text; // 如果轉換失敗，返回原始文字
    }
  } catch (error) {
    console.error('呼叫繁化姬 API 發生錯誤:', error);
    return text; // 如果發生錯誤，返回原始文字
  }
}

module.exports = { convertText };