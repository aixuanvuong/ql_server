// filepath: backend/controllers/ai.controller.js
const aiService = require('../services/ai.service');

/**
 * Controller xử lý yêu cầu chat và phân tích log từ SysAdmin
 * Route: POST /api/ai-chat
 */
exports.chatWithAssistant = async (req, res) => {
  try {
    const { message, terminalContext, systemMetrics } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Thiếu nội dung câu hỏi hoặc yêu cầu gửi tới AI.'
      });
    }

    const result = await aiService.askAssistant({
      userMessage: message,
      terminalContext: terminalContext || '',
      systemMetrics: systemMetrics || null
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AI Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi máy chủ nội bộ khi xử lý yêu cầu AI.',
      error: error.message
    });
  }
};

/**
 * Lấy cấu hình AI hiện tại (BaseURL, Model, Masked Key, Danh sách Models)
 * Route: GET /api/ai/config
 */
exports.getAiConfig = (req, res) => {
  try {
    const config = aiService.getConfig();
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể đọc cấu hình AI.',
      error: error.message
    });
  }
};

/**
 * Cập nhật cấu hình AI (Đổi Model, Cập nhật API Key)
 * Route: POST /api/ai/config
 */
exports.updateAiConfig = async (req, res) => {
  try {
    const { model, apiKey } = req.body;

    if (!model && !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mô hình (model) hoặc mã khóa (apiKey) cần cập nhật.'
      });
    }

    const result = await aiService.updateConfig({ model, apiKey });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật cấu hình AI.',
      error: error.message
    });
  }
};

/**
 * Kiểm tra kết nối nhanh tới OmniRoute Gateway (Ping/Latency Test)
 * Route: POST /api/ai/test
 */
exports.testAiConnection = async (req, res) => {
  try {
    const result = await aiService.testConnection();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra kết nối AI Gateway.',
      error: error.message
    });
  }
};
