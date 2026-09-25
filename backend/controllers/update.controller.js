// filepath: backend/controllers/update.controller.js
const updateService = require('../services/update.service');

exports.checkForUpdates = async (req, res) => {
  try {
    const result = await updateService.checkForUpdates();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra bản cập nhật',
      error: error.message
    });
  }
};

exports.triggerUpdate = (io) => {
  return (req, res) => {
    try {
      const result = updateService.triggerUpdate(io);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi khởi chạy tiến trình cập nhật',
        error: error.message
      });
    }
  };
};

exports.getUpdateStatus = (req, res) => {
  try {
    const status = updateService.getUpdateStatus();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy trạng thái cập nhật',
      error: error.message
    });
  }
};
