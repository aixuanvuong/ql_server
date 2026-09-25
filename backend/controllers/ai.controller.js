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
