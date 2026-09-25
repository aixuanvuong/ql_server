// filepath: backend/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

/**
 * Xử lý yêu cầu đăng nhập từ người dùng
 * Kiểm tra username và password, nếu hợp lệ sẽ trả về JWT token
 */
exports.login = (req, res) => {
  const { username, password } = req.body;

  // Kiểm tra trường bắt buộc
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp cả Tên đăng nhập và Mật khẩu.'
    });
  }

  // So khớp với tài khoản cấu hình trong môi trường server
  if (username === authConfig.ADMIN_USERNAME && password === authConfig.ADMIN_PASSWORD) {
    const payload = {
      username: authConfig.ADMIN_USERNAME,
      role: 'admin',
      server: 'ubuntu-monitor'
    };

    // Tạo mã token
    const token = jwt.sign(payload, authConfig.JWT_SECRET, {
      expiresIn: authConfig.JWT_EXPIRES_IN
    });

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token: token,
      user: {
        username: authConfig.ADMIN_USERNAME,
        role: 'admin'
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Tài khoản hoặc mật khẩu không chính xác.'
  });
};

/**
 * API kiểm tra token còn hiệu lực hay không (dùng khi refresh trang)
 */
exports.verifyToken = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Thiếu Authorization Token.' });
  }

  jwt.verify(token, authConfig.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token đã hết hạn hoặc không hợp lệ.' });
    }
    return res.status(200).json({ success: true, user: decoded });
  });
};
