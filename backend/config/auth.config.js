// filepath: backend/config/auth.config.js
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.warn('[AUTH CONFIG] ⚠️ CẢNH BÁO: JWT_SECRET chưa được thiết lập trong file .env. Hãy tạo khóa ngẫu nhiên: openssl rand -hex 32');
}

const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  console.warn('[AUTH CONFIG] ⚠️ CẢNH BÁO: ADMIN_PASSWORD chưa được thiết lập trong file .env.');
}

module.exports = {
  // Chuỗi bí mật dùng để ký và xác thực mã JWT Token (bắt buộc cấu hình trong .env, không dùng hardcode mặc định)
  JWT_SECRET: process.env.JWT_SECRET || '',

  // Thời gian token có hiệu lực (ví dụ: 24 giờ)
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Tài khoản Admin quản trị máy chủ (bắt buộc cấu hình trong .env, không dùng mật khẩu mặc định)
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || ''
};
