// filepath: frontend/src/components/dashboard/SystemInfoBanner.tsx
import React, { useState } from 'react';
import { TerminalSquare, Clock, ShieldCheck, Layers, DownloadCloud, Globe, Copy, Check, ExternalLink, HelpCircle } from 'lucide-react';
import { StaticSystemInfo } from '../../types/system.types';

interface SystemInfoBannerProps {
  info: StaticSystemInfo;
  uptimeSeconds: number;
  onOpenUpdate?: () => void;
}

export const SystemInfoBanner: React.FC<SystemInfoBannerProps> = ({ info, uptimeSeconds, onOpenUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [showRemoteHelp, setShowRemoteHelp] = useState(false);

  // Định dạng Uptime thành Ngày, Giờ, Phút
  const formatUptime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0 phút';
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    parts.push(`${minutes} phút`);
    return parts.join(' ');
  };

  const remoteUrl = info.remoteAccess?.url || (typeof window !== 'undefined' && window.location.origin.includes('cloudflare') ? window.location.origin : null);

  const handleCopyRemoteUrl = () => {
    if (remoteUrl) {
      navigator.clipboard.writeText(remoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-lg transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: OS Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 flex-shrink-0">
            <TerminalSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {info.distro || 'Ubuntu Linux'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                {info.arch || 'x64'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Kernel {info.release || '6.8.0'}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {info.model || 'Ubuntu Server'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Badges & Remote Access Link */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Nút Xem Hướng dẫn Truy cập từ xa (4G) */}
          <button
            type="button"
            onClick={() => setShowRemoteHelp(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 transition-all text-xs font-medium cursor-pointer shadow-sm"
          >
            <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Truy Cập 4G Từ Xa</span>
          </button>

          {onOpenUpdate && (
            <button
              onClick={onOpenUpdate}
              className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 px-3.5 py-2.5 rounded-xl border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 transition-all cursor-pointer shadow-sm group"
            >
              <DownloadCloud className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400/80 block uppercase font-semibold">Tự động cập nhật</span>
                <span className="text-xs font-mono font-medium text-slate-900 dark:text-white flex items-center gap-1">
                  1-Click Update
                </span>
              </div>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/80 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Thời gian hoạt động (Uptime)</span>
              <span className="text-xs sm:text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                {formatUptime(uptimeSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Hướng dẫn Truy Cập Từ Xa */}
      {showRemoteHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Hướng Dẫn Truy Cập Từ Xa (4G / Internet)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRemoteHelp(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              {/* Giải thích vì sao không truy cập được bằng 4G nếu dùng IP LAN */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">
                  ⚠️ Vì sao bạn không thể dùng IP 192.168.x.x khi ở ngoài mạng 4G?
                </p>
                <p className="leading-relaxed">
                  Địa chỉ <code>192.168.x.x</code> là mạng nội bộ (Wi-Fi nhà). Khi bạn dùng 4G hoặc mạng khác, điện thoại nằm ngoài Wi-Fi nhà bạn nên không thể đến được IP này. Để vào từ xa, bạn phải dùng <strong>Cloudflare Tunnel (Zero Open Ports)</strong>.
                </p>
              </div>

              {/* Link Cloudflare Tunnel nếu tìm thấy */}
              {remoteUrl ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                      Link Internet Công Khai (Cloudflare Tunnel):
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                      HTTPS Bảo Mật
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700/50 rounded-lg">
                    <code className="text-xs text-emerald-700 dark:text-emerald-300 font-mono break-all flex-1">
                      {remoteUrl}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyRemoteUrl}
                      className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    👉 Hãy gửi link này sang điện thoại của bạn, bật 4G và mở link là vào được ngay!
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Cách lấy đường link Cloudflare Tunnel trên máy chủ Ubuntu:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Mở cửa sổ Terminal trên máy chủ (hoặc qua SSH) và gõ lệnh:
                  </p>
                  <pre className="p-2 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
                    sudo quanlysv
                  </pre>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Chọn <strong>Mục 1</strong>: Màn hình sẽ hiển thị đường link <code>https://xxxx.trycloudflare.com</code>.
                  </p>
                </div>
              )}

              {/* Hướng dẫn cài đặt tên miền vĩnh viễn không bị đổi link */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  💡 Mẹo để có đường link cố định vĩnh viễn (Không bao giờ bị đổi):
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  1. Đăng ký tài khoản miễn phí tại <a href="https://one.dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-cyan-600 dark:text-cyan-400 underline inline-flex items-center gap-0.5">Cloudflare Zero Trust <ExternalLink className="w-3 h-3" /></a>.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  2. Tạo một <strong>Tunnel</strong> với tên miền riêng (ví dụ: <code>server.cuaban.com</code>), copy chuỗi <strong>Tunnel Token</strong>.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  3. Trên máy chủ gõ <code>sudo quanlysv</code> &rarr; chọn <strong>Mục 3 &rarr; Nhập Token</strong>. Link của bạn sẽ cố định 24/7.
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRemoteHelp(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold cursor-pointer text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
