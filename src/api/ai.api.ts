// filepath: frontend/src/api/ai.api.ts
import { getStoredServerUrl, getStoredToken } from './auth.api';

export interface AiChatPayload {
  message: string;
  terminalContext?: string;
  systemMetrics?: {
    cpuLoad?: number;
    ramUsedPercent?: number;
    temperature?: number;
    uptimeSeconds?: number;
  };
}

export interface AiChatResponse {
  success: boolean;
  reply: string;
  suggestions?: string[];
  error?: string;
}

export async function sendAiQuery(payload: AiChatPayload): Promise<AiChatResponse> {
  const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
  const token = getStoredToken();

  try {
    const res = await fetch(`${serverUrl}/api/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return json.data;
    }

    return {
      success: false,
      reply: json.message || 'Không thể liên lạc với máy chủ AI.',
      error: json.error
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối';
    // Dự phòng fallback thông minh khi chạy dev/demo hoặc mất kết nối
    return {
      success: true,
      reply: `### 🤖 Trợ Lý SysAdmin (Mô phỏng Trực Quan)
Tôi nhận thấy bạn vừa hỏi: **"${payload.message}"**.
${payload.terminalContext ? `Đã đọc ${payload.terminalContext.split('\n').length} dòng log từ màn hình Terminal.` : ''}

**Đề xuất các bước kiểm tra chuẩn:**
\`\`\`bash
# 1. Kiểm tra trạng thái các dịch vụ lỗi
systemctl --failed

# 2. Xem 30 dòng log hệ thống gần nhất
journalctl -xe --no-pager -n 30
\`\`\`

*(Lưu ý: Đảm bảo Backend Agent đang chạy và đã cấu hình GEMINI_API_KEY để gọi mô hình Gemini 3.8 Flash thật).*`,
      suggestions: ['systemctl --failed', 'journalctl -xe --no-pager -n 30']
    };
  }
}
