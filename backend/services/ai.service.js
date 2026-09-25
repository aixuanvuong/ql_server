// filepath: backend/services/ai.service.js
const { GoogleGenAI } = require('@google/genai');
const aiConfig = require('../config/ai.config');

class AiService {
  constructor() {
    this.geminiClient = null;
    this.initClient();
  }

  initClient() {
    const apiKey = aiConfig.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.error('[AI Service] Lỗi khởi tạo Gemini SDK:', err.message);
      }
    }
  }

  /**
   * Cắt xén và làm sạch log an toàn ở tầng Backend để bảo vệ Token Budget
   */
  sanitizeAndTruncateLogs(rawLogs, maxChars = 8000) {
    if (!rawLogs || typeof rawLogs !== 'string') return '';
    // Lược bỏ ANSI escape codes
    const ansiRegex = /[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g;
    let cleaned = rawLogs.replace(ansiRegex, '').trim();

    if (cleaned.length <= maxChars) return cleaned;

    const headChars = Math.floor(maxChars * 0.35); // 35% đầu (các lệnh vừa gõ)
    const tailChars = Math.floor(maxChars * 0.65); // 65% đuôi (kết quả lỗi gần nhất)
    return `${cleaned.slice(0, headChars)}\n\n[...⚠️ Đã cắt bớt ${cleaned.length - maxChars} ký tự ở giữa để không vượt quá giới hạn Token LLM...]\n\n${cleaned.slice(-tailChars)}`;
  }

  /**
   * Gọi LLM để phân tích log và giải đáp câu hỏi của SysAdmin
   * @param {string} userMessage - Câu hỏi hoặc yêu cầu của người dùng
   * @param {string} terminalContext - Đoạn trích xuất từ màn hình xterm.js
   * @param {Object} systemMetrics - Thông số CPU, RAM, Nhiệt độ hiện thời
   */
  async askAssistant({ userMessage, terminalContext, systemMetrics }) {
    // 0. Cắt xén và bảo vệ Token Limit
    const safeTerminalLogs = this.sanitizeAndTruncateLogs(terminalContext, 8000);

    // 1. Chuẩn bị ngữ cảnh thông số phần cứng
    let metricsContext = 'Không có dữ liệu phần cứng.';
    if (systemMetrics) {
      metricsContext = `
- Tải CPU: ${systemMetrics.cpuLoad ?? 'N/A'}%
- Bộ nhớ RAM đã dùng: ${systemMetrics.ramUsedPercent ?? 'N/A'}%
- Nhiệt độ CPU: ${systemMetrics.temperature ?? 'N/A'}°C
- Thời gian hoạt động (Uptime): ${systemMetrics.uptimeSeconds ? Math.floor(systemMetrics.uptimeSeconds / 3600) + ' giờ' : 'N/A'}
      `.trim();
    }

    // 2. Định dạng Prompt tổng hợp
    const fullUserPrompt = `
Dưới đây là ngữ cảnh hệ thống máy chủ Ubuntu hiện tại:

[THÔNG SỐ PHẦN CỨNG]:
${metricsContext}

[LỊCH SỬ DÒNG LỆNH VÀ LOG TERMINAL GẦN NHẤT]:
\`\`\`
${safeTerminalLogs || '(Không có nội dung log)'}
\`\`\`

[YÊU CẦU CỦA QUẢN TRỊ VIÊN]:
${userMessage}
    `.trim();

    // 3. Nếu chưa khởi tạo client, kiểm tra lại biến môi trường
    if (!this.geminiClient) {
      this.initClient();
    }

    // 4. Gọi API Gemini chính thức
    if (this.geminiClient) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: aiConfig.MODEL_NAME || 'gemini-3.8-flash',
          contents: fullUserPrompt,
          config: {
            systemInstruction: aiConfig.SYSTEM_PROMPT,
            temperature: 0.2 // Giữ nhiệt độ thấp để câu trả lời chính xác, kỹ thuật và đáng tin cậy
          }
        });

        const replyText = response.text || 'Không nhận được phản hồi từ AI.';
        const suggestions = this.extractCommands(replyText);

        return {
          success: true,
          reply: replyText,
          suggestions: suggestions
        };
      } catch (error) {
        console.error('[AI Service Error]:', error.message);
        return {
          success: false,
          error: error.message,
          reply: `⚠️ Lỗi khi gọi AI API (${error.message}). Vui lòng kiểm tra lại cấu hình GEMINI_API_KEY.`
        };
      }
    }

    // 5. Chế độ Phản hồi Thông minh khi chưa có API Key
    return {
      success: true,
      reply: this.generateFallbackAnalysis(userMessage, terminalContext, systemMetrics),
      suggestions: ['systemctl status', 'journalctl -xe --no-pager -n 30', 'dmesg -T | tail -n 20']
    };
  }

  /**
   * Tự động trích xuất các câu lệnh bash trong khối ```bash ... ``` để tạo nút bấm Copy nhanh
   */
  extractCommands(markdownText) {
    const codeBlockRegex = /```(?:bash|sh)?\r?\n([\s\S]*?)```/g;
    const commands = [];
    let match;

    while ((match = codeBlockRegex.exec(markdownText)) !== null) {
      const codeLines = match[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
      commands.push(...codeLines);
    }

    return Array.from(new Set(commands));
  }

  /**
   * Bộ phân tích mẫu offline khi chưa nhập GEMINI_API_KEY
   */
  generateFallbackAnalysis(message, logs, metrics) {
    return `### 💡 Phân Tích Hệ Thống Ubuntu (SysAdmin Assistant)
- **Tình trạng phần cứng:** CPU: ${metrics?.cpuLoad || 25}%, RAM: ${metrics?.ramUsedPercent || 50}%, Nhiệt độ: ${metrics?.temperature || 48}°C.
- **Quan sát Log:** Tôi đã nhận được ${logs ? logs.split('\n').length : 0} dòng log từ Terminal của bạn.
- **Yêu cầu:** "${message}"

**Gợi ý lệnh kiểm tra ban đầu:**
\`\`\`bash
journalctl -xe --no-pager -n 30
systemctl --failed
free -h && df -h
\`\`\`

*(Để kích hoạt trí tuệ nhân tạo Gemini 3.8 Flash đầy đủ, hãy thêm \`GEMINI_API_KEY\` vào file \`.env\` của Backend).*`;
  }
}

module.exports = new AiService();
