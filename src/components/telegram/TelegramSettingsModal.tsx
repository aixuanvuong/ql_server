// filepath: frontend/src/components/telegram/TelegramSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  KeyRound,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  MessageSquare,
  Power,
  BellRing,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import {
  getTelegramConfigApi,
  updateTelegramConfigApi,
  testTelegramConnectionApi,
  sendTestNotificationApi,
  TelegramConfigData,
  TelegramTestResponse
} from '../../api/telegram.api';
import { clientTelegramListener } from '../../services/client_telegram_listener.service';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: TelegramConfigData) => void;
}

export const TelegramSettingsModal: React.FC<TelegramSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [config, setConfig] = useState<TelegramConfigData | null>(null);
  const [botTokenInput, setBotTokenInput] = useState<string>('');
  const [adminIdInput, setAdminIdInput] = useState<string>('');
  const [enabledInput, setEnabledInput] = useState<boolean>(true);

  const [showToken, setShowToken] = useState<boolean>(false);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [sendingTestMsg, setSendingTestMsg] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [testResult, setTestResult] = useState<TelegramTestResponse | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);

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
      const res = await getTelegramConfigApi();
      if (res.success && res.data) {
        setConfig(res.data);
        setAdminIdInput(res.data.adminId || '');
        setEnabledInput(res.data.enabled !== false);
        setBotTokenInput(''); // Giữ trống để bảo mật, chỉ nhập khi muốn đổi
      }
    } catch {
      // Lỗi kết nối
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setTestResult(null);

    try {
      const payload: {
        botToken?: string;
        adminId?: string;
        enabled: boolean;
      } = {
        enabled: enabledInput
      };

      if (botTokenInput.trim()) {
        payload.botToken = botTokenInput.trim();
      }
      payload.adminId = adminIdInput.trim();

      const res = await updateTelegramConfigApi(payload);
      if (res.success && res.data) {
        setConfig(res.data);
        setFeedback({
          success: true,
          message: res.message || 'Đã cập nhật cấu hình Telegram Bot thành công!'
        });
        setBotTokenInput('');
        
        // Khởi động lại dịch vụ lắng nghe tin nhắn trực tiếp
        clientTelegramListener.restart();

        if (onConfigSaved) {
          onConfigSaved(res.data);
        }
      } else {
        setFeedback({
          success: false,
          message: res.message || 'Không thể lưu cấu hình Telegram.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setFeedback({ success: false, message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setFeedback(null);

    const tokenToTest = botTokenInput.trim() || undefined;

    try {
      const res = await testTelegramConnectionApi(tokenToTest);
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối kiểm tra';
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestMessage = async () => {
    const targetChatId = adminIdInput.trim() || (config ? config.adminId : '');
    if (!targetChatId) {
      setFeedback({
        success: false,
        message: 'Vui lòng nhập Admin Chat ID của bạn trước khi gửi tin nhắn thử nghiệm (lấy từ bot @userinfobot).'
      });
      return;
    }

    // Nếu người dùng vừa gõ Token mới vào ô mà chưa bấm Lưu, tự động lưu tạm để gửi test ngay
    if (botTokenInput.trim()) {
      localStorage.setItem('ubuntu_monitor_telegram_bot_token', botTokenInput.trim());
    }
    if (adminIdInput.trim()) {
      localStorage.setItem('ubuntu_monitor_telegram_admin_id', adminIdInput.trim());
    }

    setSendingTestMsg(true);
    setFeedback(null);

    try {
      const res = await sendTestNotificationApi(targetChatId);
      if (res.success) {
        setFeedback({
          success: true,
          message: res.message || `Đã gửi tin nhắn test thành công tới ID: ${targetChatId}`
        });
        // Cập nhật lại config sau khi test thành công
        loadConfig();
      } else {
        setFeedback({
          success: false,
          message: res.message || 'Không thể gửi tin nhắn thử nghiệm.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi tin nhắn';
      setFeedback({ success: false, message: msg });
    } finally {
      setSendingTestMsg(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* 1. Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Cấu Hình Telegram Bot
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-mono font-bold border border-sky-500/30">
                  ChatOps 1-1
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Điều khiển máy chủ, tra cứu tin tức & nhận cảnh báo từ xa qua Telegram
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowGuide(!showGuide)}
              title="Hướng dẫn lấy Token và Chat ID"
              className={`p-2 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                showGuide
                  ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 dark:border-sky-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Hướng dẫn</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Body scrollable */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Hộp hướng dẫn nhanh nếu người dùng click Hướng dẫn */}
          {showGuide && (
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 text-xs text-slate-700 dark:text-slate-300 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2 font-semibold text-sky-700 dark:text-sky-300">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Cách tạo Bot và lấy ID Quản Trị Viên (Chỉ mất 1 phút):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                <li>
                  Mở Telegram, tìm kiếm bot{' '}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 dark:text-sky-400 font-semibold underline hover:text-sky-500 inline-flex items-center gap-0.5"
                  >
                    @BotFather <ExternalLink className="w-3 h-3" />
                  </a>
                  , gửi lệnh <code className="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-sky-700 dark:text-sky-300 font-mono">/newbot</code> và làm theo hướng dẫn để nhận Token.
                </li>
                <li>
                  Tìm kiếm bot{' '}
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 dark:text-sky-400 font-semibold underline hover:text-sky-500 inline-flex items-center gap-0.5"
                  >
                    @userinfobot <ExternalLink className="w-3 h-3" />
                  </a>
                  , nhấn <code className="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-sky-700 dark:text-sky-300 font-mono">/start</code> để lấy số <strong className="text-slate-900 dark:text-white">Id</strong> của bạn.
                </li>
                <li className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200">
                  <strong className="text-slate-900 dark:text-white">⚠️ BẮT BUỘC:</strong> Mở con bot vừa tạo của bạn trên Telegram và nhấn nút <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">START</strong> (hoặc gõ <code className="text-sky-700 dark:text-sky-300 font-mono">/start</code>).
                  <div className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                    Telegram không cho phép Bot tự ý gửi tin nhắn trước cho người lạ nếu bạn chưa từng bấm Start!
                  </div>
                </li>
                <li>
                  Dán Token và Admin ID vào biểu mẫu bên dưới, sau đó bấm <strong className="text-slate-900 dark:text-white">"Lưu & Áp Dụng Cấu Hình"</strong>.
                </li>
              </ol>
            </div>
          )}

          {/* Trạng thái hiện tại của Bot */}
          {config && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                    config.status === 'running'
                      ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse'
                      : config.status === 'stopped'
                      ? 'bg-amber-400'
                      : config.status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {config.status === 'running'
                        ? 'Đang hoạt động (Polling Online)'
                        : config.status === 'stopped'
                        ? 'Đang tạm dừng (Disabled)'
                        : config.status === 'error'
                        ? 'Gặp sự cố kết nối'
                        : 'Chưa cấu hình Token'}
                    </span>
                    {config.botInfo?.username && (
                      <a
                        href={`https://t.me/${config.botInfo.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] px-2 py-0.5 rounded-md bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 flex items-center gap-1 font-mono transition-colors"
                      >
                        @{config.botInfo.username}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {config.hasToken ? (
                      <span>Token: {config.maskedToken}</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400/90">Chưa nhập Token từ BotFather</span>
                    )}
                    {config.adminId && (
                      <span className="ml-2 text-slate-500">• Admin ID: {config.adminId}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút gửi tin nhắn test trực tiếp */}
              {(config?.hasToken || botTokenInput.trim().length > 10) && (
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={sendingTestMsg || (!config?.adminId && !adminIdInput.trim())}
                  className="px-3 py-1.5 rounded-lg bg-sky-600/10 hover:bg-sky-600/20 dark:bg-sky-600/20 dark:hover:bg-sky-600/30 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <BellRing className={`w-3.5 h-3.5 ${sendingTestMsg ? 'animate-bounce text-sky-600 dark:text-sky-300' : ''}`} />
                  <span>{sendingTestMsg ? 'Đang gửi...' : 'Gửi tin test'}</span>
                </button>
              )}
            </div>
          )}

          {/* Form cấu hình */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Trường 1: Bật / Tắt Bot */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Power className={`w-4 h-4 ${enabledInput ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Kích hoạt Telegram ChatOps</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bật lắng nghe tin nhắn và xử lý lệnh từ Quản trị viên
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledInput}
                  onChange={(e) => setEnabledInput(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Trường 2: Telegram Bot Token */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Telegram Bot Token (Từ @BotFather)</span>
                </span>
                {config?.hasToken && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-normal">
                    <CheckCircle2 className="w-3 h-3" /> Đã lưu trong .env
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={botTokenInput}
                  onChange={(e) => setBotTokenInput(e.target.value)}
                  placeholder={config?.hasToken ? `Giữ nguyên (${config.maskedToken})` : 'Ví dụ: 7123456789:AAFlq...XyZ1234'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-all pr-20 shadow-inner"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    title="Kiểm tra kết nối Token tới Telegram API"
                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-400 text-[10px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Kiểm tra'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Để trống nếu không muốn thay đổi mã token hiện tại.
              </p>
            </div>

            {/* Trường 3: Telegram Admin ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Admin Chat ID (Bảo vệ 1-1 Tuyệt Đối)</span>
                </span>
                <span className="text-[10px] text-slate-400">Dạng số nguyên</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={adminIdInput}
                  onChange={(e) => setAdminIdInput(e.target.value)}
                  placeholder="Ví dụ: 123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-all shadow-inner"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                <strong className="text-rose-600 dark:text-rose-400">Cơ chế an toàn:</strong> Bot sẽ tự động chặn và từ chối mọi người lạ có Chat ID không khớp với giá trị này.
              </p>
            </div>

            {/* Kết quả Test Connection */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold">{testResult.message}</div>
                  {testResult.latencyMs !== undefined && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                      Độ trễ phản hồi API: {testResult.latencyMs}ms
                    </div>
                  )}
                  {testResult.bot && (
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                      Bot: @{testResult.bot.username} (ID: {testResult.bot.id})
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Thông báo Feedback sau khi lưu */}
            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
                  feedback.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                {feedback.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* 3. Footer Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 -rotate-12" />
                    <span>Lưu & Áp Dụng Cấu Hình</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
