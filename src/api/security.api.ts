// filepath: frontend/src/api/security.api.ts
import { getStoredServerUrl } from './auth.api';
import { SecurityStatusData, SelfHealingStatusData } from '../types/security.types';

// Kiểm tra xem có đang ở chế độ xem thử (Demo / Preview) không
const isDemoMode = (token: string): boolean => {
  return token === 'demo_jwt_token_sample_2026';
};

/**
 * Trình bóc tách dữ liệu JSON an toàn, chống crash khi máy chủ trả về mã HTML (404, 502, Cloudflare, Nginx)
 */
async function safeParseResponse<T>(
  response: Response,
  fallback: T,
  actionName: string
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html') || response.status === 404) {
      return {
        ...fallback,
        success: false,
        message: `Máy chủ chưa cập nhật phiên bản Backend mới cho chức năng "${actionName}". Vui lòng bấm "Cập nhật" trên thanh công cụ hoặc chạy lệnh "sudo quanlysv" trên Terminal máy chủ để cập nhật.`
      };
    }
    return {
      ...fallback,
      success: false,
      message: `Máy chủ phản hồi mã lỗi HTTP ${response.status}`
    };
  }

  try {
    const json = await response.json();
    return json;
  } catch {
    return {
      ...fallback,
      success: false,
      message: 'Không thể phân tích dữ liệu JSON trả về từ máy chủ.'
    };
  }
}

export async function getSecurityStatusApi(token: string): Promise<{ success: boolean; data: SecurityStatusData }> {
  // Dữ liệu mô phỏng trong chế độ Demo
  if (isDemoMode(token)) {
    return {
      success: true,
      data: {
        bannedIps: ['198.51.100.45', '203.0.113.88'],
        totalBanned: 2,
        activeMonitoring: true,
        alerts: [
          {
            id: 'demo-alert-1',
            type: 'ban',
            level: 'critical',
            title: 'ĐÃ CHẶN HACKER: 198.51.100.45',
            ip: '198.51.100.45',
            reason: 'Nhập sai mật khẩu tài khoản root 5 lần trong 3 phút',
            method: 'ufw deny',
            success: true,
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-alert-2',
            type: 'ban',
            level: 'critical',
            title: 'ĐÃ CHẶN HACKER: 203.0.113.88',
            ip: '203.0.113.88',
            reason: 'Quét dò cổng và tài khoản không tồn tại admin',
            method: 'iptables DROP',
            success: true,
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
          }
        ]
      }
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/security/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const fallback = {
      success: false,
      data: {
        bannedIps: [],
        totalBanned: 0,
        alerts: [],
        activeMonitoring: false
      }
    };

    return await safeParseResponse(response, fallback, 'Xem trạng thái bảo mật');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
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
  if (isDemoMode(token)) {
    return {
      success: true,
      message: `[Chế độ Demo] Đã mở chặn thành công cho địa chỉ IP ${ip}`
    };
  }

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

    const fallback = { success: false, message: 'Lỗi khi gỡ chặn IP' };
    return await safeParseResponse(response, fallback, 'Gỡ chặn IP');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}

export async function banIpApi(token: string, ip: string, reason?: string): Promise<{ success: boolean; message: string }> {
  if (isDemoMode(token)) {
    return {
      success: true,
      message: `[Chế độ Demo] Đã kích hoạt lệnh chặn đối với IP ${ip}`
    };
  }

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

    const fallback = { success: false, message: 'Lỗi khi kích hoạt chặn IP' };
    return await safeParseResponse(response, fallback, 'Chặn IP thủ công');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}

export async function getSelfHealingStatusApi(token: string): Promise<{ success: boolean; data: SelfHealingStatusData }> {
  if (isDemoMode(token)) {
    return {
      success: true,
      data: {
        ramThreshold: 95,
        diskThreshold: 90,
        isMonitoring: true,
        lastRamHealTime: new Date(Date.now() - 3600 * 1000).toISOString(),
        lastDiskHealTime: new Date(Date.now() - 7200 * 1000).toISOString(),
        healingLogs: [
          {
            id: 'demo-heal-1',
            type: 'ram_heal',
            level: 'warning',
            title: 'TỰ ĐỘNG PHỤC HỒI RAM (SELF-HEAL)',
            action: 'Xả bộ đệm RAM Cache & Khởi động lại dịch vụ Nginx',
            details: 'Bộ nhớ RAM đạt 96% duy trì trong 130 giây. Hệ thống đã giải phóng bộ đệm an toàn.',
            logs: [
              '✓ Đã đồng bộ dữ liệu đĩa và giải phóng bộ đệm RAM (drop_caches=3)',
              '✓ Đã khởi động lại dịch vụ Nginx thành công'
            ],
            success: true,
            timestamp: new Date(Date.now() - 3600 * 1000).toISOString()
          },
          {
            id: 'demo-heal-2',
            type: 'disk_heal',
            level: 'warning',
            title: 'TỰ ĐỘNG DỌN DẸP Ổ ĐĨA (SELF-CLEAN)',
            action: 'Thu gọn System Logs & Dọn Cache Apt',
            details: 'Dung lượng ổ đĩa gốc (/) đạt 91%. Hệ thống đã dọn dẹp an toàn tránh đầy phân vùng.',
            logs: [
              '✓ Đã thu gọn nhật ký hệ thống systemd (journalctl giữ 3 ngày / 100MB)',
              '✓ Đã dọn dẹp kho cache apt và các package mồ côi không dùng'
            ],
            success: true,
            timestamp: new Date(Date.now() - 7200 * 1000).toISOString()
          }
        ]
      }
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const response = await fetch(`${serverUrl}/api/selfhealing/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const fallback = {
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

    return await safeParseResponse(response, fallback, 'Xem trạng thái tự phục hồi');
  } catch {
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
  // Nếu ở chế độ Demo, phản hồi ngay lập tức với log thực tế
  if (isDemoMode(token)) {
    if (type === 'ram') {
      return {
        success: true,
        message: '✓ [Chế độ Demo] Đã đồng bộ dữ liệu đĩa và giải phóng bộ đệm RAM Cache (drop_caches=3) thành công!'
      };
    } else if (type === 'disk') {
      return {
        success: true,
        message: '✓ [Chế độ Demo] Đã dọn dẹp nhật ký journalctl (giữ 3 ngày/100MB) và dọn sạch cache apt thành công!'
      };
    } else {
      return {
        success: true,
        message: '✓ [Chế độ Demo] Đã hoàn tất giải phóng RAM và dọn dẹp ổ đĩa hệ thống an toàn!'
      };
    }
  }

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

    const fallback = { success: false, message: 'Lỗi thực thi dọn dẹp' };
    return await safeParseResponse(response, fallback, type === 'disk' ? 'Dọn Ổ Đĩa' : 'Xả RAM Cache');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối máy chủ';
    return { success: false, message: msg };
  }
}
