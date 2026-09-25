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
  return localStorage.getItem(SERVER_URL_KEY) || (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';
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
