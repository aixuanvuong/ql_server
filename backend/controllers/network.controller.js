// filepath: backend/controllers/network.controller.js
const networkService = require('../services/network.service');
const aiService = require('../services/ai.service');

/**
 * Controller quản lý hạ tầng mạng, lưu lượng Internet và kiểm tra an ninh
 */
exports.getNetworkOverview = async (req, res) => {
  try {
    const overview = await networkService.getNetworkOverview();
    return res.status(200).json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('[Network Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy thông tin hạ tầng mạng',
      error: error.message
    });
  }
};

exports.pingTest = async (req, res) => {
  try {
    const { target } = req.body;
    const result = await networkService.pingHost(target || '8.8.8.8');
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra độ trễ mạng',
      error: error.message
    });
  }
};

exports.dnsLookup = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên miền cần tra cứu.' });
    }
    const result = await networkService.dnsLookup(domain);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tra cứu DNS',
      error: error.message
    });
  }
};

exports.killProcess = async (req, res) => {
  try {
    const { pid } = req.body;
    if (!pid) {
      return res.status(400).json({ success: false, message: 'Thiếu PID tiến trình cần dừng.' });
    }
    const result = await networkService.killProcess(pid);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi dừng tiến trình',
      error: error.message
    });
  }
};

exports.auditNetworkWithAi = async (req, res) => {
  try {
    const overview = await networkService.getNetworkOverview();
    const auditResult = await aiService.auditNetworkSecurity({
      connections: overview.connections,
      interfaces: overview.interfaces,
      summary: overview.summary
    });

    return res.status(200).json({
      success: true,
      data: auditResult
    });
  } catch (error) {
    console.error('[AI Network Audit Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể hoàn tất phân tích an ninh mạng bằng AI',
      error: error.message
    });
  }
};
