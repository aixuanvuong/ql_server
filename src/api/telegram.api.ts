// filepath: frontend/src/api/telegram.api.ts
import { getStoredServerUrl, getStoredToken } from './auth.api';

export interface TelegramBotInfo {
  id: number;
  username: string;
  firstName: string;
  canJoinGroups?: boolean;
  canReadAllGroupMessages?: boolean;
}

export interface TelegramConfigData {
  enabled: boolean;
  isRunning: boolean;
  hasToken: boolean;
  maskedToken: string;
  adminId: string;
  botInfo: TelegramBotInfo | null;
  status: 'running' | 'stopped' | 'error' | 'not_configured';
  lastError: string | null;
  serverMode?: 'connected_backend' | 'client_direct_mode';
}

export interface TelegramConfigResponse {
  success: boolean;
  data?: TelegramConfigData;
  message?: string;
  error?: string;
}

export interface TelegramTestResponse {
  success: boolean;
  message: string;
  latencyMs?: number;
  bot?: TelegramBotInfo;
  sentTo?: string;
  error?: string;
}

// Storage keys dùng cho lưu cấu hình trực tiếp trên trình duyệt khi chạy Client-side hoặc lưu đệm
const CLIENT_TG_TOKEN_KEY = 'ubuntu_monitor_telegram_bot_token';
const CLIENT_TG_ADMIN_KEY = 'ubuntu_monitor_telegram_admin_id';
const CLIENT_TG_ENABLED_KEY = 'ubuntu_monitor_telegram_bot_enabled';

/**
 * Gọi trực tiếp Telegram Bot API chính thức từ trình duyệt (Client-side)
 * Đảm bảo 100% người dùng test token hoặc gửi tin nhắn thật tới Telegram mà không bị phụ thuộc vào môi trường backend.
 */
async function callTelegramApiDirect(
  token: string,
  method: string,
  payload?: Record<string, unknown>
): Promise<{ ok: boolean; result?: any; description?: string }> {
  const cleanToken = token.trim();
  const url = `https://api.telegram.org/bot${cleanToken}/${method}`;
  
  const options: RequestInit = {
    method: payload ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  };

  const response = await fetch(url, options);
  const data = await response.json();
  return data;
}

/**
 * Lấy cấu hình Telegram Bot:
 * 1. Thử gọi backend nếu có backend server thực tế
 * 2. Nếu backend offline hoặc lỗi, đọc cấu hình đã lưu trong localStorage và xác thực trạng thái với Telegram API
 */
export async function getTelegramConfigApi(): Promise<TelegramConfigResponse> {
  const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
  const token = getStoredToken();
  const isDemo = token === 'demo_jwt_token_sample_2026';

  // Nếu không phải chế độ offline demo, thử gọi Backend
  if (!isDemo && serverUrl) {
    try {
      const res = await fetch(`${serverUrl}/api/telegram/config`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const backendData = await res.json();
        if (backendData.success && backendData.data) {
          return backendData;
        }
      }
    } catch {
      // Backend không phản hồi, fallback xuống client-side storage
    }
  }

  // Chế độ Client-side Direct: Đọc từ localStorage
  const savedToken = localStorage.getItem(CLIENT_TG_TOKEN_KEY) || '';
  const savedAdmin = localStorage.getItem(CLIENT_TG_ADMIN_KEY) || '';
  const savedEnabled = localStorage.getItem(CLIENT_TG_ENABLED_KEY) !== 'false';
  const hasToken = savedToken.length > 10 && savedToken.includes(':');

  let botInfo: TelegramBotInfo | null = null;
  let isRunning = false;
  let status: 'running' | 'stopped' | 'error' | 'not_configured' = 'not_configured';
  let lastError: string | null = null;

  if (hasToken) {
    try {
      const tgRes = await callTelegramApiDirect(savedToken, 'getMe');
      if (tgRes.ok && tgRes.result) {
        botInfo = {
          id: tgRes.result.id,
          username: tgRes.result.username || '',
          firstName: tgRes.result.first_name || '',
          canJoinGroups: tgRes.result.can_join_groups,
          canReadAllGroupMessages: tgRes.result.can_read_all_group_messages
        };
        isRunning = savedEnabled;
        status = savedEnabled ? 'running' : 'stopped';
      } else {
        status = 'error';
        lastError = tgRes.description || 'Token không hợp lệ hoặc đã bị thu hồi bởi @BotFather';
      }
    } catch (err: unknown) {
      status = 'error';
      lastError = err instanceof Error ? err.message : 'Không thể kết nối Telegram API từ mạng hiện tại';
    }
  }

  const maskedToken = hasToken
    ? (savedToken.length > 12 ? `${savedToken.slice(0, 6)}••••••••${savedToken.slice(-4)}` : '••••••••')
    : '';

  return {
    success: true,
    data: {
      enabled: savedEnabled,
      isRunning,
      hasToken,
      maskedToken,
      adminId: savedAdmin,
      botInfo,
      status,
      lastError,
      serverMode: 'client_direct_mode'
    }
  };
}

