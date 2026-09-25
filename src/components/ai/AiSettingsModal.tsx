// filepath: frontend/src/components/ai/AiSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  KeyRound,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Cpu,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import {
  AiConfigData,
  getAiConfigApi,
  updateAiConfigApi,
  testAiConnectionApi,
  AiTestResponse
} from '../../api/ai.api';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (modelName: string) => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [config, setConfig] = useState<AiConfigData | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [customModel, setCustomModel] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [testResult, setTestResult] = useState<AiTestResponse | null>(null);

  // Load config on open
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    setFeedback(null);
    setTestResult(null);
    try {
      const res = await getAiConfigApi();
      if (res.success && res.data) {
        setConfig(res.data);
        const currentModel = res.data.model || 'gpt-4o';
        const isPreset = res.data.availableModels.some((m) => m.id === currentModel);
        if (isPreset) {
          setSelectedModel(currentModel);
          setIsCustomMode(false);
        } else {
          setIsCustomMode(true);
          setCustomModel(currentModel);
        }
      }
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const modelToSave = isCustomMode ? customModel.trim() : selectedModel;
    if (!modelToSave) {
      setFeedback({ success: false, message: 'Vui lòng chọn hoặc nhập tên mô hình AI.' });
      setSaving(false);
      return;
    }

    try {
      const res = await updateAiConfigApi({
        model: modelToSave,
        apiKey: apiKeyInput.trim() || undefined
      });

      setFeedback({
        success: res.success,
        message: res.message
      });

      if (res.success) {
        setApiKeyInput('');
        if (onConfigUpdated) onConfigUpdated(modelToSave);
        loadConfig();
      }
    } catch {
      setFeedback({
        success: false,
        message: 'Lỗi khi lưu cấu hình lên máy chủ.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnectionApi();
      setTestResult(res);
    } catch {
      setTestResult({
        success: false,
        message: 'Không thể gửi yêu cầu kiểm tra kết nối.'
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>Cấu Hình AI Assistant</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                  OmniRoute
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tùy chỉnh mô hình và khóa kết nối trực tiếp trên Web
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Thông báo kết quả lưu */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                feedback.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* 1. Máy chủ Gateway cố định */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Cổng Định Tuyến (Base URL):
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Chuẩn OpenAI API
              </span>
            </label>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-purple-700 dark:text-purple-300 font-mono flex items-center justify-between shadow-inner">
              <span className="truncate">{config?.baseURL || 'https://omniroute.xuanvuong.id.vn/v1'}</span>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">Cố định</span>
            </div>
          </div>

          {/* 2. Chọn Mô hình AI (Model Selection) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Mô Hình Trí Tuệ Nhân Tạo (Model):
              </label>
              <button
                type="button"
                onClick={() => setIsCustomMode(!isCustomMode)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Sliders className="w-3 h-3" />
                {isCustomMode ? 'Chọn từ danh sách có sẵn' : 'Nhập model khác'}
              </button>
            </div>

            {!isCustomMode ? (
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {(config?.availableModels || []).map((m) => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModel(m.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-600/15 border-blue-400 dark:border-blue-500/50 text-blue-900 dark:text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <span>{m.name}</span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-mono">
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{m.id}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-medium">
                        {m.provider}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Ví dụ: gpt-4o, claude-3-5-sonnet, deepseek-chat..."
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono shadow-inner"
                />
                <p className="text-[11px] text-slate-500">
                  Nhập mã định danh model chính xác được định tuyến bởi máy chủ OmniRoute của bạn.
                </p>
              </div>
            )}
          </div>

          {/* 3. Khóa xác thực OMNIROUTE_API_KEY */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Khóa Xác Thực (OMNIROUTE_API_KEY):
              </label>
              {config?.hasKey ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                  {config.maskedKey || 'Đã cấu hình'}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Chưa cấu hình
                </span>
              )}
            </div>
            <input
              type="password"
              placeholder={config?.hasKey ? 'Nhập khóa mới nếu muốn thay đổi...' : 'sk-xxxx-khoa-api-omniroute...'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono shadow-inner"
            />
            <p className="text-[11px] text-slate-500">
              Khóa API sẽ được mã hóa và lưu trực tiếp vào file <code className="text-amber-600 dark:text-amber-400/80">.env</code> trên máy chủ.
            </p>
          </div>

          {/* 4. Kết quả kiểm tra kết nối (Test Ping result) */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  {testResult.success ? 'KẾT NỐI THÀNH CÔNG' : 'KẾT NỐI THẤT BẠI'}
                </span>
                {testResult.latencyMs !== undefined && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-black/40 text-slate-800 dark:text-white">
                    {testResult.latencyMs} ms
                  </span>
                )}
              </div>
              <div className="text-[11px] opacity-90 leading-relaxed">
                {testResult.message}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${testing ? 'animate-bounce' : ''}`} />
              <span>{testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối (Ping)'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
