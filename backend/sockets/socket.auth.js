// filepath: backend/sockets/socket.auth.js
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

/**
 * Middleware xác thực JWT Token cho kết nối Socket.io
 * Đảm bảo chỉ người dùng đã đăng nhập hợp lệ mới có thể nhận dữ liệu hệ thống và mở SSH
 */
module.exports = (socket, next) => {
  // Lấy token từ handshake auth hoặc query parameter
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    console.warn(`[Socket Auth] Từ chối kết nối từ ${socket.id}: Không tìm thấy token.`);
    return next(new Error('Authentication error: Thiếu Token xác thực.'));
  }

  // Giải mã và kiểm tra chữ ký token
  jwt.verify(token, authConfig.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.warn(`[Socket Auth] Token không hợp lệ từ ${socket.id}: ${err.message}`);
      return next(new Error('Authentication error: Token không hợp lệ hoặc đã hết hạn.'));
    }

    // Gắn thông tin người dùng đã xác thực vào socket object
    socket.user = decoded;
    next();
  });
};
