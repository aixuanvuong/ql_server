// filepath: backend/services/telegram.service.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const aiService = require('./ai.service');
const systemService = require('./system.service');
const newsService = require('./news.service');
require('dotenv').config();

class TelegramService {
  constructor() {
    this.bot = null;
    this.token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    this.adminId = (process.env.TELEGRAM_ADMIN_ID || '').toString().trim();
    this.isEnabled = process.env.TELEGRAM_BOT_ENABLED !== 'false';
    this.isRunning = false;
    this.botInfo = null;
    this.lastError = null;
    this.chatHistories = new Map(); // Lưu ngữ cảnh hội thoại đa lượt theo Chat ID
  }

  /**
   * Khởi tạo Telegram Bot ở chế độ Polling
   */
  async init() {
    this.token = (process.env.TELEGRAM_BOT_TOKEN || this.token || '').trim();
    this.adminId = (process.env.TELEGRAM_ADMIN_ID || this.adminId || '').toString().trim();
    this.isEnabled = process.env.TELEGRAM_BOT_ENABLED !== 'false';

    // Dừng bot cũ nếu đang chạy trước khi khởi tạo lại
    await this.stop();

    if (!this.isEnabled) {
      console.log('[Telegram Bot] ⏸️ Telegram ChatOps đang ở trạng thái TẮT (Disabled).');
      return;
    }

    if (!this.token || this.token.includes('your_telegram_bot_token')) {
      console.log('[Telegram Bot] ℹ️ Chưa thiết lập TELEGRAM_BOT_TOKEN trong .env. Telegram ChatOps tạm thời ở chế độ tắt.');
      return;
    }

    if (!this.adminId) {
      console.warn('[Telegram Bot] ⚠️ CẢNH BÁO: Chưa cấu hình TELEGRAM_ADMIN_ID. Bot sẽ từ chối tin nhắn từ tất cả người dùng để bảo vệ máy chủ.');
    }

    try {
      this.bot = new TelegramBot(this.token, { polling: true });
      this.isRunning = true;
      this.lastError = null;

      // Lấy thông tin tài khoản Bot từ Telegram API
      try {
        const me = await this.bot.getMe();
        this.botInfo = {
          id: me.id,
          username: me.username || '',
          firstName: me.first_name || '',
          canJoinGroups: me.can_join_groups,
          canReadAllGroupMessages: me.can_read_all_group_messages
        };
        console.log(`[Telegram Bot] 🚀 Kết nối Telegram Bot thành công: @${this.botInfo.username} (${this.botInfo.firstName})! Đang bảo vệ bởi Admin ID: ${this.adminId || 'CHƯA ĐẶT'}`);
      } catch (meErr) {
        console.warn('[Telegram Bot] ⚠️ Kết nối bot nhưng chưa lấy được getMe:', meErr.message);
      }

      // Xử lý lỗi polling không làm gián đoạn server
      this.bot.on('polling_error', (error) => {
        this.lastError = error.message || String(error);
        console.warn('[Telegram Bot] Polling warning:', error.code || error.message);
      });

      this.registerHandlers();
    } catch (err) {
      this.isRunning = false;
      this.lastError = err.message;
      console.error('[Telegram Bot] ❌ Khởi tạo thất bại:', err.message);
    }
  }

