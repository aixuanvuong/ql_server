// filepath: frontend/src/api/update.api.ts
import { getStoredServerUrl } from './auth.api';
import { CheckUpdateResponse, UpdateStatusResponse } from '../types/update.types';

const isDemo = (token: string) => token === 'demo_jwt_token_sample_2026';

export async function checkUpdateApi(token: string): Promise<CheckUpdateResponse> {
  if (isDemo(token)) {
    return {
      success: true,
      isUpdating: false,
      hasUpdate: false,
      behindCount: 0,
      localCommit: 'v2.1.0-sec',
      remoteCommit: 'v2.1.0-sec',
      localBranch: 'main',
      commitMessage: 'feat: tích hợp Auto-Ban và Self-Healing hoàn thiện',
      lastChecked: new Date().toISOString()
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/system/check-update`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
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
        error: 'Máy chủ phản hồi trang web thay vì dữ liệu JSON.'
      };
    }

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
  if (isDemo(token)) {
    return {
      success: true,
      message: '[Chế độ Demo] Đã kích hoạt cập nhật mô phỏng!'
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/system/trigger-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        message: 'Endpoint cập nhật chưa khả dụng trên máy chủ hoặc bị chặn bởi Proxy/Nginx.'
      };
    }

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

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        data: {
          isUpdating: false,
          logs: [],
          lastChecked: null
        }
      };
    }

    return await response.json();
  } catch {
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
