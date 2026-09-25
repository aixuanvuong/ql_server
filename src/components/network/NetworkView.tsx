// filepath: frontend/src/components/network/NetworkView.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Globe,
  Wifi,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  Server,
  Activity,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  XCircle,
  Lock,
  Cpu,
  Layers,
  ChevronDown
} from 'lucide-react';
import { NetworkOverview, NetworkConnection, NetworkAuditResult, PingResult, DnsResult } from '../../types/network.types';
import { getNetworkOverviewApi, pingTestApi, dnsLookupApi, killProcessApi, auditNetworkAiApi } from '../../api/network.api';

interface NetworkViewProps {
  token: string;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ token }) => {
  const [overview, setOverview] = useState<NetworkOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bộ lọc kết nối
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'internet' | 'listen' | 'inbound' | 'local'>('all');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');

  // Công cụ AI Audit
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<NetworkAuditResult | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Công cụ Ping & DNS
  const [pingTarget, setPingTarget] = useState('8.8.8.8');
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  const [dnsDomain, setDnsDomain] = useState('google.com');
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsResult | null>(null);

  // Thao tác Kill PID
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Tự động tải dữ liệu
  const fetchOverview = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await getNetworkOverviewApi(token);
      if (res.success && res.data) {
        setOverview(res.data);
        setErrorMsg(null);
      } else {
        if (!quiet) setErrorMsg(res.message || 'Lỗi khi tải thông tin hạ tầng mạng');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      if (!quiet) setErrorMsg(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOverview();
    // Tự động làm mới mỗi 4 giây
    const timer = setInterval(() => {
      fetchOverview(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchOverview]);

  // Xử lý AI Audit
  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    setShowAuditModal(true);
    try {
      const res = await auditNetworkAiApi(token);
      if (res.success && res.data) {
        setAuditResult(res.data);
      } else {
        setAuditResult({
          analysis: `Không thể hoàn tất phân tích: ${res.message || 'Lỗi máy chủ'}`,
          safetyScore: 70,
          suggestedCommands: ['sudo netstat -tlpn']
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setAuditResult({
        analysis: `Lỗi kết nối AI: ${msg}`,
        safetyScore: 60,
        suggestedCommands: ['sudo ss -tulpn']
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // Xử lý Ping
  const handlePingTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingTarget.trim()) return;
    setPingLoading(true);
    try {
      const res = await pingTestApi(token, pingTarget.trim());
      if (res.success && res.data) {
        setPingResult(res.data);
      } else {
        setPingResult({ success: false, target: pingTarget, latencyMs: null, error: res.message });
      }
    } finally {
      setPingLoading(false);
    }
  };

  // Xử lý DNS
  const handleDnsLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dnsDomain.trim()) return;
    setDnsLoading(true);
    try {
      const res = await dnsLookupApi(token, dnsDomain.trim());
      if (res.success && res.data) {
        setDnsResult(res.data);
      } else {
        setDnsResult({ success: false, domain: dnsDomain, ipv4: [], ipv6: [], error: res.message });
      }
    } finally {
      setDnsLoading(false);
    }
  };

  // Xử lý Kill Process
  const handleKillProcess = async (pid: number, procName: string) => {
    if (!confirm(`Bạn có chắc muốn dừng tiến trình '${procName}' (PID ${pid}) không?`)) {
      return;
    }
    setKillingPid(pid);
    try {
      const res = await killProcessApi(token, pid);
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
      fetchOverview(true);
    } finally {
      setKillingPid(null);
    }
  };

  // Định dạng bytes
  const formatSpeed = (bytesPerSec: number = 0) => {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  const formatTotalBytes = (bytes: number = 0) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Lọc kết nối
  const filteredConnections = useMemo(() => {
    if (!overview || !overview.connections) return [];
    return overview.connections.filter((conn) => {
      // 1. Lọc theo hướng
      if (filterDirection === 'internet' && !conn.isInternet) return false;
      if (filterDirection === 'listen' && conn.state !== 'LISTEN') return false;
      if (filterDirection === 'inbound' && conn.direction !== 'inbound') return false;
      if (filterDirection === 'local' && conn.isInternet) return false;

      // 2. Lọc theo tên tiến trình
      if (selectedProcess !== 'all' && conn.process !== selectedProcess) return false;

      // 3. Tìm kiếm text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProc = conn.process?.toLowerCase().includes(q);
        const matchPid = conn.pid?.toString().includes(q);
        const matchPeer = conn.peerAddress?.toLowerCase().includes(q);
        const matchHost = conn.destinationHost?.toLowerCase().includes(q);
        const matchLocal = `${conn.localAddress}:${conn.localPort}`.includes(q);
        const matchService = conn.serviceName?.toLowerCase().includes(q);
        return matchProc || matchPid || matchPeer || matchHost || matchLocal || matchService;
      }

      return true;
    });
  }, [overview, filterDirection, selectedProcess, searchQuery]);

  // Danh sách các ứng dụng duy nhất để lọc dropdown
  const uniqueProcesses = useMemo(() => {
    if (!overview || !overview.connections) return [];
    const set = new Set<string>();
    overview.connections.forEach((c) => {
      if (c.process) set.add(c.process);
    });
    return Array.from(set).sort();
  }, [overview]);

  if (isLoading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Đang quét hạ tầng mạng và lưu lượng Internet máy chủ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Thanh tiêu đề và nút chức năng */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm dark:shadow-md transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-md">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Quản Lý Hạ Tầng Mạng & Lưu Lượng Internet
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Live Realtime
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Giám sát ứng dụng truy cập mạng, cổng mở, băng thông và bảo mật kết nối
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchOverview()}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            title="Làm mới thông số mạng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-600 dark:text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={handleRunAiAudit}
            disabled={isAuditing}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-950/30 border border-indigo-400/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-200" />
            <span>AI Đánh Giá An Ninh Mạng</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Bốn Card thông số tổng quan (Metrics Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Download Speed */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 shadow-sm dark:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tốc độ Tải Xuống (RX)</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatSpeed(overview?.summary.totalRxSec)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-500" />
            <span>Tất cả card mạng</span>
          </div>
        </div>

        {/* Upload Speed */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 shadow-sm dark:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tốc độ Tải Lên (TX)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatSpeed(overview?.summary.totalTxSec)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>Đang phát tán lưu lượng</span>
          </div>
        </div>

        {/* Internet Outbound Connections */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 shadow-sm dark:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang Ra Internet</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {overview?.summary.internetConnections ?? 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">kết nối</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Radio className="w-3 h-3 text-blue-500" />
            <span>Trao đổi dữ liệu ngoài</span>
          </div>
        </div>

        {/* Listening Open Ports */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 shadow-sm dark:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cổng Dịch Vụ Mở</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {overview?.summary.listeningPorts ?? 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">cổng</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Server className="w-3 h-3 text-amber-500" />
            <span>Lắng nghe kết nối (Listen)</span>
          </div>
        </div>
      </div>

      {/* 3. Danh sách Card Mạng (Network Interfaces Grid) */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-sm dark:shadow-md transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Card Mạng Hệ Thống (Network Interfaces)</h3>
            <span className="text-xs text-slate-500">
              (Gateway: <span className="font-mono text-slate-700 dark:text-slate-300">{overview?.defaultGateway || '192.168.1.1'}</span>)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {overview?.interfaces.map((iface) => (
            <div
              key={iface.name}
              className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{iface.name}</span>
                  {iface.internal ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">Loopback</span>
                  ) : iface.virtual ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">Virtual</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">Physical</span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    iface.operstate === 'up'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      iface.operstate === 'up' ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-rose-500 dark:bg-rose-400'
                    }`}
                  />
                  {iface.operstate.toUpperCase()}
                </span>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">IPv4:</span>
                  <span className="text-cyan-600 dark:text-cyan-300 font-medium">{iface.ip4}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">MAC:</span>
                  <span className="text-slate-600 dark:text-slate-400">{iface.mac}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">MTU / Speed:</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {iface.mtu} | {iface.speed ? `${iface.speed} Mbps` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ArrowDownCircle className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  {formatTotalBytes(iface.rxBytes)}
                </span>
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ArrowUpCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {formatTotalBytes(iface.txBytes)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Danh Sách Kết Nối & Ứng Dụng Đang Ra Internet (Active Connections) */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-sm dark:shadow-md space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Ứng Dụng Đang Kết Nối Mạng & Lưu Lượng Internet
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {filteredConnections.length} kết nối
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Xem ứng dụng nào (PID, Process) đang truy cập những gì ở đâu, cổng và đích đến
            </p>
          </div>

          {/* Top ứng dụng theo số kết nối */}
          {overview?.summary.topProcesses && overview.summary.topProcesses.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500">Ứng dụng nhiều kết nối nhất:</span>
              {overview.summary.topProcesses.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedProcess(selectedProcess === p.name ? 'all' : p.name)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                    selectedProcess === p.name
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.name} ({p.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên ứng dụng, PID, IP đích, cổng (ví dụ: node, 443, cloudflare)..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Tabs bộ lọc hướng */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] overflow-x-auto">
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterDirection === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Tất cả ({overview?.connections.length || 0})
            </button>
            <button
              onClick={() => setFilterDirection('internet')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterDirection === 'internet'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              🌐 Ra Internet ({overview?.summary.internetConnections || 0})
            </button>
            <button
              onClick={() => setFilterDirection('listen')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterDirection === 'listen'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              🚪 Đang Lắng Nghe ({overview?.summary.listeningPorts || 0})
            </button>
            <button
              onClick={() => setFilterDirection('inbound')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterDirection === 'inbound'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              📥 Khách Kết Nối Vào
            </button>
          </div>

          {/* Dropdown Process Filter */}
          <div className="relative">
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer appearance-none pr-8"
            >
              <option value="all">Tất cả ứng dụng</option>
              {uniqueProcesses.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Bảng danh sách kết nối */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Ứng Dụng (Process & PID)</th>
                  <th className="py-2.5 px-3">Địa Chỉ Nội Bộ</th>
                  <th className="py-2.5 px-3">Đích Đến (Truy Cập Ở Đâu)</th>
                  <th className="py-2.5 px-3">Dịch Vụ & Loại Mạng</th>
                  <th className="py-2.5 px-3">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-[11px]">
                {filteredConnections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      Không tìm thấy kết nối nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredConnections.map((conn) => {
                    const isListen = conn.state === 'LISTEN';
                    return (
                      <tr key={conn.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        {/* Process & PID */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 font-sans">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                isListen
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : conn.isInternet
                                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {conn.protocol.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                                {conn.process}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">PID: {conn.pid || 'N/A'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Local Address */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <div>
                            {conn.localAddress}
                            <span className="text-amber-600 dark:text-amber-400 font-bold">:{conn.localPort}</span>
                          </div>
                        </td>

                        {/* Destination */}
                        <td className="py-2.5 px-3">
                          {isListen ? (
                            <span className="text-slate-500 italic font-sans">
                              Đang chờ kết nối từ client (*:*)
                            </span>
                          ) : (
                            <div>
                              <div className="text-cyan-600 dark:text-cyan-300 font-medium">
                                {conn.destinationHost}
                                <span className="text-cyan-600 dark:text-cyan-400 font-bold">:{conn.peerPort}</span>
                              </div>
                              {conn.destinationHost !== conn.peerAddress && (
                                <span className="text-[10px] text-slate-500">IP: {conn.peerAddress}</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Service & Classification */}
                        <td className="py-2.5 px-3 font-sans">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 dark:text-slate-200 font-medium text-[11px]">{conn.serviceName}</span>
                            {isListen ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                <Lock className="w-2.5 h-2.5" />
                                Cổng Lắng Nghe
                              </span>
                            ) : conn.isInternet ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                <Globe className="w-2.5 h-2.5" />
                                Internet Public
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Server className="w-2.5 h-2.5" />
                                Mạng Nội Bộ / LAN
                              </span>
                            )}
                          </div>
                        </td>

                        {/* State */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              conn.state === 'ESTABLISHED'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : conn.state === 'LISTEN'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {conn.state}
                          </span>
                        </td>

                        {/* Action: Kill */}
                        <td className="py-2.5 px-3 text-right">
                          {conn.pid && conn.pid > 1 ? (
                            <button
                              onClick={() => handleKillProcess(conn.pid, conn.process)}
                              disabled={killingPid === conn.pid}
                              title={`Dừng tiến trình ${conn.process} (PID ${conn.pid})`}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-[10px] font-sans font-medium transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>{killingPid === conn.pid ? 'Đang dừng...' : 'Ngắt kết nối'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans">Bảo vệ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Tiện ích Hạ Tầng Mạng (Network Tools: Ping & DNS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ping Test */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-sm dark:shadow-md space-y-3 transition-colors">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Kiểm Tra Độ Trễ Mạng (Ping Test)</h4>
          </div>
          <form onSubmit={handlePingTest} className="flex gap-2">
            <input
              type="text"
              value={pingTarget}
              onChange={(e) => setPingTarget(e.target.value)}
              placeholder="Nhập IP hoặc domain (8.8.8.8, 1.1.1.1, google.com)..."
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono shadow-inner"
            />
            <button
              type="submit"
              disabled={pingLoading}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {pingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Ping</span>
            </button>
          </form>

          {pingResult && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Đích đến: {pingResult.target}</span>
                {pingResult.success ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {pingResult.latencyMs} ms
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Thất bại</span>
                )}
              </div>
              {pingResult.rawOutput && (
                <pre className="text-[10px] text-slate-600 dark:text-slate-400 overflow-x-auto max-h-20 whitespace-pre-wrap pt-1 border-t border-slate-200 dark:border-slate-800/80">
                  {pingResult.rawOutput}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* DNS Lookup */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-sm dark:shadow-md space-y-3 transition-colors">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Tra Cứu Phân Giải Tên Miền (DNS Lookup)</h4>
          </div>
          <form onSubmit={handleDnsLookup} className="flex gap-2">
            <input
              type="text"
              value={dnsDomain}
              onChange={(e) => setDnsDomain(e.target.value)}
              placeholder="Nhập tên miền (google.com, github.com, cloudflare.com)..."
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono shadow-inner"
            />
            <button
              type="submit"
              disabled={dnsLoading}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {dnsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Tra Cứu</span>
            </button>
          </form>

          {dnsResult && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-600 dark:text-slate-400">Tên miền: {dnsResult.domain}</div>
              {dnsResult.success ? (
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">Bản ghi IPv4 (A):</div>
                  <div className="text-slate-700 dark:text-slate-300 text-[11px] pl-2">
                    {dnsResult.ipv4.length > 0 ? dnsResult.ipv4.join(', ') : 'Không có'}
                  </div>
                  {dnsResult.ipv6.length > 0 && (
                    <>
                      <div className="text-cyan-600 dark:text-cyan-400 text-[11px] font-bold mt-1">Bản ghi IPv6 (AAAA):</div>
                      <div className="text-slate-700 dark:text-slate-300 text-[11px] pl-2">{dnsResult.ipv6.join(', ')}</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-rose-600 dark:text-rose-400">{dnsResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. Modal Đánh Giá An Ninh Mạng Bằng Trợ Lý AI (Gemini AI Audit Modal) */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Phân Tích An Ninh Mạng (Gemini 3.8 Flash)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Kiểm tra kết nối ra ngoài, cổng mở và lỗ hổng bảo mật</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {isAuditing ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-indigo-500 dark:text-indigo-400 animate-spin" />
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Trợ lý AI đang rà soát từng kết nối Internet và cổng mở...</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Phân tích rò rỉ dữ liệu, tiến trình lạ và an toàn tường lửa</p>
                </div>
              ) : auditResult ? (
                <div className="space-y-4">
                  {/* Điểm an toàn */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Điểm Đánh Giá An Toàn Mạng</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                        {auditResult.safetyScore} / 100
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        auditResult.safetyScore >= 85
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : auditResult.safetyScore >= 70
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {auditResult.safetyScore >= 85
                        ? 'RẤT AN TOÀN'
                        : auditResult.safetyScore >= 70
                        ? 'CẦN LƯU Ý'
                        : 'CẢNH BÁO NGUY HIỂM'}
                    </div>
                  </div>

                  {/* Nội dung Markdown */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                    {auditResult.analysis}
                  </div>

                  {/* Lệnh gợi ý thực thi */}
                  {auditResult.suggestedCommands && auditResult.suggestedCommands.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        Lệnh kiểm tra bổ sung đề xuất:
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        {auditResult.suggestedCommands.map((cmd, idx) => (
                          <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-lg text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-800/80">
                            {cmd}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors cursor-pointer"
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
