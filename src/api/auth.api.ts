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
  const stored = localStorage.getItem(SERVER_URL_KEY);
  if (stored) return stored;
  if (typeof window !== 'undefined' && window.location.origin) {
    // Nếu đang chạy trên web thật hoặc qua Cloudflare Tunnel, dùng luôn origin hiện tại
    if (!window.location.origin.includes(':3000') && !window.location.origin.includes(':5173')) {
      return window.location.origin;
    }
  }
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
