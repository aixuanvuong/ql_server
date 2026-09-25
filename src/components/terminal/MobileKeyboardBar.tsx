// filepath: frontend/src/components/terminal/MobileKeyboardBar.tsx
import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';

interface MobileKeyboardBarProps {
  onSendKey: (data: string) => void;
}

export const MobileKeyboardBar: React.FC<MobileKeyboardBarProps> = ({ onSendKey }) => {
  // Bàn phím phụ hỗ trợ người dùng điện thoại Android gõ các ký tự đặc biệt trong bash
  const actionKeys = [
    { label: 'ESC', code: '\x1b' },
    { label: 'TAB', code: '\t' },
    { label: 'Ctrl+C', code: '\x03' },
    { label: 'Ctrl+D', code: '\x04' },
    { label: 'Ctrl+Z', code: '\x1a' },
    { label: '|', code: '|' },
    { label: '/', code: '/' },
    { label: '~', code: '~' },
    { label: 'clear', code: 'clear\r' },
    { label: 'htop', code: 'htop\r' }
  ];

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none select-none z-30">
      {/* Phím điều hướng mũi tên */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 flex-shrink-0">
        <button
          onClick={() => onSendKey('\x1b[A')} // Arrow Up
          className="p-1.5 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded text-xs hover:text-white"
          title="Mũi tên Lên (Lệnh trước)"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSendKey('\x1b[B')} // Arrow Down
          className="p-1.5 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded text-xs hover:text-white"
          title="Mũi tên Xuống"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSendKey('\x1b[D')} // Arrow Left
          className="p-1.5 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded text-xs hover:text-white"
          title="Mũi tên Trái"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSendKey('\x1b[C')} // Arrow Right
          className="p-1.5 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded text-xs hover:text-white"
          title="Mũi tên Phải"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSendKey('\r')} // Enter
          className="p-1.5 bg-emerald-600 active:bg-emerald-500 text-white rounded text-xs"
          title="Phím Enter"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Các phím chức năng Terminal chuyên dụng */}
      {actionKeys.map((k) => (
        <button
          key={k.label}
          onClick={() => onSendKey(k.code)}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-slate-200 text-xs font-mono font-medium rounded-lg border border-slate-700 whitespace-nowrap flex-shrink-0 transition-colors shadow-sm"
        >
          {k.label}
        </button>
      ))}
    </div>
  );
};
