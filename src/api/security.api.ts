// filepath: frontend/src/api/security.api.ts
import { getStoredServerUrl } from './auth.api';
import { SecurityStatusData, SelfHealingStatusData } from '../types/security.types';

export async function getSecurityStatusApi(token: string): Promise<{ success: boolean; data: SecurityStatusData }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/security/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error: unknown) {
    return {
      success: false,
      data: {
        bannedIps: [],
        totalBanned: 0,
        alerts: [],
        activeMonitoring: false
      }
    };
  }
}

export async function unbanIpApi(token: string, ip: string): Promise<{ success: boolean; message: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/security/unban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ip })
    });
    return await response.json();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}

export async function banIpApi(token: string, ip: string, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/security/ban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ip, reason })
    });
    return await response.json();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}

export async function getSelfHealingStatusApi(token: string): Promise<{ success: boolean; data: SelfHealingStatusData }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/selfhealing/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error: unknown) {
    return {
      success: false,
      data: {
        ramThreshold: 95,
        diskThreshold: 90,
        isMonitoring: true,
        lastRamHealTime: null,
        lastDiskHealTime: null,
        healingLogs: []
      }
    };
  }
}

export async function triggerManualCleanApi(token: string, type: 'ram' | 'disk' | 'all'): Promise<{ success: boolean; message: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/selfhealing/clean`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type })
    });
    return await response.json();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}
