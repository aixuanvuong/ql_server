// filepath: frontend/src/components/layout/TabsNav.tsx
import React from 'react';
import { Activity, Terminal } from 'lucide-react';

interface TabsNavProps {
  activeTab: 'monitor' | 'terminal';
  setActiveTab: (tab: 'monitor' | 'terminal') => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg px-6 py-2">
      <div className="flex justify-around items-center max-w-sm mx-auto">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeTab === 'monitor'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[11px]">Giám Sát</span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeTab === 'terminal'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-5 h-5" />
          <span className="text-[11px]">Web SSH</span>
        </button>
      </div>
    </nav>
  );
};
