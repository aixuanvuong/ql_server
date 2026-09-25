// filepath: frontend/src/components/terminal/MobileKeyboardBar.tsx
import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';

interface MobileKeyboardBarProps {
  onSendKey: (data: string) => void;
}

export const MobileKeyboardBar: React.FC<MobileKeyboardBarProps> = ({ onSendKey }) => {
  // Bàn phím phụ hỗ trợ người dùng điện thoại Android / iOS gõ các ký tự và lệnh đặc biệt trong bash
  const actionKeys = [
    { label: 'ESC', code: '\x1b', style: 'bg-slate-800' },
    { label: 'TAB', code: '\t', style: 'bg-slate-800' },
    { label: 'Ctrl+C', code: '\x03', style: 'bg-rose-950/60 text-rose-300 border-rose-500/40' },
    { label: 'sudo', code: 'sudo ', style: 'bg-purple-950/60 text-purple-300 border-purple-500/40 font-bold' },
    { label: 'systemctl', code: 'systemctl ', style: 'bg-slate-800' },
    { label: 'status', code: 'systemctl status ', style: 'bg-slate-800' },
    { label: 'restart', code: 'sudo systemctl restart ', style: 'bg-slate-800' },
    { label: 'journalctl', code: 'journalctl -xe --no-pager -n 20\r', style: 'bg-slate-800' },
    { label: 'Ctrl+D', code: '\x04', style: 'bg-slate-800' },
    { label: 'Ctrl+Z', code: '\x1a', style: 'bg-slate-800' },
    { label: '|', code: '|', style: 'bg-slate-800 font-bold' },
    { label: '/', code: '/', style: 'bg-slate-800 font-bold' },
    { label: '~', code: '~', style: 'bg-slate-800 font-bold' },
    { label: '-', code: '-', style: 'bg-slate-800 font-bold' },
    { label: 'ls -la', code: 'ls -la\r', style: 'bg-slate-800' },
    { label: 'df -h', code: 'df -h\r', style: 'bg-slate-800' },
    { label: 'free -h', code: 'free -h\r', style: 'bg-slate-800' },
    { label: 'clear', code: 'clear\r', style: 'bg-slate-800' },
    { label: 'htop', code: 'htop\r', style: 'bg-slate-800' }
  ];

  return (
    <div className="bg-slate-950 border-t border-slate-800/90 p-1.5 sm:p-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none select-none z-30">
      {/* Cụm phím điều hướng mũi tên */}
      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 flex-shrink-0 shadow-inner">
        <button
          type="button"
          onClick={() => onSendKey('\x1b[A')} // Arrow Up
          className="w-8 h-8 flex items-center justify-center bg-slate-800 active:bg-emerald-600 text-slate-200 active:text-white rounded-lg text-xs hover:text-white transition-colors cursor-pointer"
          title="Mũi tên Lên (Lịch sử lệnh trước)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onSendKey('\x1b[B')} // Arrow Down
          className="w-8 h-8 flex items-center justify-center bg-slate-800 active:bg-emerald-600 text-slate-200 active:text-white rounded-lg text-xs hover:text-white transition-colors cursor-pointer"
          title="Mũi tên Xuống"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onSendKey('\x1b[D')} // Arrow Left
          className="w-8 h-8 flex items-center justify-center bg-slate-800 active:bg-emerald-600 text-slate-200 active:text-white rounded-lg text-xs hover:text-white transition-colors cursor-pointer"
          title="Mũi tên Trái"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onSendKey('\x1b[C')} // Arrow Right
          className="w-8 h-8 flex items-center justify-center bg-slate-800 active:bg-emerald-600 text-slate-200 active:text-white rounded-lg text-xs hover:text-white transition-colors cursor-pointer"
          title="Mũi tên Phải"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onSendKey('\r')} // Enter
          className="w-9 h-8 flex items-center justify-center bg-emerald-600 active:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md shadow-emerald-950/40"
          title="Phím Enter (Thực thi)"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Các phím ký tự và lệnh tắt nhanh */}
      {actionKeys.map((k) => (
        <button
          type="button"
          key={k.label}
          onClick={() => onSendKey(k.code)}
          className={`h-8 px-2.5 flex items-center justify-center hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-mono font-medium rounded-xl border border-slate-700/80 whitespace-nowrap flex-shrink-0 transition-all shadow-sm cursor-pointer ${
            k.style || 'bg-slate-800'
          }`}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
};
