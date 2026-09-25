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

export interface AiModelOption {
  id: string;
  name: string;
  provider: string;
}

export interface AiConfigData {
  baseURL: string;
  model: string;
  hasKey: boolean;
  maskedKey: string;
  availableModels: AiModelOption[];
}

export interface AiTestResponse {
  success: boolean;
  latencyMs?: number;
  model?: string;
  baseURL?: string;
  reply?: string;
  error?: string;
  message: string;
}

const isDemo = () => {
  const token = getStoredToken();
  return token === 'demo_jwt_token_sample_2026';
};

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

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Máy chủ phản hồi HTML thay vì JSON');
    }

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

*(Lưu ý: Bấm nút "Cấu hình AI" ở góc trên hộp chat để chọn mô hình AI OmniRoute hoặc cập nhật khóa API).*`,
      suggestions: ['systemctl --failed', 'journalctl -xe --no-pager -n 30']
    };
  }
}

/**
 * Lấy cấu hình AI hiện tại từ máy chủ
 */
export async function getAiConfigApi(): Promise<{ success: boolean; data: AiConfigData; message?: string }> {
  if (isDemo()) {
    const localModel = localStorage.getItem('demo_omniroute_model') || 'gpt-4o';
    const localHasKey = localStorage.getItem('demo_omniroute_has_key') === 'true';
    return {
      success: true,
      data: {
        baseURL: 'https://omniroute.xuanvuong.id.vn/v1',
        model: localModel,
        hasKey: localHasKey,
        maskedKey: localHasKey ? 'sk-demo••••••••7890' : '',
        availableModels: [
          { id: 'gpt-4o', name: 'GPT-4o (Đa năng, thông minh nhất)', provider: 'OpenAI' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Phản hồi cực nhanh, tiết kiệm)', provider: 'OpenAI' },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Chuyên sâu DevOps & Log)', provider: 'Anthropic' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Gọn nhẹ, siêu tốc)', provider: 'Anthropic' },
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Bộ nhớ ngữ cảnh cực lớn)', provider: 'Google' },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Xử lý log dài mượt mà)', provider: 'Google' },
          { id: 'deepseek-chat', name: 'DeepSeek-V3 / Chat (Hiệu năng cao, chi phí thấp)', provider: 'DeepSeek' }
        ]
      }
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const token = getStoredToken();
    const res = await fetch(`${serverUrl}/api/ai/config`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('API chưa sẵn sàng trên máy chủ.');
    }

    return await res.json();
  } catch (err: unknown) {
    return {
      success: true,
      data: {
        baseURL: 'https://omniroute.xuanvuong.id.vn/v1',
        model: 'gpt-4o',
        hasKey: false,
        maskedKey: '',
        availableModels: [
          { id: 'gpt-4o', name: 'GPT-4o (Đa năng, thông minh nhất)', provider: 'OpenAI' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Phản hồi cực nhanh)', provider: 'OpenAI' },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Chuyên sâu DevOps)', provider: 'Anthropic' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Siêu tốc)', provider: 'Anthropic' },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Xử lý log dài)', provider: 'Google' }
        ]
      }
    };
  }
}

/**
 * Cập nhật cấu hình AI (Model hoặc API Key)
 */
export async function updateAiConfigApi(params: {
  model?: string;
  apiKey?: string;
}): Promise<{ success: boolean; message: string; config?: AiConfigData }> {
  if (isDemo()) {
    if (params.model) localStorage.setItem('demo_omniroute_model', params.model);
    if (params.apiKey) localStorage.setItem('demo_omniroute_has_key', 'true');
    return {
      success: true,
      message: `[Chế độ Demo] Đã cập nhật thành công mô hình ${params.model || 'gpt-4o'}!`
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const token = getStoredToken();
    const res = await fetch(`${serverUrl}/api/ai/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(params)
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        message: 'Máy chủ chưa cập nhật phiên bản Backend mới cho API cấu hình AI.'
      };
    }

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
    return { success: false, message: msg };
  }
}

/**
 * Kiểm tra kết nối nhanh tới OmniRoute Gateway
 */
export async function testAiConnectionApi(): Promise<AiTestResponse> {
  if (isDemo()) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      latencyMs: 185,
      model: localStorage.getItem('demo_omniroute_model') || 'gpt-4o',
      baseURL: 'https://omniroute.xuanvuong.id.vn/v1',
      reply: 'KẾT NỐI_OK',
      message: '✓ [Mô phỏng Demo] Kết nối máy chủ OmniRoute thành công (185ms)!'
    };
  }

  try {
    const serverUrl = getStoredServerUrl().replace(/\/+$/, '');
    const token = getStoredToken();
    const res = await fetch(`${serverUrl}/api/ai/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        message: 'Endpoint kiểm tra kết nối AI chưa được cập nhật trên Backend máy chủ.'
      };
    }

    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
    return { success: false, message: msg };
  }
}
