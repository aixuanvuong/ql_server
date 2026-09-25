// filepath: frontend/src/api/network.api.ts
import { getStoredServerUrl } from './auth.api';
import { NetworkOverview, PingResult, DnsResult, NetworkAuditResult } from '../types/network.types';

export async function getNetworkOverviewApi(token: string): Promise<{ success: boolean; data?: NetworkOverview; message?: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/network/overview`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const res = await response.json();
    if (response.ok && res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, message: res.message || 'Không thể lấy dữ liệu hạ tầng mạng' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: `Lỗi kết nối: ${msg}` };
  }
}

export async function pingTestApi(token: string, target: string = '8.8.8.8'): Promise<{ success: boolean; data?: PingResult; message?: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/network/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ target })
    });

    const res = await response.json();
    if (response.ok && res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, message: res.message || 'Lỗi kiểm tra độ trễ mạng' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: `Lỗi kết nối: ${msg}` };
  }
}

export async function dnsLookupApi(token: string, domain: string): Promise<{ success: boolean; data?: DnsResult; message?: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/network/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ domain })
    });

    const res = await response.json();
    if (response.ok && res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, message: res.message || 'Lỗi tra cứu DNS' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: `Lỗi kết nối: ${msg}` };
  }
}

export async function killProcessApi(token: string, pid: number): Promise<{ success: boolean; message: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/network/kill-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pid })
    });

    const res = await response.json();
    return { success: res.success, message: res.message || 'Thao tác dừng tiến trình hoàn tất' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: `Lỗi kết nối: ${msg}` };
  }
}

export async function auditNetworkAiApi(token: string): Promise<{ success: boolean; data?: NetworkAuditResult; message?: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/network/ai-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const res = await response.json();
    if (response.ok && res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, message: res.message || 'Lỗi phân tích an ninh mạng AI' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: `Lỗi kết nối: ${msg}` };
  }
}
