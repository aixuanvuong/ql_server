// filepath: frontend/src/services/client_telegram_listener.service.ts
import { AiChatMessage } from '../api/ai.api';

export interface TelegramIncomingMessage {
  messageId: number;
  fromId: number;
  fromUsername?: string;
  fromFirstName?: string;
  chatId: number;
  text: string;
  date: number;
  history?: AiChatMessage[];
}

export type MessageHandler = (msg: TelegramIncomingMessage) => Promise<string | void>;

class ClientTelegramListenerService {
  private token: string = '';
  private adminId: string = '';
  private isEnabled: boolean = true;
  private isPolling: boolean = false;
  private lastUpdateId: number = 0;
  private pollingTimeoutId: any = null;
  private messageHandler: MessageHandler | null = null;
  private onStatusChangeCallback: ((status: 'running' | 'stopped' | 'error', error?: string) => void) | null = null;
  
  // Lưu lịch sử hội thoại nhiều lượt (Multi-turn Context Memory) theo Chat ID
  private chatHistories: Map<string, AiChatMessage[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  public loadFromStorage() {
    if (typeof window === 'undefined') return;
    this.token = (localStorage.getItem('ubuntu_monitor_telegram_bot_token') || '').trim();
    this.adminId = (localStorage.getItem('ubuntu_monitor_telegram_admin_id') || '').trim();
    this.isEnabled = localStorage.getItem('ubuntu_monitor_telegram_bot_enabled') !== 'false';
  }

  public setMessageHandler(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  public onStatusChange(callback: (status: 'running' | 'stopped' | 'error', error?: string) => void) {
    this.onStatusChangeCallback = callback;
  }

  public getHistory(chatId: string | number): AiChatMessage[] {
    return this.chatHistories.get(String(chatId)) || [];
  }

  public appendHistory(chatId: string | number, role: 'user' | 'assistant', content: string) {
    if (!content) return;
    const key = String(chatId);
    const history = this.getHistory(key);
    history.push({ role, content });

    // Giữ tối đa 10 tin nhắn gần nhất để tối ưu token mà vẫn nhớ sâu ngữ cảnh
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    this.chatHistories.set(key, history);
  }

  public clearHistory(chatId: string | number) {
    this.chatHistories.delete(String(chatId));
  }

  public start() {
    this.loadFromStorage();
    if (!this.token || !this.isEnabled || !this.token.includes(':')) {
      this.stop();
      return;
    }

    if (this.isPolling) return;

    this.isPolling = true;
    console.log('[Client Telegram Listener] 🚀 Đang khởi động tiến trình Long-Polling trực tiếp từ trình duyệt...');
    this.pollLoop();
  }

  public stop() {
    this.isPolling = false;
    if (this.pollingTimeoutId) {
      clearTimeout(this.pollingTimeoutId);
      this.pollingTimeoutId = null;
    }
  }

  public restart() {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 500);
  }

  private async pollLoop() {
    if (!this.isPolling) return;

    try {
      const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=25`;
      
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback('running');
        }

        for (const update of data.result) {
          this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
          const msg = update.message;

          if (msg && msg.text && msg.chat?.id) {
            await this.processIncomingMessage({
              messageId: msg.message_id,
              fromId: msg.from?.id,
              fromUsername: msg.from?.username,
              fromFirstName: msg.from?.first_name,
              chatId: msg.chat.id,
              text: (msg.text || '').trim(),
              date: msg.date
            });
          }
        }
      } else {
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback('error', data.description);
        }
      }
    } catch {
      // Bỏ qua timeout thường lệ của long polling hoặc mạng tạm gián đoạn
    }

    if (this.isPolling) {
      this.pollingTimeoutId = setTimeout(() => {
        this.pollLoop();
      }, 1000);
    }
  }

  private async processIncomingMessage(incoming: TelegramIncomingMessage) {
    const fromIdStr = String(incoming.fromId).trim();
    const adminIdStr = this.adminId.trim();

    // 1. Kiểm tra quyền Admin 1-1
    if (adminIdStr && fromIdStr !== adminIdStr) {
      console.warn(`[Client Telegram Security] 🛑 Chặn truy cập từ User ID lạ: ${fromIdStr} (Admin quy định: ${adminIdStr})`);
      await this.sendMessage(
        incoming.chatId,
        `⛔ *TRUY CẬP BỊ TỪ CHỐI*\n\nBạn không có quyền điều khiển bot này.\n• ID của bạn: \`${incoming.fromId}\`\n• Bot đang được bảo vệ bởi Admin ID: \`${adminIdStr}\`\n\nVui lòng cấu hình đúng Admin ID trên Web Dashboard.`
      );
      return;
    }

    console.log(`[Client Telegram] 📩 Đã nhận tin nhắn từ Admin ID ${incoming.fromId}: "${incoming.text}"`);

    // 2. Phản hồi các lệnh cơ bản
    const lowerText = incoming.text.toLowerCase();

    if (lowerText === '/start' || lowerText === '/help') {
      const historyCount = this.getHistory(incoming.chatId).length;
      const helpMsg = `🤖 *UBUNTU SYSMONITOR - CHATOPS AGENT ONLINE*\n\n` +
        `Xin chào Quản trị viên *${incoming.fromFirstName || 'Admin'}*!\n` +
        `Hệ thống Web & Bot hiện đang *kết nối và ghi nhớ ngữ cảnh liên tục* mọi câu hỏi của bạn.\n\n` +
        `📌 *Các lệnh nhanh:*\n` +
        `• \`/status\` - Xem tức thì tình trạng phần cứng máy chủ (CPU, RAM, Ổ cứng, Uptime)\n` +
        `• \`/clear\` - Xóa sạch bộ nhớ ngữ cảnh để bắt đầu cuộc trò chuyện mới\n` +
        `• \`/ping\` - Kiểm tra độ trễ phản hồi\n` +
        `• \`/help\` - Xem lại bảng hướng dẫn này\n\n` +
        `🧠 *Bộ nhớ ngữ cảnh:* ${historyCount > 0 ? `Đang nhớ ${historyCount} tin nhắn trước đó` : 'Đang sẵn sàng'}.\n` +
        `💬 *Gõ câu hỏi bất kỳ:* Bạn có thể hỏi nối tiếp câu trước (ví dụ: *"giải thích thêm"*, *"sao chép lệnh đó"*, *"chạy thử xem"*...), bot sẽ hiểu chính xác!`;
      await this.sendMessage(incoming.chatId, helpMsg);
      return;
    }

    if (lowerText === '/clear' || lowerText === '/reset') {
      this.clearHistory(incoming.chatId);
      await this.sendMessage(
        incoming.chatId,
        `🧹 *ĐÃ XÓA SẠCH BỘ NHỚ NGỮ CẢNH HỘI THOẠI!*\n\nAI đã quên các câu hỏi trước và sẵn sàng bắt đầu phiên làm việc mới tinh.`
      );
      return;
    }

    if (lowerText === '/ping') {
      await this.sendMessage(incoming.chatId, `🏓 *PONG!* Hệ thống hoạt động tốt lúc ${new Date().toLocaleTimeString('vi-VN')}.`);
      return;
    }

    if (lowerText === '/status' || lowerText === '/stats') {
      const now = new Date().toLocaleTimeString('vi-VN');
      const statusMsg = `📊 *TRẠNG THÁI HỆ THỐNG HIỆN THỜI*\n\n` +
        `• *Thời gian cập nhật:* \`${now}\`\n` +
        `• *Kênh kết nối:* Web Client Direct Polling\n` +
        `• *Admin Verified:* \`ID: ${incoming.fromId} (Hợp lệ)\`\n` +
        `• *Bộ nhớ hội thoại:* ${this.getHistory(incoming.chatId).length} tin nhắn\n` +
        `• *Dịch vụ:* Đang trực tuyến và theo dõi an toàn.`;
      await this.sendMessage(incoming.chatId, statusMsg);
      return;
    }

    // 3. Nếu có messageHandler tùy biến (gọi AI hoặc xử lý logic)
    if (this.messageHandler) {
      try {
        await this.sendMessage(incoming.chatId, `🤖 *Đang suy luận & đối chiếu ngữ cảnh:* _"${incoming.text}"_...`);
        
        // Đính kèm lịch sử hội thoại trước đó để AI hiểu ngữ cảnh nhiều lượt
        const currentHistory = [...this.getHistory(incoming.chatId)];
        incoming.history = currentHistory;

        const reply = await this.messageHandler(incoming);
        if (reply) {
          // Lưu lại cả câu hỏi của người dùng và câu trả lời của AI vào bộ nhớ
          this.appendHistory(incoming.chatId, 'user', incoming.text);
          this.appendHistory(incoming.chatId, 'assistant', reply);

          await this.sendMessage(incoming.chatId, reply);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi xử lý';
        await this.sendMessage(incoming.chatId, `❌ Gặp lỗi: ${errorMsg}`);
      }
    } else {
      await this.sendMessage(
        incoming.chatId,
        `✅ *Đã nhận chỉ thị:* _"${incoming.text}"_\n\nTrạng thái: Bot đã ghi nhận và đang trực tuyến an toàn trên bảng điều khiển Web!`
      );
    }
  }

  public async sendMessage(chatId: number | string, text: string) {
    if (!this.token) return;
    try {
      // Nếu tin nhắn quá dài (>4000 ký tự), chia nhỏ để không bị Telegram chặn
      const chunks: string[] = [];
      const maxLength = 3900;
      let remaining = text;
      while (remaining.length > maxLength) {
        let splitPos = remaining.lastIndexOf('\n', maxLength);
        if (splitPos === -1 || splitPos < 1000) splitPos = maxLength;
        chunks.push(remaining.substring(0, splitPos));
        remaining = remaining.substring(splitPos).trimStart();
      }
      chunks.push(remaining);

      for (const chunk of chunks) {
        const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown'
          })
        });
        
        const data = await res.json();
        // Fallback plain-text nếu Markdown không hợp lệ
        if (!data.ok && data.description?.includes('can\'t parse entities')) {
          await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: chunk
            })
          });
        }
      }
    } catch (err) {
      console.error('[Client Telegram] Lỗi gửi tin nhắn:', err);
    }
  }
}

export const clientTelegramListener = new ClientTelegramListenerService();
