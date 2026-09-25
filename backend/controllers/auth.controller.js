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

const fs = require('fs');
const path = require('path');

/**
 * API Đổi tài khoản (Username) và mật khẩu (Password) của hệ thống
 */
exports.changeCredentials = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập trước khi đổi mật khẩu.' });
  }

  jwt.verify(token, authConfig.JWT_SECRET, (err) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    // Xác minh mật khẩu hiện tại
    if (currentPassword !== authConfig.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng.'
      });
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 4 ký tự.'
      });
    }

    const finalUsername = (newUsername && newUsername.trim()) ? newUsername.trim() : authConfig.ADMIN_USERNAME;
    const finalPassword = newPassword.trim();

    // Cập nhật cấu hình runtime
    authConfig.ADMIN_USERNAME = finalUsername;
    authConfig.ADMIN_PASSWORD = finalPassword;

    // Lưu vào file .env
    const potentialPaths = [
      path.resolve(__dirname, '../.env'),
      path.resolve(__dirname, '../../backend/.env'),
      path.resolve(__dirname, '../../.env'),
      '/opt/ql_server/backend/.env',
      '/opt/ql_server/.env'
    ];

    potentialPaths.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('ADMIN_USERNAME=')) {
            content = content.replace(/^ADMIN_USERNAME=.*/m, `ADMIN_USERNAME=${finalUsername}`);
          } else {
            content += `\nADMIN_USERNAME=${finalUsername}`;
          }

          if (content.includes('ADMIN_PASSWORD=')) {
            content = content.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD=${finalPassword}`);
          } else {
            content += `\nADMIN_PASSWORD=${finalPassword}`;
          }
          fs.writeFileSync(filePath, content, 'utf8');
        }
      } catch (e) {
        console.error(`Không thể ghi file ${filePath}:`, e.message);
      }
    });

    // Tạo JWT token mới chứa username mới
    const payload = {
      username: finalUsername,
      role: 'admin',
      server: 'ubuntu-monitor'
    };
    const newToken = jwt.sign(payload, authConfig.JWT_SECRET, {
      expiresIn: authConfig.JWT_EXPIRES_IN
    });

    return res.status(200).json({
      success: true,
      message: 'Thay đổi tài khoản và mật khẩu thành công!',
      token: newToken,
      user: {
        username: finalUsername,
        role: 'admin'
      }
    });
  });
};
