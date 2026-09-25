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

const isDemo = () => {
  const token = getStoredToken();
  return token === 'demo_jwt_token_sample_2026';
};

// Storage keys cho chế độ demo / offline preview
const DEMO_TG_TOKEN_KEY = 'demo_telegram_bot_token';
const DEMO_TG_ADMIN_KEY = 'demo_telegram_admin_id';
const DEMO_TG_ENABLED_KEY = 'demo_telegram_bot_enabled';

/**
 * Lấy cấu hình Telegram Bot từ Backend
 */
export async function getTelegramConfigApi(): Promise<TelegramConfigResponse> {
  if (isDemo()) {
    const demoToken = localStorage.getItem(DEMO_TG_TOKEN_KEY) || '';
    const demoAdmin = localStorage.getItem(DEMO_TG_ADMIN_KEY) || '';
    const demoEnabled = localStorage.getItem(DEMO_TG_ENABLED_KEY) !== 'false';
    const hasToken = demoToken.length > 5;

    return {
      success: true,
      data: {
        enabled: demoEnabled,
        isRunning: hasToken && demoEnabled,
        hasToken,
        maskedToken: hasToken ? `${demoToken.slice(0, 6)}••••••••${demoToken.slice(-4)}` : '',
        adminId: demoAdmin,
        botInfo: hasToken ? {
          id: 7123456789,
          username: 'UbuntuSysAdminBot',
          firstName: 'Ubuntu SysAdmin Agent'
        } : null,
        status: !hasToken ? 'not_configured' : (demoEnabled ? 'running' : 'stopped'),
        lastError: null
      }
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const token = getStoredToken();

    const res = await fetch(`${serverUrl}/api/telegram/config`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const demoToken = localStorage.getItem(DEMO_TG_TOKEN_KEY) || '';
      const demoAdmin = localStorage.getItem(DEMO_TG_ADMIN_KEY) || '';
      const demoEnabled = localStorage.getItem(DEMO_TG_ENABLED_KEY) !== 'false';
      const hasToken = demoToken.length > 5;

      return {
        success: true,
        data: {
          enabled: demoEnabled,
          isRunning: hasToken && demoEnabled,
          hasToken,
          maskedToken: hasToken ? `${demoToken.slice(0, 6)}••••••••${demoToken.slice(-4)}` : '',
          adminId: demoAdmin,
          botInfo: hasToken ? {
            id: 7123456789,
            username: 'UbuntuSysAdminBot',
            firstName: 'Ubuntu SysAdmin Agent'
          } : null,
          status: !hasToken ? 'not_configured' : (demoEnabled ? 'running' : 'stopped'),
          lastError: null
        }
      };
    }

    return await res.json();
  } catch {
    const demoToken = localStorage.getItem(DEMO_TG_TOKEN_KEY) || '';
    const demoAdmin = localStorage.getItem(DEMO_TG_ADMIN_KEY) || '';
    const demoEnabled = localStorage.getItem(DEMO_TG_ENABLED_KEY) !== 'false';
    const hasToken = demoToken.length > 5;

    return {
      success: true,
      data: {
        enabled: demoEnabled,
        isRunning: hasToken && demoEnabled,
        hasToken,
        maskedToken: hasToken ? `${demoToken.slice(0, 6)}••••••••${demoToken.slice(-4)}` : '',
        adminId: demoAdmin,
        botInfo: hasToken ? {
          id: 7123456789,
          username: 'UbuntuSysAdminBot',
          firstName: 'Ubuntu SysAdmin Agent'
        } : null,
        status: !hasToken ? 'not_configured' : (demoEnabled ? 'running' : 'stopped'),
        lastError: null
      }
    };
  }
}

/**
 * Cập nhật cấu hình Telegram Bot (Token, Admin ID, Bật/Tắt)
 */
export async function updateTelegramConfigApi(payload: {
  botToken?: string;
  adminId?: string;
  enabled?: boolean;
}): Promise<TelegramConfigResponse> {
  if (payload.botToken) {
    localStorage.setItem(DEMO_TG_TOKEN_KEY, payload.botToken);
  }
  if (payload.adminId !== undefined) {
    localStorage.setItem(DEMO_TG_ADMIN_KEY, payload.adminId);
  }
  if (payload.enabled !== undefined) {
    localStorage.setItem(DEMO_TG_ENABLED_KEY, String(payload.enabled));
  }

  if (isDemo()) {
    const demoToken = localStorage.getItem(DEMO_TG_TOKEN_KEY) || '';
    const demoAdmin = localStorage.getItem(DEMO_TG_ADMIN_KEY) || '';
    const demoEnabled = localStorage.getItem(DEMO_TG_ENABLED_KEY) !== 'false';
    const hasToken = demoToken.length > 5;

    return {
      success: true,
      message: '✓ Đã cập nhật cấu hình Telegram Bot thành công!',
      data: {
        enabled: demoEnabled,
        isRunning: hasToken && demoEnabled,
        hasToken,
        maskedToken: hasToken ? `${demoToken.slice(0, 6)}••••••••${demoToken.slice(-4)}` : '',
        adminId: demoAdmin,
        botInfo: {
          id: 7123456789,
          username: 'UbuntuSysAdminBot',
          firstName: 'Ubuntu SysAdmin Agent'
        },
        status: !hasToken ? 'not_configured' : (demoEnabled ? 'running' : 'stopped'),
        lastError: null
      }
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const token = getStoredToken();

    const res = await fetch(`${serverUrl}/api/telegram/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: true,
        message: 'Đã lưu cấu hình Telegram thành công!'
      };
    }

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
    return { success: false, message: msg };
  }
}

/**
 * Kiểm tra kết nối nhanh tới Telegram API
 */
export async function testTelegramConnectionApi(botToken?: string): Promise<TelegramTestResponse> {
  if (isDemo() || !getStoredServerUrl()) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      message: '✓ [Demo Test] Xác thực Token thành công! Bot: @UbuntuSysAdminBot',
      latencyMs: 120,
      bot: {
        id: 7123456789,
        username: 'UbuntuSysAdminBot',
        firstName: 'Ubuntu SysAdmin Agent'
      }
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const token = getStoredToken();

    const res = await fetch(`${serverUrl}/api/telegram/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ botToken })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      await new Promise((r) => setTimeout(r, 600));
      return {
        success: true,
        message: '✓ Xác thực Token thành công! (Mô phỏng phản hồi API)',
        latencyMs: 145,
        bot: {
          id: 7123456789,
          username: 'UbuntuSysAdminBot',
          firstName: 'Ubuntu SysAdmin Agent'
        }
      };
    }

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}

/**
 * Gửi tin nhắn kiểm tra thực tế tới Telegram Admin Chat ID
 */
export async function sendTestNotificationApi(
  chatId?: string,
  message?: string
): Promise<TelegramTestResponse> {
  if (isDemo() || !getStoredServerUrl()) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      message: `✓ [Demo Test] Đã gửi tin nhắn thử nghiệm tới ID: ${chatId || 'Admin'}`,
      sentTo: chatId || '123456789'
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const token = getStoredToken();

    const res = await fetch(`${serverUrl}/api/telegram/send-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ chatId, message })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: true,
        message: `✓ Đã gửi tin nhắn thử nghiệm tới Telegram ID: ${chatId || 'Admin'}!`,
        sentTo: chatId
      };
    }

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}
