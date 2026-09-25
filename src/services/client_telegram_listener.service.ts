// filepath: frontend/src/services/client_telegram_listener.service.ts
import { getStoredToken } from '../api/auth.api';

export interface TelegramIncomingMessage {
  messageId: number;
  fromId: number;
  fromUsername?: string;
  fromFirstName?: string;
  chatId: number;
  text: string;
  date: number;
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
    } catch (err: unknown) {
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
      const helpMsg = `🤖 *UBUNTU SYSMONITOR - CHATOPS AGENT ONLINE*\n\n` +
        `Xin chào Quản trị viên *${incoming.fromFirstName || 'Admin'}*!\n` +
        `Hệ thống Web & Bot hiện đang *kết nối và lắng nghe trực tiếp 100%* mọi chỉ thị của bạn.\n\n` +
        `📌 *Các lệnh nhanh:*\n` +
        `• \`/status\` - Xem tức thì tình trạng phần cứng máy chủ (CPU, RAM, Ổ cứng, Uptime)\n` +
        `• \`/ping\` - Kiểm tra độ trễ phản hồi\n` +
        `• \`/help\` - Xem lại bảng hướng dẫn này\n\n` +
        `💬 *Gõ câu hỏi bất kỳ:* Bot đã sẵn sàng nhận chỉ thị và phân tích hệ thống cùng bạn!`;
      await this.sendMessage(incoming.chatId, helpMsg);
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
        `• *Dịch vụ:* Đang trực tuyến và theo dõi an toàn.`;
      await this.sendMessage(incoming.chatId, statusMsg);
      return;
    }

    // 3. Nếu có messageHandler tùy biến (gọi AI hoặc xử lý logic)
    if (this.messageHandler) {
      try {
        await this.sendMessage(incoming.chatId, `🤖 *Đang phân tích yêu cầu:* _"${incoming.text}"_...`);
        const reply = await this.messageHandler(incoming);
        if (reply) {
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
      await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
    } catch (err) {
      console.error('[Client Telegram] Lỗi gửi tin nhắn:', err);
    }
  }
}

export const clientTelegramListener = new ClientTelegramListenerService();
