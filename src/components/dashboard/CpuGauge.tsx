// filepath: frontend/src/components/dashboard/CpuGauge.tsx
import React from 'react';
import { Cpu, Flame } from 'lucide-react';

interface CpuGaugeProps {
  loadPercent: number;
  temperature: number;
  cores: number[];
  cpuBrand: string;
}

export const CpuGauge: React.FC<CpuGaugeProps> = ({
  loadPercent,
  temperature,
  cores,
  cpuBrand
}) => {
  // Đánh giá mức độ an toàn của nhiệt độ CPU
  const getTempStatus = (temp: number) => {
    if (temp < 55) {
      return { text: 'Mát mẻ', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
    if (temp < 75) {
      return { text: 'Bình thường', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    return { text: 'Cảnh báo nóng', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  };

  const tempStatus = getTempStatus(temperature);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Bộ vi xử lý (CPU)</h3>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">{cpuBrand}</p>
          </div>
        </div>

        {/* Cột hiển thị Nhiệt độ CPU */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono font-medium ${tempStatus.color}`}>
          <Flame className="w-3.5 h-3.5" />
          <span>{temperature}°C</span>
          <span className="text-[10px] hidden sm:inline">({tempStatus.text})</span>
        </div>
      </div>

      {/* Main Load Bar */}
      <div className="mb-5">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-xs text-slate-400">Tải trung bình tất cả các nhân</span>
          <span className="text-lg font-bold font-mono text-white">{loadPercent}%</span>
        </div>
        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              loadPercent > 85 ? 'bg-rose-500' : loadPercent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, loadPercent))}%` }}
          />
        </div>
      </div>

      {/* Individual Cores Breakdown */}
      {cores && cores.length > 0 && (
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
            Chi tiết {cores.length} nhân CPU:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {cores.map((coreLoad, idx) => (
              <div
                key={idx}
                className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between"
              >
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-slate-400 font-mono">Core {idx}</span>
                  <span className="text-slate-200 font-mono font-semibold">{coreLoad}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      coreLoad > 85 ? 'bg-rose-500' : coreLoad > 65 ? 'bg-amber-500' : 'bg-indigo-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, coreLoad))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
