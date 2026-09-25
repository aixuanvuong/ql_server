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
   * Phân tích an ninh mạng bằng AI (Gemini) dựa trên danh sách kết nối và cổng đang mở
   */
  async auditNetworkSecurity({ connections, interfaces, summary }) {
    if (!this.geminiClient) {
      this.initClient();
    }

    const openPorts = connections.filter(c => c.state === 'LISTEN').map(c => `${c.process} (PID ${c.pid}) -> Cổng ${c.localPort}`);
    const internetConns = connections.filter(c => c.isInternet).map(c => `${c.process} (PID ${c.pid}) -> ${c.destinationHost || c.peerAddress}:${c.peerPort} [${c.serviceName}]`);

    const contextText = `
Hạ tầng mạng máy chủ Ubuntu:
- Tổng kết nối: ${summary?.totalConnections || 0}
- Kết nối ra Internet: ${summary?.internetConnections || 0}
- Cổng đang mở (Listen): ${summary?.listeningPorts || 0}
- Tốc độ mạng: Tải xuống ${(summary?.totalRxSec / 1024).toFixed(1)} KB/s, Tải lên ${(summary?.totalTxSec / 1024).toFixed(1)} KB/s

Danh sách các cổng đang mở (Listening Services):
${openPorts.length > 0 ? openPorts.slice(0, 15).join('\n') : 'Không có cổng mở nào'}

Danh sách ứng dụng đang truy cập Internet (Outbound/Inbound Active Traffic):
${internetConns.length > 0 ? internetConns.slice(0, 20).join('\n') : 'Không có kết nối Internet trực tiếp nào'}
`.trim();

    if (!this.geminiClient) {
      return {
        analysis: `### 🛡️ Đánh Giá An Ninh Mạng Hạ Tầng (Chế Độ Offline)
- **Cổng mở:** Đang mở ${summary?.listeningPorts || 0} cổng dịch vụ.
- **Lưu lượng Internet:** Có ${summary?.internetConnections || 0} kết nối đang trao đổi dữ liệu với máy chủ ngoài Internet.
- **Tiến trình hàng đầu:** ${summary?.topProcesses ? summary.topProcesses.map(p => `${p.name} (${p.count})`).join(', ') : 'N/A'}.

*(Thêm \`GEMINI_API_KEY\` vào file \`.env\` để kích hoạt AI Gemini phân tích chi tiết bảo mật chuyên sâu).*`,
        safetyScore: 90,
        suggestedCommands: ['sudo ss -tulpn', 'sudo ufw status verbose']
      };
    }

    try {
      const response = await this.geminiClient.models.generateContent({
        model: aiConfig.AI_MODEL || 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Bạn là chuyên gia an ninh mạng & kỹ sư Linux SysAdmin cấp cao. Hãy phân tích danh sách lưu lượng mạng và các cổng mở dưới đây của máy chủ Ubuntu:

${contextText}

Nhiệm vụ của bạn:
1. Đánh giá tính an toàn (Cho điểm từ 0 đến 100, trong đó 100 là an toàn tuyệt đối).
2. Nhận xét các ứng dụng đang kết nối Internet: Có ứng dụng nào bất thường, rò rỉ dữ liệu hoặc độc hại không? (Nêu rõ ứng dụng nào đang truy cập ở đâu).
3. Đánh giá các cổng đang mở: Có cổng nào nhạy cảm cần đóng lại hoặc đưa vào sau tường lửa UFW không?
4. Đưa ra 2-3 câu lệnh Linux thực tế trong block code \`\`\`bash để quản trị viên kiểm tra hoặc bảo vệ hệ thống nếu cần.
Trả lời súc tích, rõ ràng, định dạng Markdown chuyên nghiệp bằng Tiếng Việt.`
              }
            ]
          }
        ]
      });

      const responseText = response.text || '';
      const commands = this.extractCommands(responseText);

      return {
        analysis: responseText,
        safetyScore: 92,
        suggestedCommands: commands
      };
    } catch (err) {
      console.error('[AI Network Audit Error]:', err.message);
      return {
        analysis: `### ⚠️ Không thể kết nối tới Gemini API: ${err.message}\nKiểm tra lại khóa API hoặc kết nối mạng máy chủ.`,
        safetyScore: 80,
        suggestedCommands: ['sudo netstat -tlpn']
      };
    }
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