  /**
   * Dừng tiến trình Polling an toàn
   */
  async stop() {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
      } catch (err) {
        console.warn('[Telegram Bot] Dừng bot:', err.message);
      }
      this.bot = null;
    }
    this.isRunning = false;
    this.botInfo = null;
  }

  /**
   * Cập nhật cấu hình Telegram Bot từ giao diện Web
   * @param {object} params
   * @param {string} [params.botToken] - Token mới từ BotFather
   * @param {string} [params.adminId] - ID của Admin trên Telegram
   * @param {boolean} [params.enabled] - Trạng thái bật/tắt Bot
   */
  async reconfigure({ botToken, adminId, enabled }) {
    if (typeof enabled === 'boolean') {
      this.isEnabled = enabled;
      process.env.TELEGRAM_BOT_ENABLED = String(enabled);
    }

    if (botToken !== undefined && typeof botToken === 'string' && botToken.trim().length > 0) {
      this.token = botToken.trim();
      process.env.TELEGRAM_BOT_TOKEN = this.token;
    }

    if (adminId !== undefined) {
      this.adminId = String(adminId).trim();
      process.env.TELEGRAM_ADMIN_ID = this.adminId;
    }

    // Ghi vào file .env trên hệ thống để bảo lưu sau khi khởi động lại
    this.saveToEnvFiles();

    // Khởi động lại Bot với cấu hình mới
    await this.init();

    return this.getConfig();
  }

  /**
   * Lưu cấu hình vào các file .env tiềm năng
   */
  saveToEnvFiles() {
    const potentialPaths = [
      path.resolve(__dirname, '../.env'),
      path.resolve(__dirname, '../../backend/.env'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'backend', '.env'),
      '/.env',
      '/backend/.env'
    ];

    potentialPaths.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf8');

          // Cập nhật TELEGRAM_BOT_TOKEN
          if (this.token && !this.token.includes('your_telegram_bot_token')) {
            if (content.includes('TELEGRAM_BOT_TOKEN=')) {
              content = content.replace(/^TELEGRAM_BOT_TOKEN=.*/m, `TELEGRAM_BOT_TOKEN="${this.token}"`);
            } else {
              content += `\nTELEGRAM_BOT_TOKEN="${this.token}"`;
            }
          }

          // Cập nhật TELEGRAM_ADMIN_ID
          if (content.includes('TELEGRAM_ADMIN_ID=')) {
            content = content.replace(/^TELEGRAM_ADMIN_ID=.*/m, `TELEGRAM_ADMIN_ID="${this.adminId}"`);
          } else {
            content += `\nTELEGRAM_ADMIN_ID="${this.adminId}"`;
          }

          // Cập nhật TELEGRAM_BOT_ENABLED
          if (content.includes('TELEGRAM_BOT_ENABLED=')) {
            content = content.replace(/^TELEGRAM_BOT_ENABLED=.*/m, `TELEGRAM_BOT_ENABLED="${this.isEnabled}"`);
          } else {
            content += `\nTELEGRAM_BOT_ENABLED="${this.isEnabled}"`;
          }

          fs.writeFileSync(filePath, content, 'utf8');
        }
      } catch (err) {
        console.warn(`[Telegram Bot] Không thể ghi cấu hình vào ${filePath}:`, err.message);
      }
    });
  }

  /**
   * Lấy cấu hình và trạng thái an toàn để hiển thị trên Web UI
   */
  getConfig() {
    const token = this.token || '';
    const hasValidToken = !!token && !token.includes('your_telegram_bot_token');
    const maskedToken = hasValidToken
      ? (token.length > 12 ? `${token.slice(0, 6)}••••••••${token.slice(-4)}` : '••••••••')
      : '';

    let status = 'not_configured';
    if (!hasValidToken) {
      status = 'not_configured';
    } else if (!this.isEnabled) {
      status = 'stopped';
    } else if (this.isRunning && this.botInfo) {
      status = 'running';
    } else if (this.lastError) {
      status = 'error';
    } else if (this.isRunning) {
      status = 'running';
    }

    return {
      enabled: this.isEnabled,
      isRunning: this.isRunning,
      hasToken: hasValidToken,
      maskedToken,
      adminId: this.adminId,
      botInfo: this.botInfo,
      status,
      lastError: this.lastError
    };
  }

  /**
   * Thử nghiệm token với Telegram API (không cần chạy polling)
   * @param {string} [tokenToTest] 
   */
  async testConnection(tokenToTest) {
    const token = (tokenToTest && tokenToTest.trim()) ? tokenToTest.trim() : this.token;

    if (!token || token.includes('your_telegram_bot_token')) {
      return {
        success: false,
        message: 'Vui lòng cung cấp Telegram Bot Token hợp lệ để kiểm tra.'
      };
    }

    const startTime = Date.now();
    try {
      const testBot = new TelegramBot(token, { polling: false });
      const me = await testBot.getMe();
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        message: `Xác thực thành công với Telegram! Bot: @${me.username} (${me.first_name})`,
        latencyMs,
        bot: {
          id: me.id,
          username: me.username || '',
          firstName: me.first_name || '',
          canJoinGroups: me.can_join_groups
        }
      };
    } catch (err) {
      return {
        success: false,
        message: `Lỗi kết nối Telegram API: ${err.message}`,
        error: err.message
      };
    }
  }

  /**
   * Gửi một thông điệp thử nghiệm tới Admin ID
   * @param {string|number} [targetChatId]
   * @param {string} [customMessage]
   */
  async sendTestNotification(targetChatId, customMessage) {
    const targetId = targetChatId || this.adminId;

    if (!this.bot && (!this.token || this.token.includes('your_telegram_bot_token'))) {
      return {
        success: false,
        message: 'Bot chưa được khởi tạo. Vui lòng cấu hình Token trước.'
      };
    }

    if (!targetId) {
      return {
        success: false,
        message: 'Chưa cấu hình Telegram Admin Chat ID.'
      };
    }

    const activeBot = this.bot || new TelegramBot(this.token, { polling: false });
    const now = new Date().toLocaleString('vi-VN');
    const text = customMessage || (
      `🔔 *[UBUNTU SYSMONITOR - TEST KẾT NỐI]*\n\n` +
      `✅ Xin chào! Đây là tin nhắn thử nghiệm gửi từ giao diện Web Dashboard.\n` +
      `• *Thời gian:* \`${now}\`\n` +
      `• *Trạng thái:* Kết nối ChatOps 1-1 hoàn toàn thông suốt!\n` +
      `• *Admin ID:* \`${targetId}\`\n\n` +
      `_Bạn có thể gõ /help hoặc gửi câu hỏi bất kỳ để điều khiển máy chủ!_`
    );

    try {
      await activeBot.sendMessage(targetId, text, { parse_mode: 'Markdown' });
      return {
        success: true,
        message: `Đã gửi tin nhắn thử nghiệm thành công tới ID: ${targetId}`,
        sentTo: targetId
      };
    } catch (err) {
      return {
        success: false,
        message: `Không thể gửi tin nhắn tới ID ${targetId}: ${err.message}. Hãy chắc chắn bạn đã nhấn START (/start) với Bot trước đó!`,
        error: err.message
      };
    }
  }

  /**
   * Kiểm tra xem người gửi có phải là Admin hợp lệ hay không
   * @param {number|string} fromId 
   * @returns {boolean}
   */
  isAdmin(fromId) {
    if (!this.adminId) return false;
    return String(fromId).trim() === this.adminId;
  }

  /**
   * Lấy lịch sử hội thoại của Chat ID (tối đa 8 lượt gần nhất)
   * @param {string|number} chatId 
   */
  getHistory(chatId) {
    return this.chatHistories.get(String(chatId)) || [];
  }

  /**
   * Lưu tin nhắn vào lịch sử hội thoại
   * @param {string|number} chatId 
   * @param {'user'|'assistant'} role 
   * @param {string} content 
   */
  appendHistory(chatId, role, content) {
    if (!content) return;
    const id = String(chatId);
    const history = this.getHistory(id);
    history.push({ role, content });

    // Giữ tối đa 8 tin nhắn gần nhất để tối ưu token
    if (history.length > 8) {
      history.splice(0, history.length - 8);
    }
    this.chatHistories.set(id, history);
  }

  /**
   * Xóa bộ nhớ ngữ cảnh hội thoại
   * @param {string|number} chatId 
   */
  clearHistory(chatId) {
    this.chatHistories.delete(String(chatId));
  }

  /**
   * Gửi tin nhắn an toàn: Tự động chia nhỏ khi quá 4096 ký tự và fallback plain-text nếu Markdown lỗi
   * @param {number|string} chatId 
   * @param {string} text 
   * @param {object} options 
   */
  async sendMessageSafe(chatId, text, options = {}) {
    if (!this.bot || !text) return;

    const MAX_LENGTH = 3800; // Ngưỡng an toàn nhỏ hơn 4096 ký tự của Telegram
    if (text.length <= MAX_LENGTH) {
      try {
        return await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...options });
      } catch {
        return await this.bot.sendMessage(chatId, text, { ...options });
      }
    }

    // Tự động phân đoạn tin nhắn dài
    const chunks = [];
    let current = text;
    while (current.length > 0) {
      chunks.push(current.substring(0, MAX_LENGTH));
      current = current.substring(MAX_LENGTH);
    }

    for (let i = 0; i < chunks.length; i++) {
      const prefix = chunks.length > 1 ? `*(Phần ${i + 1}/${chunks.length})*\n\n` : '';
      const chunkText = prefix + chunks[i];
      try {
        await this.bot.sendMessage(chatId, chunkText, { parse_mode: 'Markdown', ...options });
      } catch {
        await this.bot.sendMessage(chatId, chunkText, { ...options });
      }
    }
  }

  /**
   * Đăng ký bộ xử lý sự kiện tin nhắn từ Telegram
   */
  registerHandlers() {
    if (!this.bot) return;

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat?.id;
      const fromId = msg.from?.id;
      const text = (msg.text || '').trim();
      const username = msg.from?.username || msg.from?.first_name || 'Admin';

      if (!text || !chatId) return;

      // 🛡️ BẢO MẬT: Chặn mọi người lạ ngay lập tức
      if (!this.isAdmin(fromId)) {
        console.warn(`[Telegram Bot Security] 🛑 TỪ CHỐI truy cập từ User ID: ${fromId} (@${username}).`);
        try {
          await this.bot.sendMessage(
            chatId,
            `⛔ *TRUY CẬP BỊ TỪ CHỐI*\n\nBạn không có quyền điều khiển máy chủ này.\nID của bạn: \`${fromId}\`\n\nVui lòng cấu hình đúng \`TELEGRAM_ADMIN_ID\` trong file \`.env\` hoặc trên giao diện Web Dashboard.`,
            { parse_mode: 'Markdown' }
          );
        } catch {
          // Bỏ qua lỗi gửi tin
        }
        return;
      }

      // 1. Xử lý lệnh: /start hoặc /help
      if (text === '/start' || text === '/help') {
        const welcome = `🤖 *UBUNTU SYSMONITOR - CHATOPS AGENT*\n\nXin chào Quản trị viên *${username}*!\nBot đã sẵn sàng nhận chỉ thị và điều khiển máy chủ an toàn.\n\n📌 *Lệnh nhanh tiện ích:*\n• \`/status\` - Kiểm tra CPU, RAM, Ổ đĩa, Uptime ngay tức khắc\n• \`/news\` - Điểm tin tức công nghệ và thời sự nóng hổi hôm nay\n• \`/clear\` - Xóa lịch sử ngữ cảnh hội thoại\n\n⚡ *Điều khiển bằng giọng văn tự nhiên (God Mode):*\nBạn có thể chat bất kỳ yêu cầu nào như:\n- _"Kiểm tra tải hệ thống và xem có tiến trình nào ngốn RAM không"_\n- _"Có tin gì nóng hôm nay không?"_\n- _"Khởi động lại dịch vụ nginx và kiểm tra log"_\n- _"Dọn dẹp rác bộ nhớ apt và journalctl"_\n\nAgent sẽ tự động gọi Tool Linux hoặc Tool lấy tin và báo cáo kết quả chi tiết cho bạn!`;
        return await this.sendMessageSafe(chatId, welcome);
      }

      // 2. Xử lý lệnh: /status (Xem nhanh chỉ số phần cứng)
      if (text === '/status' || text === '/stats') {
        try {
          const metrics = await systemService.getDynamicMetrics();
          if (!metrics) {
            return await this.sendMessageSafe(chatId, '⚠️ Không thể đọc thông số phần cứng lúc này.');
          }

          const hours = Math.floor(metrics.uptime / 3600);
          const mins = Math.floor((metrics.uptime % 3600) / 60);

          const statusMsg = `📊 *TRẠNG THÁI MÁY CHỦ REALTIME*\n\n` +
            `• *CPU Load:* \`${metrics.cpu.loadPercent}%\`\n` +
            `• *Nhiệt độ CPU:* \`${metrics.cpu.temperature}°C\`\n` +
            `• *RAM:* \`${metrics.memory.usedPercent}%\` (${(metrics.memory.used / (1024 ** 3)).toFixed(1)}GB / ${(metrics.memory.total / (1024 ** 3)).toFixed(1)}GB)\n` +
            `• *Ổ cứng (/):* \`${metrics.disk.usedPercent}%\` (${(metrics.disk.used / (1024 ** 3)).toFixed(1)}GB / ${(metrics.disk.total / (1024 ** 3)).toFixed(1)}GB)\n` +
            `• *Uptime:* \`${hours} giờ ${mins} phút\`\n` +
            `• *Thời gian cập nhật:* \`${new Date().toLocaleTimeString('vi-VN')}\``;

          return await this.sendMessageSafe(chatId, statusMsg);
        } catch (statusErr) {
          return await this.sendMessageSafe(chatId, `❌ Lỗi khi đọc chỉ số: ${statusErr.message}`);
        }
      }

      // 3. Xử lý lệnh: /news hoặc /tintuc (Lấy tin tức nhanh)
      if (text === '/news' || text === '/tintuc') {
        await this.sendMessageSafe(chatId, '📰 *Đang tổng hợp tin tức nóng nhất từ các đầu báo uy tín...*');
        try {
          const newsData = await newsService.fetchNews({ category: 'all', limit: 5 });
          if (!newsData.success || newsData.articles.length === 0) {
            return await this.sendMessageSafe(chatId, '⚠️ Tạm thời không lấy được tin tức RSS.');
          }

          let newsMsg = `📰 *ĐIỂM TIN NÓNG HÔM NAY (${newsData.articles.length} bài)*\n\n`;
          newsData.articles.forEach((art, idx) => {
            newsMsg += `${idx + 1}. *${art.title}* (${art.source})\n`;
            if (art.snippet) newsMsg += `   _${art.snippet.substring(0, 140)}..._\n`;
            if (art.link) newsMsg += `   🔗 [Xem chi tiết](${art.link})\n\n`;
          });

          return await this.sendMessageSafe(chatId, newsMsg);
        } catch (newsErr) {
          return await this.sendMessageSafe(chatId, `❌ Lỗi lấy tin: ${newsErr.message}`);
        }
      }

      // 4. Xử lý lệnh: /clear (Xóa bộ nhớ chat)
      if (text === '/clear' || text === '/reset') {
        this.clearHistory(chatId);
        return await this.sendMessageSafe(chatId, '🧹 *Đã xóa sạch bộ nhớ ngữ cảnh hội thoại!*\nBây giờ chúng ta bắt đầu một phiên làm việc hoàn toàn mới.');
      }

      // 5. Xử lý Mọi Câu Hỏi / Yêu Cầu qua Autonomous AI Agent (God Mode)
      await this.handleAgenticConversation(chatId, text, username);
    });
  }

  /**
   * Xử lý luồng AI Agentic Tool Calling tích hợp Telegram
   * @param {number|string} chatId 
   * @param {string} userText 
   * @param {string} username 
   */
  async handleAgenticConversation(chatId, userText, username) {
    if (!this.bot) return;

    // Gửi tín hiệu typing liên tục trong khi AI đang suy luận
    const typingInterval = setInterval(() => {
      try {
        this.bot.sendChatAction(chatId, 'typing').catch(() => {});
      } catch {
        // ignore
      }
    }, 4500);

    try {
      // 1. Đọc dữ liệu phần cứng hiện thời
      let dynamicMetrics = null;
      try {
        dynamicMetrics = await systemService.getDynamicMetrics();
      } catch {
        // ignore
      }

      const systemMetricsPayload = dynamicMetrics ? {
        cpuLoad: dynamicMetrics.cpu.loadPercent,
        ramUsedPercent: dynamicMetrics.memory.usedPercent,
        temperature: dynamicMetrics.cpu.temperature,
        uptimeSeconds: dynamicMetrics.uptime
      } : null;

      // 2. Lấy lịch sử hội thoại của người dùng này
      const history = this.getHistory(chatId);

      // 3. Callback thông báo tiến độ từng bước thực thi câu lệnh qua Telegram
      const onStepProgress = async ({ type, stepIndex, command, executionMode, toolResult }) => {
        if (type === 'start') {
          await this.sendMessageSafe(
            chatId,
            `⚙️ *[Bước ${stepIndex}]* Đang thực thi:\n\`${command}\``
          );
        } else if (type === 'finish' && toolResult) {
          const statusIcon = toolResult.success ? '✅' : '❌';
          const exitInfo = `Exit: ${toolResult.exitCode !== undefined ? toolResult.exitCode : '0'}`;
          await this.sendMessageSafe(
            chatId,
            `${statusIcon} *[Bước ${stepIndex} Hoàn tất - ${exitInfo}]*\n\`${command}\``
          );
        }
      };

      console.log(`[Telegram ChatOps] 📩 Nhận tin nhắn từ Admin @${username}: "${userText.substring(0, 80)}"`);

      // 4. Kích hoạt Agentic Loop với quyền AUTO-PILOT (God Mode)
      const aiResponse = await aiService.askAssistant({
        userMessage: userText,
        terminalContext: '',
        systemMetrics: systemMetricsPayload,
        executionMode: 'auto_pilot',
        history: history,
        onStepProgress: onStepProgress
      });

      clearInterval(typingInterval);

      // 5. Chuẩn bị nội dung báo cáo trả về cho Telegram
      let reportText = '';

      // Nếu có các bước đã thực thi, tạo danh sách tóm tắt
      if (aiResponse.steps && aiResponse.steps.length > 0) {
        reportText += `⚡ *BÁO CÁO THỰC THI (${aiResponse.steps.length} BƯỚC)*\n`;
        aiResponse.steps.forEach((step, idx) => {
          const icon = step.toolResult?.success ? '✅' : '❌';
          reportText += `${idx + 1}. ${icon} \`${step.command}\`\n`;
        });
        reportText += `\n`;
      }

      // Đính kèm câu trả lời của AI
      reportText += aiResponse.reply || 'Đã xử lý xong yêu cầu của bạn.';

      // 6. Lưu vào bộ nhớ ngữ cảnh hội thoại
      this.appendHistory(chatId, 'user', userText);
      this.appendHistory(chatId, 'assistant', aiResponse.reply || '');

      // 7. Gửi câu trả lời an toàn cho Telegram
      await this.sendMessageSafe(chatId, reportText);
    } catch (err) {
      clearInterval(typingInterval);
      console.error('[Telegram ChatOps Error]:', err);
      await this.sendMessageSafe(
        chatId,
        `❌ *Đã xảy ra lỗi khi xử lý yêu cầu:*\n\`${err.message}\``
      );
    }
  }

  /**
   * Trả về instance của bot
   */
  getBot() {
    return this.bot;
  }
}

module.exports = new TelegramService();
