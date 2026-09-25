// filepath: frontend/src/components/dashboard/SystemAlertsSection.tsx
import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Cpu,
  HardDrive,
  Clock,
  Ban,
  Unlock,
  CheckCircle2,
  Terminal,
  Activity,
  Plus,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { SystemAlert } from '../../types/security.types';
import {
  getSecurityStatusApi,
  getSelfHealingStatusApi,
  unbanIpApi,
  banIpApi,
  triggerManualCleanApi
} from '../../api/security.api';

interface SystemAlertsSectionProps {
  token: string;
  socket: Socket | null;
}

export const SystemAlertsSection: React.FC<SystemAlertsSectionProps> = ({ token, socket }) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [bannedIps, setBannedIps] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ban' | 'heal'>('all');
  const [loading, setLoading] = useState(false);
  const [recentBanner, setRecentBanner] = useState<SystemAlert | null>(null);

  // Modal thêm IP chặn thủ công
  const [showBanModal, setShowBanModal] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  // Trạng thái thao tác dọn dẹp thủ công
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  // Mở rộng chi tiết log của từng item
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Nạp dữ liệu ban đầu
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [secRes, healRes] = await Promise.all([
        getSecurityStatusApi(token),
        getSelfHealingStatusApi(token)
      ]);

      const initialAlerts: SystemAlert[] = [];
      if (secRes.success && secRes.data) {
        setBannedIps(secRes.data.bannedIps || []);
        if (secRes.data.alerts) {
          initialAlerts.push(...secRes.data.alerts);
        }
      }

      if (healRes.success && healRes.data && healRes.data.healingLogs) {
        initialAlerts.push(...healRes.data.healingLogs);
      }

      // Sắp xếp theo timestamp giảm dần
      initialAlerts.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setAlerts(initialAlerts);
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu cảnh báo hệ thống:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Lắng nghe sự kiện WebSocket thời gian thực từ Backend
  useEffect(() => {
    if (!socket) return;

    // 1. Khi có sự kiện chặn Hacker (Auto-Ban)
    const handleBan = (alertItem: SystemAlert) => {
      setAlerts((prev) => [alertItem, ...prev.filter((a) => a.id !== alertItem.id)]);
      if (alertItem.ip) {
        setBannedIps((prev) => (prev.includes(alertItem.ip!) ? prev : [alertItem.ip!, ...prev]));
      }
      setRecentBanner(alertItem);
    };

    // 2. Khi có sự kiện Tự phục hồi hệ thống (Self-Healing)
    const handleSelfHeal = (alertItem: SystemAlert) => {
      setAlerts((prev) => [alertItem, ...prev.filter((a) => a.id !== alertItem.id)]);
      setRecentBanner(alertItem);
    };

    // 3. Khi mở chặn IP (Unban)
    const handleUnban = (alertItem: SystemAlert) => {
      setAlerts((prev) => [alertItem, ...prev]);
      if (alertItem.ip) {
        setBannedIps((prev) => prev.filter((ip) => ip !== alertItem.ip));
      }
    };

    socket.on('security:ban', handleBan);
    socket.on('selfhealing:action', handleSelfHeal);
    socket.on('security:unban', handleUnban);

    return () => {
      socket.off('security:ban', handleBan);
      socket.off('selfhealing:action', handleSelfHeal);
      socket.off('security:unban', handleUnban);
    };
  }, [socket]);

  // Xử lý mở chặn IP
  const handleUnban = async (ip: string) => {
    if (!confirm(`Bạn có chắc muốn gỡ bỏ lệnh chặn đối với IP ${ip}?`)) return;
    try {
      const res = await unbanIpApi(token, ip);
      if (res.success) {
        setBannedIps((prev) => prev.filter((item) => item !== ip));
        fetchAllData();
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert('Không thể gỡ chặn IP');
    }
  };

  // Xử lý thêm IP chặn thủ công
  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    setIsSubmittingBan(true);
    try {
      const res = await banIpApi(token, manualIp.trim(), manualReason.trim() || 'Chặn thủ công');
      if (res.success) {
        setManualIp('');
        setManualReason('');
        setShowBanModal(false);
        fetchAllData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi khi gửi lệnh chặn IP');
    } finally {
      setIsSubmittingBan(false);
    }
  };

  // Xử lý dọn dẹp thủ công
  const handleTriggerClean = async (type: 'ram' | 'disk' | 'all') => {
    setIsCleaning(true);
    setCleanFeedback(null);
    try {
      const res = await triggerManualCleanApi(token, type);
      setCleanFeedback(res.message || 'Thao tác hoàn tất!');
      fetchAllData();
      setTimeout(() => setCleanFeedback(null), 4000);
    } catch (e) {
      setCleanFeedback('Lỗi khi kích hoạt dọn dẹp');
    } finally {
      setIsCleaning(false);
    }
  };

  // Định dạng thời gian
  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch {
      return iso;
    }
  };

  // Lọc danh sách cảnh báo
  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === 'ban') return alert.type === 'ban' || alert.type === 'unban';
    if (activeFilter === 'heal') return alert.type === 'ram_heal' || alert.type === 'disk_heal';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4">
      {/* 1. Header Section */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 via-amber-500/10 to-emerald-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Hệ Thống Tự Vệ & Cứu Hộ (Self-Healing & Auto-Ban)
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active 24/7
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự động chặn IP brute-force SSH & tự cứu hộ khi RAM &gt; 95%, Ổ cứng &gt; 90%
            </p>
          </div>
        </div>

        {/* Nút hành động nhanh */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleTriggerClean('ram')}
            disabled={isCleaning}
            title="Đồng bộ đĩa và giải phóng bộ đệm RAM Cache"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Xả RAM Cache</span>
          </button>

          <button
            onClick={() => handleTriggerClean('disk')}
            disabled={isCleaning}
            title="Dọn journalctl logs và apt cache an toàn"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Dọn Ổ Đĩa</span>
          </button>

          <button
            onClick={() => setShowBanModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-rose-400" />
            <span>Chặn IP</span>
          </button>
        </div>
      </div>

      {/* 2. Banner Cảnh Báo Khẩn Cấp Realtime (Hiển thị khi vừa có sự kiện chặn/cứu hộ) */}
      {recentBanner && (
        <div className="mx-4 sm:mx-5 animate-in slide-in-from-top-2 duration-300">
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 shadow-lg ${
              recentBanner.level === 'critical'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {recentBanner.level === 'critical' ? (
                <Ban className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-bounce" />
              ) : (
                <RotateCcw className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-spin" />
              )}
              <div>
                <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                  <span>{recentBanner.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 font-mono">
                    {formatTimestamp(recentBanner.timestamp)}
                  </span>
                </div>
                <div className="text-xs mt-0.5 opacity-90">
                  {recentBanner.reason || recentBanner.details || recentBanner.action}
                </div>
              </div>
            </div>
            <button
              onClick={() => setRecentBanner(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-black/30 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {cleanFeedback && (
        <div className="mx-4 sm:mx-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{cleanFeedback}</span>
        </div>
      )}

      {/* 3. Thống Kê Nhanh (Stat Summary Badges) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 sm:px-5">
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
            IP Đã Bị Chặn
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-rose-400 flex items-center gap-1.5 mt-0.5">
            <Ban className="w-4 h-4" />
            {bannedIps.length}
          </span>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
            Ngưỡng Kích Hoạt RAM
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-cyan-300 flex items-center gap-1.5 mt-0.5">
            <Cpu className="w-4 h-4" />
            &gt; 95% (2m)
          </span>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
            Ngưỡng Kích Hoạt Disk
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-amber-300 flex items-center gap-1.5 mt-0.5">
            <HardDrive className="w-4 h-4" />
            &gt; 90%
          </span>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
            Tổng Số Hành Động
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-emerald-400 flex items-center gap-1.5 mt-0.5">
            <Activity className="w-4 h-4" />
            {alerts.length}
          </span>
        </div>
      </div>

      {/* 4. Bộ Lọc Tabs (Filter Tabs) */}
      <div className="px-4 sm:px-5 flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Tất cả ({alerts.length})
          </button>
          <button
            onClick={() => setActiveFilter('ban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'ban'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/50'
            }`}
          >
            <Ban className="w-3 h-3 text-rose-400" />
            Chặn Hacker ({alerts.filter((a) => a.type === 'ban' || a.type === 'unban').length})
          </button>
          <button
            onClick={() => setActiveFilter('heal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'heal'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50'
            }`}
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            Tự Phục Hồi ({alerts.filter((a) => a.type === 'ram_heal' || a.type === 'disk_heal').length})
          </button>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* 5. Danh Sách Nhật Ký Hành Động (Action Logs List) */}
      <div className="px-4 sm:px-5 pb-5 space-y-2.5 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800/60 text-slate-500 text-xs">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            Hệ thống an toàn! Chưa có sự cố tấn công brute-force hoặc tràn ngưỡng RAM/Disk nào.
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const isBan = item.type === 'ban';
            const isUnban = item.type === 'unban';
            const isRam = item.type === 'ram_heal';
            const isDisk = item.type === 'disk_heal';
            const isExpanded = !!expandedAlerts[item.id];

            return (
              <div
                key={item.id}
                className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Icon đại diện */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isBan
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isUnban
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isRam
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isBan ? (
                        <Ban className="w-4 h-4" />
                      ) : isUnban ? (
                        <Unlock className="w-4 h-4" />
                      ) : isRam ? (
                        <Cpu className="w-4 h-4" />
                      ) : (
                        <HardDrive className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      {/* Tiêu đề & Tag */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {item.title}
                        </span>
                        {item.ip && (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            {item.ip}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                            isBan
                              ? 'bg-rose-500/10 text-rose-400'
                              : isUnban
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-cyan-500/10 text-cyan-400'
                          }`}
                        >
                          {item.method || item.type}
                        </span>
                      </div>

                      {/* Chi tiết nội dung */}
                      <p className="text-xs text-slate-300 mt-1">
                        {item.reason || item.details || item.action}
                      </p>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động mở rộng hoặc gỡ chặn */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.ip && isBan && bannedIps.includes(item.ip) && (
                      <button
                        onClick={() => handleUnban(item.ip!)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Unlock className="w-3 h-3 text-emerald-400" />
                        <span>Gỡ chặn</span>
                      </button>
                    )}

                    {item.logs && item.logs.length > 0 && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        title="Xem log thực thi lệnh"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Phần mở rộng hiển thị log chi tiết */}
                {isExpanded && item.logs && (
                  <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1 mb-1 font-sans">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      <span>Nhật ký thực thi lệnh máy chủ:</span>
                    </div>
                    {item.logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. Modal Chặn IP Thủ Công */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-500" />
                Chặn Địa Chỉ IP Thủ Công
              </h4>
              <button
                onClick={() => setShowBanModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualBan} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Địa chỉ IPv4 cần chặn:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 192.241.22.45"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Lý do chặn:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Quét cổng bất thường, spam request..."
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBan}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBan ? 'Đang thực thi...' : 'Kích Hoạt Chặn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
