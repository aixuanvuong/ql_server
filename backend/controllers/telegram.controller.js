// filepath: backend/controllers/telegram.controller.js
const telegramService = require('../services/telegram.service');

/**
 * Lấy cấu hình & trạng thái hiện thời của Telegram Bot
 * Route: GET /api/telegram/config
 */
exports.getTelegramConfig = (req, res) => {
  try {
    const config = telegramService.getConfig();
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Không thể đọc cấu hình Telegram Bot.',
      error: err.message
    });
  }
};

/**
 * Cập nhật cấu hình Telegram Bot (Token, Admin ID, Bật/Tắt)
 * Route: POST /api/telegram/config
 */
exports.updateTelegramConfig = async (req, res) => {
  try {
    const { botToken, adminId, enabled } = req.body;

    const updatedConfig = await telegramService.reconfigure({
      botToken,
      adminId,
      enabled
    });

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật và áp dụng cấu hình Telegram Bot thành công!',
      data: updatedConfig
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật cấu hình Telegram Bot.',
      error: err.message
    });
  }
};

/**
 * Kiểm tra kết nối nhanh tới Telegram API (Kiểm tra tính hợp lệ của Token)
 * Route: POST /api/telegram/test-connection
 */
exports.testTelegramConnection = async (req, res) => {
  try {
    const { botToken } = req.body;
    const result = await telegramService.testConnection(botToken);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra kết nối Telegram.',
      error: err.message
    });
  }
};

/**
 * Gửi tin nhắn thử nghiệm tới Admin ID
 * Route: POST /api/telegram/send-test
 */
exports.sendTestNotification = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const result = await telegramService.sendTestNotification(chatId, message);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi tin nhắn thử nghiệm.',
      error: err.message
    });
  }
};
