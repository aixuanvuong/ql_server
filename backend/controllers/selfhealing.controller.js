// filepath: backend/controllers/selfhealing.controller.js
const selfHealingService = require('../services/selfhealing.service');

exports.getHealingStatus = (req, res) => {
  try {
    const status = selfHealingService.getStatus();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy trạng thái tự phục hồi',
      error: error.message
    });
  }
};

exports.triggerManualCleanup = async (req, res) => {
  try {
    const { type } = req.body; // 'ram', 'disk', 'all'
    const result = await selfHealingService.triggerManualCleanup(type || 'all');
    return res.status(200).json({
      success: true,
      message: 'Đã kích hoạt tác vụ tự phục hồi và dọn dẹp hệ thống!',
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thực thi dọn dẹp hệ thống',
      error: error.message
    });
  }
};
