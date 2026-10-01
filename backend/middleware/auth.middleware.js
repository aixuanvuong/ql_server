// filepath: backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

/**
 * Middleware xác thực JWT cho toàn bộ REST API
 * Bảo vệ các endpoint khỏi truy cập trái phép khi chưa đăng nhập
 */
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      success: false,
      message: 'Yêu cầu mã xác thực Token (Authorization Bearer Header).'
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Định dạng Authorization Token không hợp lệ. Phải là "Bearer <token>".'
    });
  }

  const token = parts[1];

  if (!authConfig.JWT_SECRET) {
    console.error('[AUTH ERROR] JWT_SECRET chưa được cấu hình trong biến môi trường (.env)!');
    return res.status(500).json({
      success: false,
      message: 'Lỗi cấu hình máy chủ: Chưa thiết lập JWT_SECRET.'
    });
  }

  jwt.verify(token, authConfig.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
      });
    }

    req.user = decoded;
    return next();
  });
};

/**
 * Rate Limiter chống tấn công Brute-Force vào endpoint đăng nhập POST /api/auth/login
 * Giới hạn tối đa 10 lần thử trong vòng 5 phút trên mỗi địa chỉ IP
 */
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 phút
const MAX_LOGIN_ATTEMPTS = 10;              // Tối đa 10 lần thử

// Tự động dọn dẹp các IP đã hết thời gian giới hạn mỗi 5 phút
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

const loginRateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                   req.socket?.remoteAddress ||
                   req.ip ||
                   'unknown';

  const now = Date.now();
  const attemptData = loginAttempts.get(clientIp);

  if (!attemptData) {
    loginAttempts.set(clientIp, {
      count: 1,
      firstAttempt: now
    });
    return next();
  }

  // Nếu đã qua cửa sổ 5 phút, reset lại bộ đếm
  if (now - attemptData.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(clientIp, {
      count: 1,
      firstAttempt: now
    });
    return next();
  }

  // Tăng số lần thử
  attemptData.count += 1;

  // Kiểm tra vượt ngưỡng
  if (attemptData.count > MAX_LOGIN_ATTEMPTS) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - attemptData.firstAttempt)) / 1000);
    console.warn(`[Security:RateLimit] ⚠️ IP ${clientIp} bị khóa tạm thời do thử đăng nhập quá ${MAX_LOGIN_ATTEMPTS} lần!`);
    return res.status(429).json({
      success: false,
      message: `Quá nhiều lần thử đăng nhập. Vui lòng đợi ${remainingSeconds} giây trước khi thử lại.`
    });
  }

  return next();
};

module.exports = {
  verifyJWT,
  loginRateLimiter
};
