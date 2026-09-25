// filepath: frontend/src/components/layout/Header.tsx
import React from 'react';
import {
  Server,
  LogOut,
  Wifi,
  WifiOff,
  Terminal,
  Activity,
  KeyRound,
  Globe,
  DownloadCloud,
  Bot,
  Zap,
  Send
} from 'lucide-react';
import { AuthUser } from '../../types/system.types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export type NavTabType = 'monitor' | 'network' | 'agent' | 'terminal';

interface HeaderProps {
  user: AuthUser | null;
  isConnected: boolean;
  hostname: string;
  onLogout: () => void;
  onChangeCredentials?: () => void;
  onOpenUpdate?: () => void;
  onOpenTelegram?: () => void;
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isConnected,
  hostname,
  onLogout,
  onChangeCredentials,
  onOpenUpdate,
  onOpenTelegram,
  activeTab,
  setActiveTab
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Logo & Hostname */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
            <Server className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-white text-xs sm:text-base leading-none tracking-tight truncate">
                Ubuntu Monitor
              </span>
              <span className="hidden lg:inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono truncate max-w-[120px]">
                {hostname}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 truncate font-mono">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>Realtime WS</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-rose-400 flex-shrink-0" />
                    <span>Mất kết nối</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Navigation Tabs for Desktop */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'monitor'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Phần Cứng</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'network'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hạ Tầng Mạng</span>
          </button>

          <button
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer relative ${
              activeTab === 'agent'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-purple-200 hover:bg-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Agent</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-200 font-mono font-bold border border-purple-400/40">
              God Mode
            </span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Web SSH</span>
          </button>
        </div>

        {/* Right: User & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nút Cài đặt Web App PWA */}
          <PWAInstallButton />

          <div className="hidden sm:block text-right mr-1">
            <div className="text-xs font-semibold text-slate-200 leading-tight">
              {user?.username || 'admin'}
            </div>
            <div className="text-[9px] text-emerald-400 uppercase font-mono tracking-wider">
              {user?.role || 'admin'}
            </div>
          </div>

          {onOpenUpdate && (
            <button
              onClick={onOpenUpdate}
              title="Cập nhật hệ thống trực tuyến từ GitHub"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline font-medium">Cập nhật</span>
            </button>
          )}

          {onOpenTelegram && (
            <button
              onClick={onOpenTelegram}
              title="Cấu hình Telegram Bot ChatOps"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <Send className="w-4 h-4 text-sky-400 -rotate-12" />
              <span className="hidden lg:inline font-medium">Telegram</span>
            </button>
          )}

          {onChangeCredentials && (
            <button
              onClick={onChangeCredentials}
              title="Đổi tài khoản & mật khẩu"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 border border-slate-700 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">Bảo mật</span>
            </button>
          )}

          <button
            onClick={onLogout}
            title="Đăng xuất"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-slate-700 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">Thoát</span>
          </button>
        </div>
      </div>
    </header>
  );
};
