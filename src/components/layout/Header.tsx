// filepath: frontend/src/components/layout/Header.tsx
import React from 'react';
import { Server, LogOut, Wifi, WifiOff, Terminal, Activity } from 'lucide-react';
import { AuthUser } from '../../types/system.types';

interface HeaderProps {
  user: AuthUser | null;
  isConnected: boolean;
  hostname: string;
  onLogout: () => void;
  activeTab: 'monitor' | 'terminal';
  setActiveTab: (tab: 'monitor' | 'terminal') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isConnected,
  hostname,
  onLogout,
  activeTab,
  setActiveTab
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Logo & Hostname */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm sm:text-base leading-none">
                Ubuntu Monitor
              </span>
              <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {hostname}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>Real-time WS</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-rose-400" />
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
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'monitor'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Giám sát Phần cứng
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'terminal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Web SSH Terminal
          </button>
        </div>

        {/* Right: User & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-slate-200">{user?.username || 'admin'}</div>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider">{user?.role || 'admin'}</div>
          </div>
          <button
            onClick={onLogout}
            title="Đăng xuất"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-slate-700 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </div>
    </header>
  );
};
