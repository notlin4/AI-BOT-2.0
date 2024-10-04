// utils/permissions.js
const config = require('../config');

function checkPermissions(member, permission) {
  // 檢查使用者是否為 ownerId 或擁有指定的權限
  return config.ownerId.includes(member.id) || member.permissions.has(permission);
}

module.exports = { checkPermissions };