// filepath: backend/config/auth.config.js
require('dotenv').config();

module.exports = {
  // Chuỗi bí mật dùng để ký và xác thực mã JWT Token
  JWT_SECRET: process.env.JWT_SECRET || 'ubuntu_monitor_secret_key_2026_xyz',
  
  // Thời gian token có hiệu lực (ví dụ: 24 giờ)
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Tài khoản Admin mặc định để bảo vệ Dashboard
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123'
};
