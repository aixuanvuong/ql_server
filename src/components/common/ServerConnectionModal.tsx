// filepath: frontend/src/components/common/ServerConnectionModal.tsx
import React, { useState } from 'react';
import { Globe, Server, Check, AlertTriangle, RefreshCw, ExternalLink, Link2, X } from 'lucide-react';
import { getStoredServerUrl, setStoredServerUrl } from '../../api/auth.api';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onReconnect: (newUrl?: string) => void;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onReconnect
}) => {
  const [urlInput, setUrlInput] = useState<string>(getStoredServerUrl());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isCloudRunPreview = currentOrigin.includes('run.app') || currentOrigin.includes('googleusercontent.com');

  const handleSaveAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const clean = urlInput.trim().replace(/\/+$/, '');
    setStoredServerUrl(clean);
    onReconnect(clean);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleUseCurrentOrigin = () => {
    setUrlInput(currentOrigin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Cấu Hình Kết Nối Máy Chủ Ubuntu Thật
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chuyển từ chế độ Mô phỏng (Demo) sang Máy chủ vật lý của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Trạng thái hiện tại */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            }`}
          >
            {isConnected ? (
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-xs uppercase tracking-wide">
                {isConnected
                  ? 'ĐÃ KẾT NỐI VỚI MÁY CHỦ THẬT (ONLINE)'
                  : 'ĐANG Ở CHẾ ĐỘ MÔ PHỎNG (DEMO DỮ LIỆU GIẢ)'}
              </div>
              <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                {isConnected
                  ? 'Ứng dụng đang nhận luồng dữ liệu phần cứng thời gian thực từ CPU, RAM và Intel RAPL của máy chủ bạn.'
                  : 'Bạn đang thấy thông số mẫu (CPU AMD EPYC giả lập) vì chưa kết nối thành công tới Backend của máy chủ Ubuntu.'}
              </p>
            </div>
          </div>

          {/* Giải thích vì sao thấy DEMO khi mở qua Internet */}
          {isCloudRunPreview && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-500" />
                Vì sao bạn thấy dữ liệu Demo khi vào từ xa?
              </span>
              <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
                Đường link hiện tại bạn đang mở là <strong>Bản xem trước trên đám mây Google (Cloud Run)</strong>. Để xem máy chủ Ubuntu thật của bạn từ xa bằng 4G, bạn có 2 cách:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                <li>
                  <strong>Cách 1 (Tốt nhất):</strong> Mở trực tiếp bằng đường link <strong>Cloudflare Tunnel</strong> của máy chủ (dạng <code>https://xxxx.trycloudflare.com</code>).
                </li>
                <li>
                  <strong>Cách 2:</strong> Dán đường link Cloudflare Tunnel vào ô bên dưới rồi bấm <em>Lưu & Kết nối</em>.
                </li>
              </ul>
            </div>
          )}

          {/* Form cấu hình URL Backend */}
          <form onSubmit={handleSaveAndConnect} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-purple-500" />
                  Đường dẫn Backend Máy Chủ (Cloudflare Tunnel URL)
                </label>
                {currentOrigin && !isCloudRunPreview && (
                  <button
                    type="button"
                    onClick={handleUseCurrentOrigin}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    Dùng web hiện tại
                  </button>
                )}
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://xxxx-xxxx.trycloudflare.com hoặc http://192.168.1.100:5000"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Ví dụ: <code>https://your-tunnel.trycloudflare.com</code> (truy cập từ xa 4G) hoặc <code>http://192.168.1.50:5000</code> (ở cùng Wi-Fi nhà)
              </span>
            </div>

            {/* Hướng dẫn tìm link trên máy chủ */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                📌 Lấy đường link Cloudflare Tunnel trên máy chủ Ubuntu:
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                Mở Terminal máy chủ &rarr; gõ lệnh: <code className="text-purple-600 dark:text-purple-400 font-mono font-bold">sudo quanlysv</code> &rarr; chọn <strong>Mục 1</strong> (hoặc Mục 3 &rarr; 2 để cấp link mới).
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer text-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kết nối...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã lưu & Kết nối!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Lưu & Kết Nối Máy Chủ Thật</span>
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
