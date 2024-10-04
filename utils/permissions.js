// utils/permissions.js
const config = require('../config.json');

function checkPermissions(member) {
  // 檢查使用者是否為 ownerId 或擁有管理訊息權限
  return config.ownerId.includes(member.id) || member.permissions.has('ManageMessages');
}

module.exports = { checkPermissions };