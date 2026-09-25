// filepath: frontend/src/components/ai/AiChatbox.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Copy, Check, Terminal, Shield, RefreshCw } from 'lucide-react';
import { sendAiQuery } from '../../api/ai.api';
import { DynamicSystemMetrics } from '../../types/system.types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  hasContext?: boolean;
  timestamp: string;
}

interface AiChatboxProps {
  getTerminalBuffer: () => string;
  metrics: DynamicSystemMetrics | null;
  onInsertCommand?: (cmd: string) => void;
}

export const AiChatbox: React.FC<AiChatboxProps> = ({
  getTerminalBuffer,
  metrics,
  onInsertCommand
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Chào bạn! Tôi là **Ubuntu SysAdmin AI Assistant**. Tôi có thể đọc trực tiếp các dòng log trên Terminal của bạn, phát hiện lỗi phần cứng, service crash và gợi ý câu lệnh khắc phục nhanh chóng.',
      suggestions: ['systemctl status', 'journalctl -xe --no-pager -n 20', 'free -h'],
      timestamp: 'Ngay bây giờ'
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [includeContext, setIncludeContext] = useState<boolean>(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || inputValue).trim();
    if (!question || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      hasContext: includeContext,
      timestamp: timeStr
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    // Trích xuất ngữ cảnh Terminal và metrics phần cứng
    const terminalLogs = includeContext ? getTerminalBuffer() : '';
    const metricsSnapshot = metrics
      ? {
          cpuLoad: metrics.cpu.loadPercent,
          ramUsedPercent: metrics.memory.usedPercent,
          temperature: metrics.cpu.temperature,
          uptimeSeconds: metrics.uptime
        }
      : undefined;

    const response = await sendAiQuery({
      message: question,
      terminalContext: terminalLogs,
      systemMetrics: metricsSnapshot
    });

    setLoading(false);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'assistant',
      text: response.reply,
      suggestions: response.suggestions,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, assistantMsg]);
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Các câu hỏi mẫu thông dụng cho SysAdmin
  const quickActions = [
    { label: '🔍 Phân tích lỗi màn hình', prompt: 'Phân tích giúp tôi các lỗi vừa xuất hiện trên Terminal và gợi ý cách sửa.' },
    { label: '🚀 Tối ưu RAM & Cache', prompt: 'RAM máy chủ hiện tại đang dùng bao nhiêu %, có tiến trình nào chiếm dụng bất thường không?' },
    { label: '🛡️ Kiểm tra Service lỗi', prompt: 'Kiểm tra xem trên máy chủ có service systemd nào đang bị failed không?' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-slate-100">
      {/* Header */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              SysAdmin AI Assistant
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                Gemini 3.8
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              Chế độ chỉ đọc & gợi ý an toàn
            </p>
          </div>
        </div>

        {/* Toggle Kèm ngữ cảnh Terminal */}
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={(e) => setIncludeContext(e.target.checked)}
            className="rounded accent-purple-500"
          />
          <Terminal className="w-3 h-3 text-purple-400" />
          <span className="hidden sm:inline">Kèm log Terminal</span>
        </label>
      </div>

      {/* Danh sách tin nhắn */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1 px-1">
              <span>{msg.sender === 'user' ? 'Bạn' : 'SysAdmin AI'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
              {msg.hasContext && (
                <span className="text-purple-400 bg-purple-500/10 px-1 rounded text-[9px]">
                  +Terminal Log
                </span>
              )}
            </div>

            <div
              className={`p-3 rounded-2xl max-w-[92%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Danh sách câu lệnh gợi ý (nếu có) */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Lệnh gợi ý (Bấm để Copy):
                  </div>
                  {msg.suggestions.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex items-center justify-between gap-2 font-mono text-[11px]"
                    >
                      <code className="text-emerald-300 truncate">{cmd}</code>
                      <button
                        onClick={() => handleCopyCommand(cmd)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex-shrink-0 transition-colors"
                        title="Sao chép lệnh"
                      >
                        {copiedCmd === cmd ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl text-purple-300 text-xs w-fit">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            <span>AI đang đọc log Terminal và phân tích hệ thống...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Thanh gợi ý câu hỏi nhanh (Quick Chips) */}
      <div className="p-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {quickActions.map((qa, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(qa.prompt)}
            disabled={loading}
            className="px-2.5 py-1 bg-slate-900 hover:bg-purple-950/50 hover:border-purple-500/40 border border-slate-800 rounded-lg text-[11px] text-slate-300 hover:text-purple-200 whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Form nhập liệu */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Hỏi AI về lỗi, câu lệnh bash, cấu hình..."
            disabled={loading}
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="p-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer flex-shrink-0"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
