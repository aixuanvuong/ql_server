// filepath: frontend/src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { Lock, User, Globe, AlertCircle, ShieldCheck } from 'lucide-react';
import { loginUser, getStoredServerUrl } from '../../api/auth.api';
import { AuthUser } from '../../types/system.types';
import { ComputerInternetLogo } from '../common/ComputerInternetLogo';
import { ThemeToggle } from '../common/ThemeToggle';

interface LoginFormProps {
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [serverUrl, setServerUrl] = useState<string>(getStoredServerUrl());
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const result = await loginUser(serverUrl, { username, password });
    setLoading(false);

    if (result.success && result.token && result.user) {
      onLoginSuccess(result.token, result.user);
    } else {
      setErrorMsg(result.message || 'Đăng nhập thất bại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-8 text-slate-800 dark:text-slate-100 relative transition-colors duration-200">
      {/* Nút chuyển đổi Giao diện Sáng / Tối ở góc phải */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <ThemeToggle showLabel />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-colors">
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden mb-3 border border-cyan-500/30 shadow-xl shadow-cyan-950/20 dark:shadow-cyan-950/50">
            <ComputerInternetLogo size={64} className="w-full h-full" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
            <span>Quả Lý Sever</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Đăng nhập để giám sát máy chủ từ xa & Web SSH Terminal
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Backend URL */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Địa chỉ Backend Agent (IP / Domain)
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.100:5000 hoặc http://localhost:5000"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Địa chỉ máy chủ Ubuntu chạy file server.js
            </span>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Mật khẩu quản trị
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950/50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Đăng Nhập Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Helper Box */}
        <div className="mt-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Tài khoản mặc định:</div>
          <div>• Tên đăng nhập: <code className="text-emerald-700 dark:text-emerald-400 bg-slate-200/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">admin</code></div>
          <div>• Mật khẩu: <code className="text-emerald-700 dark:text-emerald-400 bg-slate-200/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">admin123</code></div>
        </div>
      </div>
    </div>
  );
};
