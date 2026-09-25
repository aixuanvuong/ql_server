// filepath: frontend/src/api/update.api.ts
import { getStoredServerUrl } from './auth.api';
import { CheckUpdateResponse, UpdateStatusResponse } from '../types/update.types';

export async function checkUpdateApi(token: string): Promise<CheckUpdateResponse> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/system/check-update`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return {
      success: false,
      isUpdating: false,
      hasUpdate: false,
      behindCount: 0,
      localCommit: 'unknown',
      remoteCommit: 'unknown',
      localBranch: 'main',
      commitMessage: '',
      lastChecked: new Date().toISOString(),
      error: msg
    };
  }
}

export async function triggerUpdateApi(token: string): Promise<{ success: boolean; message: string }> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/system/trigger-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    return await response.json();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}

export async function getUpdateStatusApi(token: string): Promise<UpdateStatusResponse> {
  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/system/update-status`, {
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
        isUpdating: false,
        logs: [],
        lastChecked: null
      }
    };
  }
}
