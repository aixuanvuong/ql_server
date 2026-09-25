// filepath: frontend/src/components/layout/TabsNav.tsx
import React from 'react';
import { Activity, Terminal, Globe, Bot } from 'lucide-react';
import { NavTabType } from './Header';

interface TabsNavProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl px-2 py-1.5 pb-safe">
      <div className="grid grid-cols-4 items-center max-w-md mx-auto gap-1">
        {/* Tab 1: Phần Cứng */}
        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'monitor'
              ? 'text-emerald-400 bg-emerald-500/10 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Phần Cứng</span>
        </button>

        {/* Tab 2: Mạng */}
        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'network'
              ? 'text-cyan-400 bg-cyan-500/10 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mạng</span>
        </button>

        {/* Tab 3: AI Agent (Autonomous) */}
        <button
          type="button"
          onClick={() => setActiveTab('agent')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'agent'
              ? 'text-purple-300 bg-purple-500/15 font-bold'
              : 'text-slate-400 hover:text-purple-300'
          }`}
        >
          <div className="relative">
            <Bot className="w-5 h-5 mb-0.5" />
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <span className="text-[10px] tracking-tight">AI Agent</span>
        </button>

        {/* Tab 4: Web SSH */}
        <button
          type="button"
          onClick={() => setActiveTab('terminal')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'terminal'
              ? 'text-emerald-400 bg-emerald-500/10 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Web SSH</span>
        </button>
      </div>
    </nav>
  );
};
