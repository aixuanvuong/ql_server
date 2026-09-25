// filepath: frontend/src/components/update/UpdateModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  GitCommit,
  Terminal,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { checkUpdateApi, triggerUpdateApi, getUpdateStatusApi } from '../../api/update.api';
import { CheckUpdateResponse } from '../../types/update.types';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  socket: Socket | null;
  onUpdateCompleted?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  token,
  socket,
  onUpdateCompleted
}) => {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<CheckUpdateResponse | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn log console
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Lắng nghe sự kiện WebSocket update từ server
  useEffect(() => {
    if (!socket) return;

    const handleLog = (logLine: string) => {
      setLogs((prev) => [...prev, logLine]);
    };

    const handleCompleted = (data: { success: boolean; message: string }) => {
      setIsUpdating(false);
      setCompleted(data.success);
      if (data.success) {
        setCountdown(6);
      } else {
        setErrorMsg(data.message || 'Cập nhật thất bại.');
      }
    };

    socket.on('update:log', handleLog);
    socket.on('update:completed', handleCompleted);

    return () => {
      socket.off('update:log', handleLog);
      socket.off('update:completed', handleCompleted);
    };
  }, [socket]);

  // Bộ đếm đếm ngược tải lại trang sau khi cập nhật thành công
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Kiểm tra phiên bản khi mở Modal
  const handleCheckUpdate = async () => {
    setChecking(true);
    setErrorMsg(null);
    try {
      const res = await checkUpdateApi(token);
      setUpdateInfo(res);
      if (res.isUpdating) {
        setIsUpdating(true);
        // Tải log hiện tại
        const statusRes = await getUpdateStatusApi(token);
        if (statusRes.success && statusRes.data.logs) {
          setLogs(statusRes.data.logs);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      setErrorMsg(msg);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleCheckUpdate();
    }
  }, [isOpen]);

  // Khởi chạy cập nhật
  const handleStartUpdate = async () => {
    if (!confirm('Bạn có chắc chắn muốn cập nhật toàn bộ hệ thống lên phiên bản mới nhất từ GitHub không? Tiến trình sẽ tự động build lại Frontend và restart dịch vụ.')) {
      return;
    }

    setIsUpdating(true);
    setCompleted(null);
    setErrorMsg(null);
    setLogs(['[Khởi động] Đang kết nối tới máy chủ và kích hoạt kịch bản tự động cập nhật...']);

    try {
      const res = await triggerUpdateApi(token);
      if (!res.success) {
        setIsUpdating(false);
        setErrorMsg(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      setIsUpdating(false);
      setErrorMsg(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Tự Động Cập Nhật Hệ Thống Trực Tuyến
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  1-Click Auto Update
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Đồng bộ phiên bản mới nhất từ kho GitHub không cần gõ lệnh máy chủ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {completed && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white">Cập nhật thành công!</div>
                  <div className="text-[11px] text-emerald-300/80">
                    Máy chủ đã nạp phiên bản mới nhất. Đang tự động làm mới giao diện sau {countdown}s...
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all cursor-pointer"
              >
                Làm mới ngay
              </button>
            </div>
          )}

          {/* Khối trạng thái phiên bản */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <span>Thông Tin Phiên Bản Hiện Tại</span>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={checking || isUpdating}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                <span>Kiểm tra lại</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Commit Cục Bộ Máy Chủ</span>
                <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                  <GitCommit className="w-3.5 h-3.5 text-slate-400" />
                  {updateInfo?.localCommit || 'main-local'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Bản Mới Nhất GitHub</span>
                <span className="text-cyan-300 font-bold flex items-center gap-1 mt-0.5">
                  <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                  {updateInfo?.remoteCommit || 'origin/main'}
                </span>
              </div>
            </div>

            {updateInfo?.hasUpdate ? (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Có {updateInfo.behindCount} bản cập nhật mới trên GitHub!</span>
                </div>
                {updateInfo.commitMessage && (
                  <p className="text-[11px] text-slate-400 italic font-sans pl-5">
                    "{updateInfo.commitMessage}"
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Hệ thống của bạn đang chạy phiên bản mới nhất! Bạn vẫn có thể bấm Cập nhật lại bất cứ lúc nào để đồng bộ lại toàn bộ file.</span>
              </div>
            )}
          </div>

          {/* Màn hình Console Terminal hiển thị Log Cập Nhật */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Tiến Trình Thực Thi & Nhật Ký Server
              </span>
              {isUpdating && (
                <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang xử lý trong nền...
                </span>
              )}
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 h-52 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">
                  Chưa có tiến trình nào đang chạy. Nhấn nút "Cập nhật hệ thống ngay" bên dưới để bắt đầu tự động hóa quy trình Git pull, NPM build và restart server.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`leading-relaxed ${
                      log.includes('✅') || log.includes('🎉')
                        ? 'text-emerald-400 font-bold'
                        : log.includes('❌')
                        ? 'text-rose-400 font-bold'
                        : log.includes('📥') || log.includes('📦') || log.includes('🔨') || log.includes('🔄')
                        ? 'text-cyan-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <div className="text-[11px] text-slate-500">
            Tự động kéo code, build frontend và restart dịch vụ Nginx + PM2
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>

            <button
              onClick={handleStartUpdate}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-950 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Cập Nhật Tự Động...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Cập Nhật Hệ Thống Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
