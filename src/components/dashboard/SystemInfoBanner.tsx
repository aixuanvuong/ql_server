// filepath: frontend/src/components/dashboard/SystemInfoBanner.tsx
import React from 'react';
import { TerminalSquare, Clock, ShieldCheck, Layers, DownloadCloud } from 'lucide-react';
import { StaticSystemInfo } from '../../types/system.types';

interface SystemInfoBannerProps {
  info: StaticSystemInfo;
  uptimeSeconds: number;
  onOpenUpdate?: () => void;
}

export const SystemInfoBanner: React.FC<SystemInfoBannerProps> = ({ info, uptimeSeconds, onOpenUpdate }) => {
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

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: OS Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <TerminalSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                {info.distro || 'Ubuntu Linux'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {info.arch || 'x64'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                Kernel {info.release || '6.8.0'}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                {info.model || 'Ubuntu Server'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Badges */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {onOpenUpdate && (
            <button
              onClick={onOpenUpdate}
              className="flex items-center gap-2 bg-cyan-950/60 hover:bg-cyan-900/60 px-3.5 py-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 transition-all cursor-pointer shadow-sm group"
            >
              <DownloadCloud className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="text-[10px] text-cyan-400/80 block uppercase font-semibold">Tự động cập nhật</span>
                <span className="text-xs font-mono font-medium text-white flex items-center gap-1">
                  1-Click Update
                </span>
              </div>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Thời gian hoạt động (Uptime)</span>
              <span className="text-xs sm:text-sm font-mono font-medium text-slate-200">
                {formatUptime(uptimeSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
