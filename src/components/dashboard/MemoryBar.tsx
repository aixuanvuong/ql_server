// filepath: frontend/src/components/dashboard/MemoryBar.tsx
import React from 'react';
import { Database, HardDrive } from 'lucide-react';

interface MemoryBarProps {
  memory: {
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    usedPercent: number;
    mount: string;
  };
}

export const MemoryBar: React.FC<MemoryBarProps> = ({ memory, disk }) => {
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* RAM Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Bộ nhớ RAM</h3>
                <p className="text-[11px] text-slate-400">Dung lượng bộ nhớ hệ thống</p>
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-purple-300">
              {memory.usedPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 my-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                memory.usedPercent > 85 ? 'bg-rose-500' : memory.usedPercent > 70 ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, memory.usedPercent))}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">Đã dùng</span>
            <span className="text-xs font-mono font-semibold text-slate-200">{formatBytes(memory.used)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Còn trống</span>
            <span className="text-xs font-mono font-semibold text-emerald-400">{formatBytes(memory.free)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Tổng cộng</span>
            <span className="text-xs font-mono font-semibold text-slate-300">{formatBytes(memory.total)}</span>
          </div>
        </div>
      </div>

      {/* Disk Storage Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Ổ cứng Root ({disk.mount || '/'})</h3>
                <p className="text-[11px] text-slate-400">Phân vùng lưu trữ chính</p>
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-cyan-300">
              {disk.usedPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 my-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                disk.usedPercent > 90 ? 'bg-rose-500' : disk.usedPercent > 75 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, disk.usedPercent))}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">Đã ghi</span>
            <span className="text-xs font-mono font-semibold text-slate-200">{formatBytes(disk.used)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Khả dụng</span>
            <span className="text-xs font-mono font-semibold text-cyan-400">{formatBytes(disk.available)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Tổng ổ đĩa</span>
            <span className="text-xs font-mono font-semibold text-slate-300">{formatBytes(disk.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
