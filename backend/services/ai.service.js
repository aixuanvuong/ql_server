// filepath: backend/services/ai.service.js
const OpenAI = require('openai');
const aiConfig = require('../config/ai.config');

class AiService {
  constructor() {
    this.openaiClient = null;
    this.modelName = process.env.OMNIROUTE_MODEL || 'gpt-4o';
    this.baseURL = 'https://omniroute.xuanvuong.id.vn/v1';
    this.initClient();
  }

  initClient() {
    const apiKey = process.env.OMNIROUTE_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: apiKey,
          baseURL: this.baseURL
        });
        console.log(`[AI Service] 🚀 Đã khởi tạo OpenAI Client trỏ về OmniRoute: ${this.baseURL} (Model: ${this.modelName})`);
      } catch (err) {
        console.error('[AI Service] ❌ Lỗi khởi tạo OpenAI Client cho OmniRoute:', err.message);
      }
    } else {
      console.warn('[AI Service] ⚠️ Chưa cấu hình OMNIROUTE_API_KEY trong biến môi trường (.env)');
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
    if (!this.openaiClient) {
      this.initClient();
    }

    // 4. Gọi API OmniRoute thông qua OpenAI SDK
    if (this.openaiClient) {
      try {
        console.log(`[AI Service] 📡 Đang gửi request đến OmniRoute (${this.baseURL}) - Model: ${this.modelName}...`);

        const response = await this.openaiClient.chat.completions.create({
          model: this.modelName,
          messages: [
            {
              role: 'system',
              content: aiConfig.SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: fullUserPrompt
            }
          ],
          temperature: 0.2, // Giữ nhiệt độ thấp để câu trả lời chính xác, kỹ thuật và chuẩn xác
          max_tokens: 2500
        });

        const replyText = response.choices?.[0]?.message?.content || 'Không nhận được nội dung phản hồi từ mô hình AI.';
        const suggestions = this.extractCommands(replyText);

        console.log(`[AI Service] ✅ Phản hồi thành công từ OmniRoute (${this.modelName}) - Kích thước: ${replyText.length} ký tự`);

        return {
          success: true,
          reply: replyText,
          suggestions: suggestions
        };
      } catch (error) {
        // Phân loại và in chi tiết các trường hợp lỗi kết nối đến baseURL OmniRoute
        const errorCode = error.code || error.status || 'UNKNOWN';
        const errorType = error.type || error.name || 'Error';
        const errorMessage = error.message || 'Lỗi không xác định';

        console.error(`[AI Service Error] ❌ Yêu cầu đến OmniRoute (${this.baseURL}) thất bại:`);
        console.error(`   • Mã lỗi (Code/Status): ${errorCode}`);
        console.error(`   • Phân loại lỗi (Type): ${errorType}`);
        console.error(`   • Chi tiết lỗi (Message): ${errorMessage}`);

        // Gợi ý chẩn đoán nguyên nhân bằng tiếng Việt cho Quản trị viên
        let diagnosticHelp = '';
        if (errorCode === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          diagnosticHelp = 'Mã API Key (OMNIROUTE_API_KEY) không hợp lệ hoặc đã hết hạn trên máy chủ OmniRoute.';
        } else if (errorCode === 404 || errorMessage.includes('404')) {
          diagnosticHelp = `Mô hình "${this.modelName}" không tồn tại hoặc endpoint "${this.baseURL}" sai đường dẫn.`;
        } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
          diagnosticHelp = `Không thể kết nối đến máy chủ OmniRoute tại "${this.baseURL}". Vui lòng kiểm tra lại kết nối mạng hoặc DNS.`;
        } else if (errorCode === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
          diagnosticHelp = `Hết thời gian chờ phản hồi từ máy chủ OmniRoute (Request Timeout).`;
        } else if (errorCode === 429) {
          diagnosticHelp = 'Vượt quá giới hạn số lượng request (Rate limit) trên tài khoản OmniRoute.';
        } else if (errorCode >= 500) {
          diagnosticHelp = 'Máy chủ định tuyến OmniRoute đang gặp sự cố nội bộ hoặc Gateway quá tải.';
        } else {
          diagnosticHelp = 'Vui lòng kiểm tra lại cấu hình OMNIROUTE_API_KEY và OMNIROUTE_MODEL trong file .env.';
        }

        return {
          success: false,
          error: errorMessage,
          reply: `⚠️ **Lỗi kết nối AI Assistant qua OmniRoute Gateway:**\n\n- **Chi tiết:** ${errorMessage} (Mã lỗi: ${errorCode})\n- **Chẩn đoán:** ${diagnosticHelp}\n- **Endpoint:** \`${this.baseURL}\` | **Model:** \`${this.modelName}\``
        };
      }
    }

    // 5. Chế độ Phản hồi Thông minh khi chưa cấu hình API Key
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

    if (!this.openaiClient) {
      this.initClient();
    }

    if (!this.openaiClient) {
      return {
        analysis: `### 🛡️ Đánh Giá An Ninh Mạng Hạ Tầng (Chế Độ Offline)
- **Cổng mở:** Đang mở ${summary?.listeningPorts || 0} cổng dịch vụ.
- **Lưu lượng Internet:** Có ${summary?.internetConnections || 0} kết nối đang trao đổi dữ liệu với máy chủ ngoài Internet.
- **Tiến trình hàng đầu:** ${summary?.topProcesses ? summary.topProcesses.map(p => `${p.name} (${p.count})`).join(', ') : 'N/A'}.

*(Chưa cấu hình \`OMNIROUTE_API_KEY\` để kết nối Trợ lý AI phân tích chuyên sâu).*`,
        safetyScore: 90,
        suggestedCommands: ['sudo ss -tulpn', 'sudo ufw status verbose']
      };
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia an ninh mạng & kỹ sư Linux SysAdmin cấp cao.'
          },
          {
            role: 'user',
            content: `Hãy phân tích danh sách lưu lượng mạng và các cổng mở dưới đây của máy chủ Ubuntu:

${contextText}

Nhiệm vụ của bạn:
1. Đánh giá tính an toàn (Cho điểm từ 0 đến 100, trong đó 100 là an toàn tuyệt đối).
2. Nhận xét các ứng dụng đang kết nối Internet: Có ứng dụng nào bất thường, rò rỉ dữ liệu hoặc độc hại không? (Nêu rõ ứng dụng nào đang truy cập ở đâu).
3. Đánh giá các cổng đang mở: Có cổng nào nhạy cảm cần đóng lại hoặc đưa vào sau tường lửa UFW không?
4. Đưa ra 2-3 câu lệnh Linux thực tế trong block code \`\`\`bash để quản trị viên kiểm tra hoặc bảo vệ hệ thống nếu cần.
Trả lời súc tích, rõ ràng, định dạng Markdown chuyên nghiệp bằng Tiếng Việt.`
          }
        ],
        temperature: 0.2
      });

      const responseText = response.choices?.[0]?.message?.content || '';
      const commands = this.extractCommands(responseText);

      return {
        analysis: responseText,
        safetyScore: 92,
        suggestedCommands: commands
      };
    } catch (err) {
      console.error('[AI Network Audit Error]:', err.message);
      return {
        analysis: `### ⚠️ Không thể kết nối tới OmniRoute API: ${err.message}\nKiểm tra lại khóa API hoặc kết nối mạng máy chủ.`,
        safetyScore: 80,
        suggestedCommands: ['sudo ss -tlpn']
      };
    }
  }

  /**
   * Lấy thông tin cấu hình hiện tại của AI Gateway
   */
  getConfig() {
    const key = process.env.OMNIROUTE_API_KEY || process.env.OPENAI_API_KEY || '';
    const maskedKey = key
      ? (key.length > 8 ? `${key.slice(0, 4)}••••••••${key.slice(-4)}` : '••••••••')
      : '';

    return {
      baseURL: this.baseURL,
      model: this.modelName,
      hasKey: !!key,
      maskedKey: maskedKey,
      availableModels: [
        { id: 'gpt-4o', name: 'GPT-4o (Đa năng, thông minh nhất)', provider: 'OpenAI' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Phản hồi cực nhanh, tiết kiệm)', provider: 'OpenAI' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Chuyên sâu DevOps & Log)', provider: 'Anthropic' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Gọn nhẹ, siêu tốc)', provider: 'Anthropic' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Bộ nhớ ngữ cảnh cực lớn)', provider: 'Google' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Xử lý log dài mượt mà)', provider: 'Google' },
        { id: 'deepseek-chat', name: 'DeepSeek-V3 / Chat (Hiệu năng cao, chi phí thấp)', provider: 'DeepSeek' }
      ]
    };
  }

  /**
   * Cập nhật cấu hình mô hình hoặc API Key trực tiếp từ Website
   */
  async updateConfig({ model, apiKey }) {
    const fs = require('fs');
    const path = require('path');

    if (model && typeof model === 'string') {
      this.modelName = model.trim();
      process.env.OMNIROUTE_MODEL = this.modelName;
    }

    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
      process.env.OMNIROUTE_API_KEY = apiKey.trim();
    }

    // Tái khởi tạo Client với cấu hình mới
    this.initClient();

    // Lưu vào file .env nếu có để duy trì khi reboot
    try {
      const envPaths = [
        path.join(__dirname, '..', '.env'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'backend', '.env')
      ];

      for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');

          if (model) {
            if (envContent.includes('OMNIROUTE_MODEL=')) {
              envContent = envContent.replace(/OMNIROUTE_MODEL=.*/g, `OMNIROUTE_MODEL=${this.modelName}`);
            } else {
              envContent += `\nOMNIROUTE_MODEL=${this.modelName}`;
            }
          }

          if (apiKey && apiKey.trim().length > 0) {
            if (envContent.includes('OMNIROUTE_API_KEY=')) {
              envContent = envContent.replace(/OMNIROUTE_API_KEY=.*/g, `OMNIROUTE_API_KEY=${apiKey.trim()}`);
            } else {
              envContent += `\nOMNIROUTE_API_KEY=${apiKey.trim()}`;
            }
          }

          fs.writeFileSync(envPath, envContent, 'utf8');
          console.log(`[AI Service] 💾 Đã lưu cấu hình AI vào file: ${envPath}`);
          break;
        }
      }
    } catch (saveErr) {
      console.warn('[AI Service] Không thể ghi file .env (chạy trên runtime tạm thời):', saveErr.message);
    }

    return {
      success: true,
      message: `Đã cập nhật cấu hình AI (Model: ${this.modelName}) thành công!`,
      config: this.getConfig()
    };
  }

  /**
   * Kiểm tra kết nối trực tiếp đến endpoint OmniRoute (Ping Test)
   */
  async testConnection() {
    if (!this.openaiClient) {
      this.initClient();
    }

    if (!this.openaiClient) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Chưa cấu hình OMNIROUTE_API_KEY. Vui lòng nhập mã khóa API.'
      };
    }

    const startTime = Date.now();
    try {
      const response = await this.openaiClient.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'user', content: 'Trả lời ngắn đúng 2 từ: "KẾT NỐI_OK"' }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const latencyMs = Date.now() - startTime;
      const reply = response.choices?.[0]?.message?.content?.trim() || 'OK';

      return {
        success: true,
        latencyMs,
        model: this.modelName,
        baseURL: this.baseURL,
        reply,
        message: `Kết nối máy chủ OmniRoute thành công (${latencyMs}ms)!`
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        model: this.modelName,
        baseURL: this.baseURL,
        error: error.message,
        message: `Lỗi kết nối (${latencyMs}ms): ${error.message}`
      };
    }
  }

  /**
   * Bộ phân tích mẫu offline khi chưa có API Key
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

*(Để kích hoạt AI đầy đủ, hãy bấm nút "Cấu hình AI" ở góc trên hộp chat để chọn mô hình và điền khóa API OmniRoute).*`;
  }
}

module.exports = new AiService();
