// filepath: frontend/src/components/ai/CommandApprovalModal.tsx
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Terminal,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Folder,
  Zap
} from 'lucide-react';
import { CommandApprovalRequestData } from '../../api/ai.api';

interface CommandApprovalModalProps {
  request: CommandApprovalRequestData | null;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  isProcessing?: boolean;
}

export const CommandApprovalModal: React.FC<CommandApprovalModalProps> = ({
  request,
  onApprove,
  onReject,
  isProcessing = false
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);

  useEffect(() => {
    if (!request) return;

    const calculateRemaining = () => {
      const remainingMs = request.expiresAt - Date.now();
      const s = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(s);
      if (s <= 0) {
        onReject(request.approvalId);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [request, onReject]);

  if (!request) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(request.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const percentLeft = Math.min(100, Math.max(0, (secondsLeft / 60) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/80 rounded-2xl w-full max-w-xl shadow-2xl shadow-rose-500/10 dark:shadow-rose-950/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header Cảnh báo đỏ nổi bật */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/90 dark:via-slate-900 dark:to-rose-950/70 border-b border-rose-200 dark:border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-500 dark:text-rose-400 flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-6 h-6 text-rose-500 dark:text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-1.5">
                  <span>PHÊ DUYỆT LỆNH HỆ THỐNG</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 uppercase font-mono font-semibold">
                    Human-in-the-Loop
                  </span>
                </h3>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-200/80 mt-0.5">
                AI Agent yêu cầu bạn cấp quyền để thực thi câu lệnh trên máy chủ
              </p>
            </div>
          </div>

          {/* Đếm ngược thời gian */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-500/40">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>{secondsLeft}s</span>
            </div>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Tự hủy an toàn</span>
          </div>
        </div>

        {/* Thanh tiến trình đếm ngược */}
        <div className="w-full bg-slate-100 dark:bg-slate-950 h-1">
          <div
            className={`h-full transition-all duration-1000 ${
              secondsLeft <= 15 ? 'bg-rose-500' : 'bg-amber-500 dark:bg-amber-400'
            }`}
            style={{ width: `${percentLeft}%` }}
          />
        </div>

        {/* Nội dung chi tiết câu lệnh */}
        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto max-h-[60vh]">
          {/* Tag cảnh báo quyền Sudo / Root */}
          <div className="flex flex-wrap items-center gap-2">
            {request.isSudo ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/50 font-bold text-[11px] animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                CẦN QUYỀN ROOT / SUDO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Quyền Người Dùng Hệ Thống
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
              Bước #{request.iteration} trong Agentic Loop
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
              Timeout: {request.timeoutSeconds}s
            </span>
          </div>

          {/* Khối hiển thị câu lệnh (Code Box) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Câu lệnh chuẩn bị được thực thi:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            <div className="relative group rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 p-3 font-mono text-xs sm:text-sm text-emerald-300 shadow-inner">
              <div className="flex items-start gap-2 break-all whitespace-pre-wrap">
                <span className="text-rose-400 font-bold select-none">$</span>
                <span className="font-semibold text-white selection:bg-rose-500/30">
                  {request.command}
                </span>
              </div>
            </div>
          </div>

          {/* Lý do và giải thích của AI */}
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Mục đích / Giải thích từ AI:
            </span>
            <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed">
              {request.explanation || 'AI muốn thực thi câu lệnh này để thu thập thêm thông số log hoặc khắc phục lỗi hệ thống.'}
            </p>
          </div>

          {/* Thư mục làm việc */}
          {request.workingDirectory && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <Folder className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>Thư mục:</span>
              <span className="text-slate-700 dark:text-slate-300 truncate">{request.workingDirectory}</span>
            </div>
          )}

          {/* Cảnh báo an toàn */}
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300/90 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <span>
              Hãy kiểm tra kỹ câu lệnh trên trước khi duyệt. Nếu bạn không chắc chắn, hãy bấm <strong>Từ chối</strong> để bảo vệ dữ liệu và dịch vụ của máy chủ.
            </span>
          </div>
        </div>

        {/* Footer Actions: 2 Nút Phê duyệt rõ ràng */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onReject(request.approvalId)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/70 hover:border-rose-300 dark:hover:border-rose-500/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>Từ Chối (Hủy Lệnh)</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onApprove(request.approvalId)}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-emerald-100" />
            )}
            <span>Đồng Ý Cho Phép Chạy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
