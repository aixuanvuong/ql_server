// filepath: frontend/src/api/auth.api.ts
import { AuthUser } from '../types/system.types';

const TOKEN_KEY = 'ubuntu_monitor_token';
const SERVER_URL_KEY = 'ubuntu_monitor_server_url';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getStoredServerUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    const isHttps = window.location.protocol === 'https:';
    const isDevPort = origin.includes(':3000') || origin.includes(':5173');

    const stored = localStorage.getItem(SERVER_URL_KEY);
    // Nếu đang truy cập qua HTTPS (ví dụ Cloudflare Tunnel) hoặc domain thực tế:
    // Tự động bỏ qua địa chỉ IP nội bộ http://192.168.* hoặc http://localhost cũ đã lưu trong máy
    if (stored) {
      const isStoredLocal = stored.includes('192.168.') || stored.includes('localhost') || stored.includes('127.0.0.1') || stored.startsWith('http://10.') || stored.startsWith('http://172.');
      if (isHttps && isStoredLocal) {
        // Tránh lỗi Mixed Content chặn truy cập từ xa
        localStorage.setItem(SERVER_URL_KEY, origin);
        return origin;
      }
      return stored;
    }

    if (!isDevPort) {
      return origin;
    }
  }

  const stored = localStorage.getItem(SERVER_URL_KEY);
  if (stored) return stored;
  return (import.meta.env.VITE_API_URL as string) || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
};

export const setStoredServerUrl = (url: string): void => {
  localStorage.setItem(SERVER_URL_KEY, url);
};

export async function loginUser(
  serverUrl: string,
  credentials: { username: string; password: string }
): Promise<{ success: boolean; token?: string; user?: AuthUser; message?: string }> {
  try {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    if (response.ok && data.success) {
      setStoredToken(data.token);
      setStoredServerUrl(cleanUrl);
      return { success: true, token: data.token, user: data.user };
    }
    return { success: false, message: data.message || 'Đăng nhập không thành công.' };
  } catch (error: unknown) {
    // Dự phòng chế độ Offline / Demo nếu người dùng muốn trải nghiệm trước khi kết nối Ubuntu thực tế
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      const demoToken = 'demo_jwt_token_sample_2026';
      setStoredToken(demoToken);
      return {
        success: true,
        token: demoToken,
        user: { username: 'admin', role: 'admin' },
        message: 'Đăng nhập thành công (Chế độ Trực quan)!'
      };
    }
    const errMessage = error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ';
    return {
      success: false,
      message: `Lỗi kết nối Backend (${errMessage}). Kiểm tra lại URL máy chủ hoặc đăng nhập với admin / admin123.`
    };
  }
}

export async function changeCredentialsApi(
  serverUrl: string,
  token: string,
  credentials: { currentPassword: string; newUsername?: string; newPassword: string }
): Promise<{ success: boolean; token?: string; user?: AuthUser; message?: string }> {
  try {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/api/auth/change-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(credentials)
    });

    const resData = await response.json();
    if (response.ok && resData.success) {
      if (resData.token) {
        setStoredToken(resData.token);
      }
      return { success: true, token: resData.token, user: resData.user, message: resData.message };
    }
    return { success: false, message: resData.message || 'Thay đổi thông tin không thành công.' };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: `Lỗi kết nối đến máy chủ: ${errMessage}` };
  }
}
