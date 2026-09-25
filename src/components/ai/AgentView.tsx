// filepath: frontend/src/components/ai/AgentView.tsx
import React from 'react';
import { Socket } from 'socket.io-client';
import {
  Bot,
  Cpu,
  Database,
  Flame,
  Clock,
  Terminal as TerminalIcon,
  Sparkles,
  Zap,
  ShieldAlert,
  Server,
  Activity,
  Layers,
  Send
} from 'lucide-react';
import { DynamicSystemMetrics, StaticSystemInfo } from '../../types/system.types';
import { AiChatbox } from './AiChatbox';

interface AgentViewProps {
  socket: Socket | null;
  metrics: DynamicSystemMetrics | null;
  staticInfo: StaticSystemInfo;
  onOpenTerminal?: () => void;
  onOpenTelegram?: () => void;
}

export const AgentView: React.FC<AgentViewProps> = ({
  socket,
  metrics,
  staticInfo,
  onOpenTerminal,
  onOpenTelegram
}) => {
  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* 1. Header Banner giới thiệu Autonomous Agent */}
      <div className="bg-gradient-to-r from-purple-50 via-white to-purple-50/40 dark:from-purple-950/80 dark:via-slate-900 dark:to-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/40 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Bot className="w-7 h-7 text-purple-600 dark:text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Autonomous SysAdmin Agent
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono font-semibold border border-purple-300 dark:border-purple-500/40">
                God Mode • MCP Tool Calling
              </span>
              {onOpenTelegram && (
                <button
                  type="button"
                  onClick={onOpenTelegram}
                  className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 font-mono font-semibold border border-sky-300 dark:border-sky-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Send className="w-2.5 h-2.5 -rotate-12" />
                  <span>Cấu hình Telegram Bot</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300/80 mt-0.5">
              Đặc vụ AI tự trị có khả năng chẩn đoán sự cố, tự thực thi câu lệnh Linux Bash, quản lý service và khắc phục lỗi trực tiếp.
            </p>
          </div>
        </div>

        {/* Live Metrics Quick Badges */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 px-2">
              <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-500 dark:text-slate-400">CPU:</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">{metrics.cpu.loadPercent}%</span>
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-slate-500 dark:text-slate-400">RAM:</span>
              <span className="text-purple-700 dark:text-purple-300 font-bold">{metrics.memory.usedPercent}%</span>
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-slate-500 dark:text-slate-400">Nhiệt:</span>
              <span className="text-amber-700 dark:text-amber-300 font-bold">{metrics.cpu.temperature}°C</span>
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-slate-500 dark:text-slate-400">Uptime:</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">
                {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Workspace: Khung Chat AI Agent tương thích tối ưu Desktop & Mobile */}
      <div className="h-[calc(100vh-230px)] min-h-[550px] max-h-[850px] flex flex-col">
        <AiChatbox
          getTerminalBuffer={() => ''}
          metrics={metrics}
          socket={socket}
        />
      </div>
    </div>
  );
};
