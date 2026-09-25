// filepath: backend/controllers/security.controller.js
const securityService = require('../services/security.service');

exports.getSecurityStatus = (req, res) => {
  try {
    const status = securityService.getSecurityStatus();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy trạng thái bảo mật',
      error: error.message
    });
  }
};

exports.banIpManual = async (req, res) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ IP cần chặn.' });
    }
    const result = await securityService.banIp(ip, reason || 'Chặn thủ công từ bảng điều khiển');
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thực thi lệnh chặn IP',
      error: error.message
    });
  }
};

exports.unbanIp = async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ IP cần gỡ chặn.' });
    }
    const result = await securityService.unbanIp(ip);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gỡ chặn IP',
      error: error.message
    });
  }
};
