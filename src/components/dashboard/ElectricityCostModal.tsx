// filepath: frontend/src/components/dashboard/ElectricityCostModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Coins,
  Zap,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  TrendingDown,
  RotateCcw,
  Sliders,
  HelpCircle,
  X,
  Check,
  Server,
  Leaf
} from 'lucide-react';
import { RaplPowerMetrics } from '../../types/system.types';

interface ElectricityCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  power?: RaplPowerMetrics;
  uptimeSeconds?: number;
}

export const ElectricityCostModal: React.FC<ElectricityCostModalProps> = ({
  isOpen,
  onClose,
  power,
  uptimeSeconds = 0
}) => {
  // Biểu giá điện đã lưu (mặc định 2,500đ / kWh)
  const [unitRate, setUnitRate] = useState<number>(() => {
    const saved = localStorage.getItem('ql_electricity_rate');
    return saved ? parseFloat(saved) : 2500;
  });

  // Chế độ tính: 'flat' (giá cố định) hoặc 'evn_tier' (bậc thang sinh hoạt)
  const [pricingMode, setPricingMode] = useState<'flat' | 'evn_tier'>(() => {
    return (localStorage.getItem('ql_electricity_mode') as 'flat' | 'evn_tier') || 'flat';
  });

  // Hệ số công suất toàn hệ thống (PUE / System Factor)
  // 1.0 = Chỉ CPU & RAM | 1.25 = Mini PC/NUC (Main + SSD + Quạt) | 1.5 = Tower/Server lớn
  const [systemFactor, setSystemFactor] = useState<number>(() => {
    const saved = localStorage.getItem('ql_system_factor');
    return saved ? parseFloat(saved) : 1.25;
  });

  // Mốc offset kWh để người dùng có thể reset tính chu kỳ tháng mới
  const [kwhOffset, setKwhOffset] = useState<number>(() => {
    const saved = localStorage.getItem('ql_kwh_offset');
    return saved ? parseFloat(saved) : 0;
  });

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Lưu cấu hình vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('ql_electricity_rate', unitRate.toString());
    localStorage.setItem('ql_electricity_mode', pricingMode);
    localStorage.setItem('ql_system_factor', systemFactor.toString());
  }, [unitRate, pricingMode, systemFactor]);

  if (!isOpen) return null;

  // Công suất hiện tại
  const rawWatts = power?.currentWatts || 35;
  const totalSystemWatts = Math.round(rawWatts * systemFactor * 10) / 10;

  // Tính kWh theo từng mốc thời gian
  const kwhPerHour = totalSystemWatts / 1000;
  const kwhPerDay = kwhPerHour * 24;
  const kwhPerMonth = kwhPerDay * 30;
  const kwhPerYear = kwhPerDay * 365;

  // Hàm tính tiền điện theo bậc thang EVN Việt Nam (Đơn giá 2024 - 2026)
  const calculateEvnCost = (monthlyKwh: number): number => {
    let cost = 0;
    let remaining = monthlyKwh;

    // Bậc 1: 0 - 50 kWh @ 1,893 đ
    const tier1 = Math.min(remaining, 50);
    cost += tier1 * 1893;
    remaining -= tier1;

    // Bậc 2: 51 - 100 kWh @ 1,956 đ
    if (remaining > 0) {
      const tier2 = Math.min(remaining, 50);
      cost += tier2 * 1956;
      remaining -= tier2;
    }

    // Bậc 3: 101 - 200 kWh @ 2,271 đ
    if (remaining > 0) {
      const tier3 = Math.min(remaining, 100);
      cost += tier3 * 2271;
      remaining -= tier3;
    }

    // Bậc 4: 201 - 300 kWh @ 2,860 đ
    if (remaining > 0) {
      const tier4 = Math.min(remaining, 100);
      cost += tier4 * 2860;
      remaining -= tier4;
    }

    // Bậc 5: 301 - 400 kWh @ 3,197 đ
    if (remaining > 0) {
      const tier5 = Math.min(remaining, 100);
      cost += tier5 * 3197;
      remaining -= tier5;
    }

    // Bậc 6: > 400 kWh @ 3,302 đ
    if (remaining > 0) {
      cost += remaining * 3302;
    }

    return Math.round(cost);
  };

  // Tính chi phí theo chế độ đã chọn
  const getCostForKwh = (kwh: number): number => {
    if (pricingMode === 'evn_tier') {
      const monthlyEquivalent = kwh;
      return calculateEvnCost(monthlyEquivalent);
    }
    return Math.round(kwh * unitRate);
  };

  const costPerHour = Math.round(kwhPerHour * (pricingMode === 'evn_tier' ? 2271 : unitRate));
  const costPerDay = Math.round(kwhPerDay * (pricingMode === 'evn_tier' ? 2271 : unitRate));
  const costPerMonth = getCostForKwh(kwhPerMonth);
  const costPerYear = costPerMonth * 12;

  // Tính số liệu tích lũy thực tế từ máy chủ
  const cumulativeKwhRaw = power?.cumulativeKwh || 0;
  const netCumulativeKwh = Math.max(0, cumulativeKwhRaw - kwhOffset);
  const cumulativeCost = Math.round(netCumulativeKwh * systemFactor * (pricingMode === 'evn_tier' ? 2271 : unitRate));

  const handleResetOffset = () => {
    setKwhOffset(cumulativeKwhRaw);
    localStorage.setItem('ql_kwh_offset', cumulativeKwhRaw.toString());
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Đồng Hồ Đo Tiền Điện Máy Chủ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono font-semibold">
                  Intel RAPL Power
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ước tính lượng điện tiêu thụ & hóa đơn tiền điện thực tế theo thời gian
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
          {/* 1. Thẻ Tóm Tắt Chi Phí Trọng Tâm: Hóa Đơn Mỗi Tháng */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 block mb-1 uppercase tracking-wider">
                  Dự Toán Hóa Đơn Điện Khi Chạy 24/7 Mỗi Tháng:
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                    {costPerMonth.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">₫ / tháng</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Khoảng <strong>~{costPerDay.toLocaleString('vi-VN')} ₫/ngày</strong> · Tiêu thụ xấp xỉ <strong>{kwhPerMonth.toFixed(1)} kWh</strong> (số điện/tháng)
                </p>
              </div>

              {/* Thông tin công suất thời gian thực */}
              <div className="bg-white/80 dark:bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/20 flex flex-col justify-center min-w-[170px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500">Công suất toàn máy:</span>
                  <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                    {totalSystemWatts} W
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Chip CPU (RAPL):</span>
                  <span>{rawWatts.toFixed(1)} W</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Hệ số Main/SSD/Nguồn:</span>
                  <span>×{systemFactor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Dự Toán Theo Từng Mốc Thời Gian (Hourly, Daily, Monthly, Yearly) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Mỗi Giờ (1h)
              </span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {costPerHour.toLocaleString('vi-VN')} ₫
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {(kwhPerHour * 1000).toFixed(0)} Wh
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                Mỗi Ngày (24h)
              </span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {costPerDay.toLocaleString('vi-VN')} ₫
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {kwhPerDay.toFixed(2)} kWh
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                Mỗi Tháng (30 ngày)
              </span>
              <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                {costPerMonth.toLocaleString('vi-VN')} ₫
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {kwhPerMonth.toFixed(1)} kWh
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Mỗi Năm (365 ngày)
              </span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {costPerYear.toLocaleString('vi-VN')} ₫
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {kwhPerYear.toFixed(0)} kWh
              </span>
            </div>
          </div>

          {/* 3. Đồng Hồ Đo Tích Lũy Thực Tế (Cumulative Meter) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                Đồng Hồ Điện Năng Tích Lũy Thực Tế
              </span>
              <button
                type="button"
                onClick={handleResetOffset}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium transition-colors cursor-pointer"
                title="Đặt lại mốc tính tiền chu kỳ mới"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại mốc chu kỳ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">Số điện chu kỳ này:</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {netCumulativeKwh.toFixed(4)} <span className="text-xs font-normal">kWh</span>
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tiền điện thực tế phát sinh:</span>
                <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                  {cumulativeCost.toLocaleString('vi-VN')} <span className="text-xs font-normal">₫</span>
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">Thời gian máy chạy (Uptime):</span>
                <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                  {uptimeSeconds > 0 ? `${Math.floor(uptimeSeconds / 86400)} ngày ${Math.floor((uptimeSeconds % 86400) / 3600)}h` : '0h'}
                </span>
              </div>
            </div>

            {isSavedNotice && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                Đã đặt lại mốc đồng hồ tính tiền chu kỳ mới thành công!
              </span>
            )}
          </div>

          {/* 4. Tùy Chỉnh Biểu Giá Điện & Cấu Hình Máy */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-500" />
              Tùy Chỉnh Biểu Giá Điện & Loại Máy Chủ
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chọn chế độ tính giá */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Phương thức tính giá điện:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPricingMode('flat')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                      pricingMode === 'flat'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Giá Cố Định (Flat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode('evn_tier')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                      pricingMode === 'evn_tier'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Bậc Thang EVN (VN)
                  </button>
                </div>
              </div>

              {/* Nhập đơn giá nếu dùng Flat */}
              {pricingMode === 'flat' ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Đơn giá điện (VNĐ / kWh):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={unitRate}
                      onChange={(e) => setUnitRate(Math.max(500, parseFloat(e.target.value) || 2500))}
                      step={100}
                      min={500}
                      max={10000}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">đ / kWh</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setUnitRate(2500)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono cursor-pointer"
                    >
                      Sinh hoạt: 2.500đ
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitRate(3000)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono cursor-pointer"
                    >
                      Phòng trọ: 3.000đ
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitRate(3500)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono cursor-pointer"
                    >
                      3.500đ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Biểu giá EVN 6 bậc (1.893đ - 3.302đ/kWh):
                  </span>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    Tự động tính lũy tiến chính xác theo khung giá điện sinh hoạt của Tập đoàn Điện lực Việt Nam.
                  </p>
                </div>
              )}
            </div>

            {/* Chọn Loại Phần Cứng & Hệ Số Nguồn (PUE) */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Loại máy chủ & Hao phí linh kiện toàn máy:</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono">Hệ số: ×{systemFactor}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSystemFactor(1.0)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    systemFactor === 1.0
                      ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">Chỉ CPU & RAM (1.0x)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Đúng theo cảm biến RAPL</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSystemFactor(1.25)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    systemFactor === 1.25
                      ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">Mini PC / NUC (1.25x)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Bao gồm Main, SSD, Quạt (Khuyên dùng)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSystemFactor(1.5)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    systemFactor === 1.5
                      ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">Thùng Tower / Server (1.5x)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Nguồn to, nhiều quạt, ổ HDD</div>
                </button>
              </div>
            </div>
          </div>

          {/* 5. Lời Khuyên Tiết Kiệm Điện (Eco Mode) */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Mẹo tiết kiệm điện năng cho máy chủ cắm 24/7:</span>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Với mức ăn điện trung bình chỉ <strong>~{totalSystemWatts}W</strong>, máy chủ của bạn chỉ tiêu tốn <strong>~{costPerMonth.toLocaleString('vi-VN')} đ/tháng</strong> (chỉ bằng tiền 2 cốc cà phê). Khi máy chủ ở trạng thái nhàn rỗi (Idle), vi xử lý tự động hạ xung nhịp để tiết kiệm điện tối đa.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Dữ liệu trích xuất từ Linux Intel RAPL Sysfs
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer text-xs shadow-sm"
          >
            Đóng Đồng Hồ
          </button>
        </div>
      </div>
    </div>
  );
};
