// filepath: frontend/src/components/terminal/SshConnectModal.tsx
import React, { useState } from 'react';
import { Terminal, Key, ShieldCheck, X } from 'lucide-react';
import { SshConfig } from '../../types/system.types';

interface SshConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: SshConfig) => void;
  isConnecting: boolean;
}

export const SshConnectModal: React.FC<SshConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting
}) => {
  const [host, setHost] = useState<string>('127.0.0.1');
  const [port, setPort] = useState<number>(22);
  const [username, setUsername] = useState<string>('ubuntu');
  const [password, setPassword] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({
      host,
      port: Number(port),
      username,
      password: password || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Kết Nối SSH Terminal</h3>
            <p className="text-xs text-slate-400">Mở phiên dòng lệnh an toàn tới máy chủ Ubuntu</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Địa chỉ Host / IP
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="127.0.0.1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cổng (Port)
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="22"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tên tài khoản Linux (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ubuntu hoặc root"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Mật khẩu SSH
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Để trống nếu máy chủ dùng SSH Key mặc định"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Mật khẩu được truyền trực tiếp qua kênh mã hóa tới phiên SSH của Backend Agent.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              {isConnecting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Bắt đầu kết nối
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