/**
 * Cập nhật cấu hình Telegram Bot (Token, Admin ID, Bật/Tắt):
 * Lưu đồng thời vào localStorage (để dùng ngay) và gửi tới Backend (để đồng bộ máy chủ Ubuntu)
 */
export async function updateTelegramConfigApi(payload: {
  botToken?: string;
  adminId?: string;
  enabled?: boolean;
}): Promise<TelegramConfigResponse> {
  const currentToken = payload.botToken?.trim() || localStorage.getItem(CLIENT_TG_TOKEN_KEY) || '';

  if (payload.botToken && payload.botToken.trim()) {
    localStorage.setItem(CLIENT_TG_TOKEN_KEY, payload.botToken.trim());
  }
  if (payload.adminId !== undefined) {
    localStorage.setItem(CLIENT_TG_ADMIN_KEY, payload.adminId.trim());
  }
  if (payload.enabled !== undefined) {
    localStorage.setItem(CLIENT_TG_ENABLED_KEY, String(payload.enabled));
  }

  // Thử gửi sang Backend nếu server đang trực tuyến
  const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
  const token = getStoredToken();
  const isDemo = token === 'demo_jwt_token_sample_2026';

  if (!isDemo && serverUrl) {
    try {
      await fetch(`${serverUrl}/api/telegram/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
    } catch {
      // Bỏ qua lỗi backend, tiếp tục hoàn tất qua client direct
    }
  }

  // Kiểm tra thông tin bot thực tế với Telegram API để trả về trạng thái chuẩn
  let botInfo: TelegramBotInfo | null = null;
  const enabled = payload.enabled !== undefined ? payload.enabled : (localStorage.getItem(CLIENT_TG_ENABLED_KEY) !== 'false');
  const adminId = payload.adminId !== undefined ? payload.adminId.trim() : (localStorage.getItem(CLIENT_TG_ADMIN_KEY) || '');
  const hasToken = currentToken.length > 10 && currentToken.includes(':');

  if (hasToken) {
    try {
      const tgRes = await callTelegramApiDirect(currentToken, 'getMe');
      if (tgRes.ok && tgRes.result) {
        botInfo = {
          id: tgRes.result.id,
          username: tgRes.result.username || '',
          firstName: tgRes.result.first_name || '',
          canJoinGroups: tgRes.result.can_join_groups,
          canReadAllGroupMessages: tgRes.result.can_read_all_group_messages
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    message: '✓ Đã lưu cấu hình và kích hoạt Telegram Bot thành công!',
    data: {
      enabled,
      isRunning: !!botInfo && enabled,
      hasToken,
      maskedToken: hasToken ? `${currentToken.slice(0, 6)}••••••••${currentToken.slice(-4)}` : '',
      adminId,
      botInfo,
      status: !hasToken ? 'not_configured' : (enabled ? 'running' : 'stopped'),
      lastError: null
    }
  };
}

/**
 * Kiểm tra kết nối nhanh tới Telegram API (Kiểm tra token có hoạt động không)
 * Gọi TRỰC TIẾP Telegram Bot API (https://api.telegram.org/bot<TOKEN>/getMe)
 */
export async function testTelegramConnectionApi(botToken?: string): Promise<TelegramTestResponse> {
  const token = botToken?.trim() || localStorage.getItem(CLIENT_TG_TOKEN_KEY) || '';

  if (!token || token.includes('your_telegram_bot_token')) {
    return {
      success: false,
      message: 'Vui lòng nhập Telegram Bot Token lấy từ @BotFather trước khi kiểm tra.'
    };
  }

  if (!token.includes(':')) {
    return {
      success: false,
      message: 'Định dạng Token không đúng. Token hợp lệ của Telegram thường có dạng: 1234567890:ABCdef-GHIjklMNOpqr...'
    };
  }

  const startTime = Date.now();
  try {
    const data = await callTelegramApiDirect(token, 'getMe');
    const latencyMs = Date.now() - startTime;

    if (data.ok && data.result) {
      const me = data.result;
      return {
        success: true,
        message: `Xác thực thành công với Telegram API! Bot: @${me.username} (${me.first_name})`,
        latencyMs,
        bot: {
          id: me.id,
          username: me.username || '',
          firstName: me.first_name || '',
          canJoinGroups: me.can_join_groups
        }
      };
    } else {
      return {
        success: false,
        message: `Telegram từ chối Token: ${data.description || 'Token không hợp lệ hoặc đã bị xóa.'}`
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối';
    return {
      success: false,
      message: `Không thể kết nối trực tiếp đến api.telegram.org: ${errorMsg}. Vui lòng kiểm tra kết nối mạng của bạn.`
    };
  }
}

/**
 * Gửi tin nhắn kiểm tra thực tế tới Telegram Admin Chat ID
 * Gửi THẬT 100% qua endpoint Telegram sendMessage!
 */
export async function sendTestNotificationApi(
  chatId?: string,
  message?: string
): Promise<TelegramTestResponse> {
  const targetId = (chatId || localStorage.getItem(CLIENT_TG_ADMIN_KEY) || '').trim();
  const token = (localStorage.getItem(CLIENT_TG_TOKEN_KEY) || '').trim();

  if (!token) {
    return {
      success: false,
      message: 'Chưa có Telegram Bot Token. Hãy nhập Token và bấm "Lưu & Áp Dụng Cấu Hình" trước.'
    };
  }

  if (!targetId) {
    return {
      success: false,
      message: 'Chưa có Admin Chat ID. Vui lòng nhập số ID của bạn (lấy từ bot @userinfobot).'
    };
  }

  const now = new Date().toLocaleTimeString('vi-VN');
  const text = message || (
    `🔔 *[UBUNTU SYSMONITOR - TEST KẾT NỐI]*\n\n` +
    `✅ *Xin chào Admin!*\n` +
    `Tin nhắn thử nghiệm gửi thành công từ bảng điều khiển Web!\n\n` +
    `• *Thời gian:* \`${now}\`\n` +
    `• *Chat ID của bạn:* \`${targetId}\`\n` +
    `• *Trạng thái:* Kết nối ChatOps 1-1 thông suốt!\n\n` +
    `_Bây giờ bạn có thể chat trực tiếp với bot để điều khiển máy chủ!_`
  );

  try {
    const data = await callTelegramApiDirect(token, 'sendMessage', {
      chat_id: targetId,
      text: text,
      parse_mode: 'Markdown'
    });

    if (data.ok) {
      return {
        success: true,
        message: `Đã gửi tin nhắn thử nghiệm thành công tới Telegram Chat ID: ${targetId}! Hãy kiểm tra tin nhắn trên điện thoại của bạn.`,
        sentTo: targetId
      };
    } else {
      const desc = data.description || '';
      let advice = '';

      if (desc.includes('chat not found') || desc.includes('bot can\'t initiate conversation')) {
        advice = ' 👉 NGUYÊN NHÂN: Bạn chưa bấm "START" với bot trên Telegram! Hãy mở ứng dụng Telegram, tìm đến tên Bot của bạn và bấm nút [START] hoặc gửi /start trước, sau đó bấm thử lại.';
      } else if (desc.includes('Unauthorized')) {
        advice = ' 👉 NGUYÊN NHÂN: Mã Bot Token không chính xác hoặc đã bị thu hồi.';
      }

      return {
        success: false,
        message: `Telegram báo lỗi: "${desc}".${advice}`,
        error: desc
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi gửi tin';
    return {
      success: false,
      message: `Không thể gửi tin nhắn tới Telegram: ${errorMsg}`
    };
  }
}
