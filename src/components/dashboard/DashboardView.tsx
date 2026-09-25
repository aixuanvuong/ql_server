// filepath: frontend/src/components/dashboard/DashboardView.tsx
import React from 'react';
import { Cpu, Flame, Database, HardDrive, Activity } from 'lucide-react';
import { StaticSystemInfo, DynamicSystemMetrics } from '../../types/system.types';
import { SystemInfoBanner } from './SystemInfoBanner';
import { StatCard } from './StatCard';
import { CpuGauge } from './CpuGauge';
import { MemoryBar } from './MemoryBar';

interface DashboardViewProps {
  staticInfo: StaticSystemInfo;
  metrics: DynamicSystemMetrics | null;
  history: { time: string; cpu: number; mem: number }[];
  isConnected: boolean;
  onOpenTerminal: () => void;
  onOpenUpdate?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  staticInfo,
  metrics,
  history,
  isConnected,
  onOpenTerminal,
  onOpenUpdate
}) => {
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">Đang kết nối và nạp dữ liệu phần cứng từ máy chủ Ubuntu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* 1. Header Banner: OS & Uptime */}
      <SystemInfoBanner
        info={staticInfo}
        uptimeSeconds={metrics.uptime}
        onOpenUpdate={onOpenUpdate}
      />

      {/* 2. Quick Stat Cards (Top Row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CPU Load */}
        <StatCard
          title="TẢI CPU"
          value={metrics.cpu.loadPercent}
          unit="%"
          progressPercent={metrics.cpu.loadPercent}
          subtitle={`${staticInfo.cores} Nhân vật lý`}
          icon={<Cpu className="w-5 h-5" />}
          colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        />

        {/* CPU Temp */}
        <StatCard
          title="NHIỆT ĐỘ CPU"
          value={metrics.cpu.temperature}
          unit="°C"
          progressPercent={(metrics.cpu.temperature / 100) * 100}
          subtitle={metrics.cpu.temperature > 75 ? 'Cảnh báo nhiệt' : 'Nhiệt độ ổn định'}
          icon={<Flame className="w-5 h-5" />}
          colorClass={
            metrics.cpu.temperature > 75
              ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
              : metrics.cpu.temperature > 55
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
          }
        />

        {/* RAM Usage */}
        <StatCard
          title="BỘ NHỚ RAM"
          value={metrics.memory.usedPercent}
          unit="%"
          progressPercent={metrics.memory.usedPercent}
          subtitle={`${(metrics.memory.used / (1024 ** 3)).toFixed(1)} / ${(metrics.memory.total / (1024 ** 3)).toFixed(1)} GB`}
          icon={<Database className="w-5 h-5" />}
          colorClass="text-purple-400 bg-purple-500/10 border-purple-500/20"
        />

        {/* Disk Usage */}
        <StatCard
          title="DUNG LƯỢNG ĐĨA"
          value={metrics.disk.usedPercent}
          unit="%"
          progressPercent={metrics.disk.usedPercent}
          subtitle={`${(metrics.disk.used / (1024 ** 3)).toFixed(0)} / ${(metrics.disk.total / (1024 ** 3)).toFixed(0)} GB`}
          icon={<HardDrive className="w-5 h-5" />}
          colorClass="text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
        />
      </div>

      {/* 3. Detailed CPU Section with Core Details */}
      <CpuGauge
        loadPercent={metrics.cpu.loadPercent}
        temperature={metrics.cpu.temperature}
        cores={metrics.cpu.cores}
        cpuBrand={staticInfo.cpuBrand}
      />

      {/* 4. Memory & Disk Detailed Bars */}
      <MemoryBar memory={metrics.memory} disk={metrics.disk} />

      {/* 5. Live Trends Timeline (Sparkline chart) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Lịch sử tải thời gian thực (15 điểm đo gần nhất)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Chu kỳ 1.5s/lần</span>
        </div>

        {/* Visual History Bars */}
        <div className="h-32 flex items-end gap-1.5 pt-4 pb-2 border-b border-slate-800/80">
          {history.map((pt, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group relative h-full">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-950 text-[10px] text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-10 font-mono">
                CPU: {pt.cpu}% | RAM: {pt.mem}%
              </div>

              {/* Memory bar */}
              <div
                className="w-full bg-purple-500/40 rounded-t-sm transition-all"
                style={{ height: `${Math.min(100, Math.max(5, pt.mem))}%` }}
              />

              {/* CPU bar overlay */}
              <div
                className={`w-full rounded-t-sm transition-all -mt-full ${
                  pt.cpu > 80 ? 'bg-rose-500' : pt.cpu > 50 ? 'bg-amber-500' : 'bg-emerald-400'
                }`}
                style={{ height: `${Math.min(100, Math.max(5, pt.cpu))}%` }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
              Tải CPU (%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
              Tải RAM (%)
            </span>
          </div>
          <button
            onClick={onOpenTerminal}
            className="text-emerald-400 hover:text-emerald-300 font-sans cursor-pointer underline text-xs"
          >
            Mở Web SSH để xử lý tiến trình &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
