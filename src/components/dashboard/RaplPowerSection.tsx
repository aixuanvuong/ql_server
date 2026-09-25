// filepath: frontend/src/components/dashboard/RaplPowerSection.tsx
import React, { useState } from 'react';
import {
  Zap,
  Cpu,
  Database,
  Activity,
  Info,
  Layers,
  BatteryCharging,
  TrendingUp,
  Coins,
  Gauge
} from 'lucide-react';
import { RaplPowerMetrics } from '../../types/system.types';

interface RaplPowerSectionProps {
  power?: RaplPowerMetrics;
  history?: { time: string; cpu: number; mem: number; power?: number }[];
}

export const RaplPowerSection: React.FC<RaplPowerSectionProps> = ({
  power,
  history = []
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  if (!power) {
    return null;
  }

  const currentWatts = power.currentWatts || 0;
  const pl1Limit = power.limitPl1Watts || 65;
  const pl2Limit = power.limitPl2Watts || Math.round(pl1Limit * 1.35);

  // Tính phần trăm so với PL1 Limit
  const pl1Percentage = Math.min(100, Math.round((currentWatts / pl1Limit) * 100));

  // Xác định trạng thái tải điện năng
  const getPowerStatus = (watts: number) => {
    if (watts > pl1Limit) {
      return {
        label: 'TURBO BOOST (PL2)',
        desc: 'Đang vượt ngưỡng PL1 tiêu chuẩn, kích hoạt mức công suất cực đại',
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse',
        barColor: 'from-amber-500 to-rose-500',
        textColor: 'text-rose-600 dark:text-rose-400'
      };
    }
    if (watts > pl1Limit * 0.7) {
      return {
        label: 'TẢI CAO (High Load)',
        desc: 'Hệ thống đang hoạt động ở mức công suất cao',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        barColor: 'from-emerald-500 to-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400'
      };
    }
    if (watts > pl1Limit * 0.35) {
      return {
        label: 'VẬN HÀNH BÌNH THƯỜNG',
        desc: 'Mức công suất ổn định tối ưu cho máy chủ',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        barColor: 'from-cyan-500 to-emerald-500',
        textColor: 'text-emerald-600 dark:text-emerald-400'
      };
    }
    return {
      label: 'TIẾT KIỆM NĂNG LƯỢNG (Idle)',
      desc: 'Hệ thống ở trạng thái rảnh, tiêu thụ điện tối thiểu',
      badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      barColor: 'from-blue-500 to-cyan-500',
      textColor: 'text-cyan-600 dark:text-cyan-400'
    };
  };

  const status = getPowerStatus(currentWatts);

  // Lọc lịch sử công suất (lấy 15 điểm gần nhất)
  const powerHistory = history.map(h => ({
    time: h.time,
    watts: h.power !== undefined ? h.power : currentWatts
  }));

  const maxHistoryWatts = Math.max(pl1Limit * 1.1, ...powerHistory.map(h => h.watts), 50);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors relative overflow-hidden">
      {/* Hiệu ứng nền ánh sáng điện năng */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* 1. Header Khối Công Suất Điện Năng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap className="w-5 h-5 fill-amber-500/30 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>CÔNG SUẤT ĐIỆN NĂNG ĐANG SỬ DỤNG</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                Intel RAPL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đo lường thời gian thực từ phần cứng Running Average Power Limit (MSR & Sysfs)
            </p>
          </div>
        </div>

        {/* Nguồn dữ liệu & Nút Thông tin RAPL */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                power.isHardwareRapl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-700 dark:text-slate-300">
              {power.isHardwareRapl ? 'Phần cứng Kernel Sysfs' : 'Mô phỏng TDP'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowInfoModal(!showInfoModal)}
            title="Tìm hiểu về công nghệ Intel RAPL"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal giải thích công nghệ Intel RAPL nếu bật */}
      {showInfoModal && (
        <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-amber-500/30 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400 text-sm">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Công nghệ Intel RAPL (Running Average Power Limit) là gì?
            </span>
            <button
              onClick={() => setShowInfoModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="leading-relaxed">
            <strong>Intel RAPL</strong> là giao tiếp phần cứng tích hợp trực tiếp bên trong vi xử lý kiến trúc x86/x64 hiện đại (Intel Core/Xeon và AMD Zen/EPYC hỗ trợ qua Kernel Linux). Nó đọc năng lượng tiêu thụ tích lũy (tính bằng microJoules) từ các cảm biến silicon và thanh ghi MSR:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
            <li><strong>Package (PKG):</strong> Toàn bộ công suất tiêu thụ của socket vi xử lý CPU.</li>
            <li><strong>PP0 (Power Plane 0):</strong> Năng lượng các nhân tính toán CPU Cores.</li>
            <li><strong>PP1 (Power Plane 1 / Uncore):</strong> Bộ nhớ đệm L3, Ring Bus, vi điều khiển hệ thống và GPU tích hợp.</li>
            <li><strong>DRAM:</strong> Công suất tiêu thụ của thanh nhớ RAM (trên hệ thống có kênh đo điện năng DRAM).</li>
            <li><strong>PL1 / PL2:</strong> Giới hạn công suất dài hạn (TDP) và công suất bứt phá ngắn hạn (Turbo Boost).</li>
          </ul>
        </div>
      )}

      {/* 2. Grid Nội Dung Chính: Đồng hồ Công Suất + Phân Tách Miền RAPL + Điện Kế */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột Trái (5 cols): Đồng hồ Watt lớn và Thước đo PL1/PL2 */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-500" />
                Công Suất Tức Thời
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.badgeClass}`}>
                {status.label}
              </span>
            </div>

            {/* Số Watt to nổi bật */}
            <div className="my-3 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {currentWatts.toFixed(1)}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-amber-500">
                W
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-auto">
                {pl1Percentage}% của PL1
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              {status.desc}
            </p>

            {/* Thanh tiến trình so với PL1 và PL2 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>0 W</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  PL1: {pl1Limit}W
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  PL2: {pl2Limit}W
                </span>
              </div>

              {/* Progress bar container */}
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                {/* Vạch đánh dấu mốc PL1 */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-600 z-10"
                  style={{ left: `${Math.min(100, (pl1Limit / pl2Limit) * 100)}%` }}
                  title={`Ngưỡng PL1: ${pl1Limit}W`}
                />

                {/* Thanh công suất thực */}
                <div
                  className={`h-full bg-gradient-to-r ${status.barColor} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(5, (currentWatts / pl2Limit) * 100))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Mức nghỉ (Idle)</span>
                <span>Mức TDP tiêu chuẩn</span>
                <span>Turbo Boost</span>
              </div>
            </div>
          </div>

          {/* Điện kế tích lũy & Chi phí điện */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-sans">
                <BatteryCharging className="w-3 h-3 text-cyan-500" />
                Điện năng tích lũy
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                {power.cumulativeKwh.toFixed(4)} <span className="text-[10px] font-normal text-slate-400">kWh</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-sans">
                <Coins className="w-3 h-3 text-amber-500" />
                Ước tính tiền điện
              </span>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 truncate">
                ~{(power.estimatedCostVnd || 0).toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-400">₫</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột Phải (7 cols): Chi tiết các Domain RAPL & Biểu đồ xung nhịp */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Danh sách các Miền Điện Năng (RAPL Domains) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Phân bổ điện năng theo thành phần phần cứng (RAPL Domains):
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                {power.zones.length} Miền đo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. CPU Package */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    <Cpu className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    CPU Package (Socket)
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                    {power.packageWatts.toFixed(1)} W
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (power.packageWatts / pl1Limit) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Tổng công suất toàn bộ socket chip
                </span>
              </div>

              {/* 2. CPU Cores (PP0) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    <Zap className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    Cores (PP0)
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {power.coresWatts.toFixed(1)} W
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        power.packageWatts > 0 ? (power.coresWatts / power.packageWatts) * 100 : 50
                      )}%`
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Nhân tính toán xử lý logic
                </span>
              </div>

              {/* 3. Uncore (PP1) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    <Activity className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                    Uncore / Cache (PP1)
                  </span>
                  <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                    {(power.uncoreWatts || 0).toFixed(1)} W
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        power.packageWatts > 0 ? ((power.uncoreWatts || 0) / power.packageWatts) * 100 : 20
                      )}%`
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  L3 Cache, Ring Bus & iGPU
                </span>
              </div>

              {/* 4. DRAM Memory Controller */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    <Database className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                    DRAM / Bộ nhớ
                  </span>
                  <span className="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400">
                    {(power.dramWatts || 0).toFixed(1)} W
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(10, ((power.dramWatts || 0) / 20) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Kênh điều khiển & thanh RAM
                </span>
              </div>
            </div>
          </div>

          {/* Biểu đồ xung nhịp tiêu thụ điện (Sparkline History) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="flex items-center gap-1 text-[11px]">
                <TrendingUp className="w-3 h-3 text-amber-500" />
                Lịch sử biến thiên công suất (Watts theo thời gian):
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Max: {maxHistoryWatts.toFixed(0)}W
              </span>
            </div>

            {/* Sparkline Bars */}
            <div className="h-16 flex items-end gap-1 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
              {powerHistory.map((item, idx) => {
                const heightPct = Math.min(100, Math.max(8, (item.watts / maxHistoryWatts) * 100));
                const isOverPl1 = item.watts > pl1Limit;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col justify-end items-center group relative h-full"
                  >
                    {/* Tooltip hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-900 text-white text-[9px] px-1 py-0.5 rounded pointer-events-none whitespace-nowrap z-20 font-mono shadow-md">
                      {item.watts.toFixed(1)}W
                    </div>
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        isOverPl1
                          ? 'bg-rose-500'
                          : item.watts > pl1Limit * 0.7
                          ? 'bg-amber-500'
                          : 'bg-emerald-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
              <span>Đo gần nhất</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Hiện tại: {currentWatts.toFixed(1)} W
              </span>
              <span>Thời gian thực (1.5s/lần)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
