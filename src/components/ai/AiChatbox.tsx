// filepath: frontend/src/components/ai/AiChatbox.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import {
  Bot,
  Send,
  Sparkles,
  Copy,
  Check,
  Terminal,
  Shield,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Zap,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Trash2,
  MessageSquare
} from 'lucide-react';
import {
  sendAiQuery,
  getAiConfigApi,
  sendApprovalResponseApi,
  AgentExecutedStep,
  CommandApprovalRequestData
} from '../../api/ai.api';
import { DynamicSystemMetrics } from '../../types/system.types';
import { AiSettingsModal } from './AiSettingsModal';
import { CommandApprovalModal } from './CommandApprovalModal';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  steps?: AgentExecutedStep[];
  executionMode?: 'require_approval' | 'auto_pilot';
  hasContext?: boolean;
  timestamp: string;
}

interface AiChatboxProps {
  getTerminalBuffer: () => string;
  metrics: DynamicSystemMetrics | null;
  onInsertCommand?: (cmd: string) => void;
  socket?: Socket | null;
}

export const AiChatbox: React.FC<AiChatboxProps> = ({
  getTerminalBuffer,
  metrics,
  onInsertCommand,
  socket = null
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Chào bạn! Tôi là **Autonomous Ubuntu SysAdmin Agent** (God Mode). Tôi có thể trực tiếp chẩn đoán lỗi, gọi tool thực thi lệnh trên server, kiểm tra log và tự động giải quyết các sự cố hệ thống.',
      suggestions: ['systemctl status', 'journalctl -xe --no-pager -n 20', 'free -h'],
      timestamp: 'Ngay bây giờ'
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [includeContext, setIncludeContext] = useState<boolean>(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Chế độ thực thi lệnh: 'require_approval' (An toàn) hoặc 'auto_pilot' (Tự trị hoàn toàn)
  const [executionMode, setExecutionMode] = useState<'require_approval' | 'auto_pilot'>(() => {
    return (localStorage.getItem('ql_ai_execution_mode') as 'require_approval' | 'auto_pilot') || 'require_approval';
  });

  // Modal Phê duyệt Lệnh khi ở chế độ Require Approval
  const [currentApproval, setCurrentApproval] = useState<CommandApprovalRequestData | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState<boolean>(false);

  // Tiến trình các bước Agentic đang chạy trực tiếp
  const [liveSteps, setLiveSteps] = useState<Array<{
    stepIndex: number;
    command: string;
    status: string;
    result?: unknown;
  }>>([]);

  // Bước được mở rộng để xem chi tiết output
  const [expandedStepIndex, setExpandedStepIndex] = useState<string | null>(null);

  // Cấu hình AI trực tiếp trên Website
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Lưu chế độ vào LocalStorage khi người dùng đổi
  const handleToggleMode = (mode: 'require_approval' | 'auto_pilot') => {
    setExecutionMode(mode);
    try {
      localStorage.setItem('ql_ai_execution_mode', mode);
    } catch {
      // Ignore
    }
  };

  // Tải cấu hình Model hiện tại
  useEffect(() => {
    getAiConfigApi().then((res) => {
      if (res.success && res.data?.model) {
        setCurrentModel(res.data.model);
      }
    });
  }, []);

  // Lắng nghe sự kiện WebSocket để nhận yêu cầu phê duyệt lệnh và tiến trình Agentic
  useEffect(() => {
    if (!socket) return;

    // Khi backend gửi yêu cầu phê duyệt lệnh (Require Approval)
    const handleApprovalRequest = (data: CommandApprovalRequestData) => {
      console.log('[AI Chatbox] 🚨 Nhận yêu cầu duyệt lệnh từ Socket:', data);
      setCurrentApproval(data);
    };

    // Khi yêu cầu phê duyệt đã được giải quyết (từ tab khác hoặc chính tab này)
    const handleApprovalResolved = (data: { approvalId: string }) => {
      if (currentApproval?.approvalId === data.approvalId) {
        setCurrentApproval(null);
        setIsProcessingApproval(false);
      }
    };

    // Khi yêu cầu phê duyệt bị hết hạn (timeout 60s)
    const handleApprovalTimeout = (data: { approvalId: string }) => {
      if (currentApproval?.approvalId === data.approvalId) {
        setCurrentApproval(null);
        setIsProcessingApproval(false);
      }
    };

    // Cập nhật tiến độ từng bước trong Agentic Loop
    const handleAgentStep = (stepData: {
      stepIndex: number;
      command: string;
      status: string;
      result?: unknown;
    }) => {
      setLiveSteps((prev) => {
        const existingIdx = prev.findIndex((s) => s.stepIndex === stepData.stepIndex);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = stepData;
          return updated;
        }
        return [...prev, stepData];
      });
    };

    socket.on('ai:command_approval_request', handleApprovalRequest);
    socket.on('ai:command_approval_resolved', handleApprovalResolved);
    socket.on('ai:command_approval_timeout', handleApprovalTimeout);
    socket.on('ai:agent_step', handleAgentStep);

    return () => {
      socket.off('ai:command_approval_request', handleApprovalRequest);
      socket.off('ai:command_approval_resolved', handleApprovalResolved);
      socket.off('ai:command_approval_timeout', handleApprovalTimeout);
      socket.off('ai:agent_step', handleAgentStep);
    };
  }, [socket, currentApproval]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, liveSteps]);

  // Xử lý phê duyệt lệnh từ Quản trị viên (Đồng ý)
  const handleApproveCommand = async (approvalId: string) => {
    setIsProcessingApproval(true);
    if (socket && socket.connected) {
      socket.emit('ai:command_approval_response', { approvalId, approved: true });
    }
    // Gửi kèm HTTP fallback
    await sendApprovalResponseApi(approvalId, true);
    setIsProcessingApproval(false);
    setCurrentApproval(null);
  };

  // Xử lý từ chối lệnh (Từ chối)
  const handleRejectCommand = async (approvalId: string) => {
    setIsProcessingApproval(true);
    if (socket && socket.connected) {
      socket.emit('ai:command_approval_response', { approvalId, approved: false });
    }
    // Gửi kèm HTTP fallback
    await sendApprovalResponseApi(approvalId, false);
    setIsProcessingApproval(false);
    setCurrentApproval(null);
  };

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
    setLiveSteps([]);

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

    // Thu thập lịch sử hội thoại trước đó để gửi cho AI (Tối đa 8 tin nhắn gần nhất)
    const conversationHistory = messages
      .filter((m) => m.id !== 'welcome' && m.text.trim())
      .slice(-8)
      .map((m) => ({
        role: (m.sender === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text
      }));

    const response = await sendAiQuery({
      message: question,
      terminalContext: terminalLogs,
      systemMetrics: metricsSnapshot,
      executionMode: executionMode,
      socketId: socket?.id,
      history: conversationHistory
    });

    setLoading(false);
    setLiveSteps([]);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'assistant',
      text: response.reply,
      suggestions: response.suggestions,
      steps: response.steps,
      executionMode: response.executionMode || executionMode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, assistantMsg]);
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Các câu hỏi mẫu thông dụng cho Autonomous Agent
  const quickActions = [
    { label: '🔍 Tự chẩn đoán lỗi Terminal', prompt: 'Chẩn đoán các lỗi xuất hiện trên màn hình Terminal và tự động thực thi các lệnh cần thiết để sửa chữa.' },
    { label: '🚀 Tối ưu RAM & Xả Cache', prompt: 'Kiểm tra mức sử dụng RAM, tìm tiến trình ngốn bộ nhớ và chạy lệnh đồng bộ, xả cache hệ thống nếu cần.' },
    { label: '🛡️ Quét Service Lỗi & Restart', prompt: 'Kiểm tra toàn bộ service systemd xem có service nào đang failed không, đọc log chi tiết và khởi động lại giúp tôi.' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header với Nút Gạt "Require Approval" vs "Auto-Pilot" */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>Autonomous Agent</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono border border-purple-500/30">
                  God Mode
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                title="Bấm để cấu hình mô hình hoặc khóa API OmniRoute"
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <span>{currentModel}</span>
                <SlidersHorizontal className="w-2.5 h-2.5 opacity-70" />
              </button>
              {messages.filter(m => m.id !== 'welcome').length > 0 && (
                <span
                  title="Số tin nhắn trước đó đang được AI nhớ và phân tích ngữ cảnh"
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-mono border border-sky-500/30 flex items-center gap-1"
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>Nhớ {messages.filter(m => m.id !== 'welcome').length} câu</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {executionMode === 'auto_pilot' ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  Auto-Pilot: Tự chạy lệnh không cần duyệt
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                  An toàn: Luôn hỏi bạn trước khi chạy lệnh
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Nút Gạt (Toggle) 2 Chế Độ: Require Approval vs Auto-Pilot */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center">
            <button
              type="button"
              onClick={() => handleToggleMode('require_approval')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                executionMode === 'require_approval'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Chế độ an toàn: AI phải xin phép bạn trước khi chạy lệnh"
            >
              <Shield className="w-3 h-3" />
              <span>Cần Duyệt</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleMode('auto_pilot')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                executionMode === 'auto_pilot'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Chế độ nguy hiểm: AI tự động phân tích và tự chạy lệnh sửa lỗi đến khi xong"
            >
              <Zap className="w-3 h-3" />
              <span>Auto-Pilot</span>
            </button>
          </div>

          {/* Toggle Kèm ngữ cảnh Terminal */}
          <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="rounded accent-purple-500"
            />
            <Terminal className="w-3 h-3 text-purple-500 dark:text-purple-400" />
            <span className="hidden md:inline">Log</span>
          </label>

          {/* Nút xóa ngữ cảnh / làm mới phiên chat */}
          <button
            type="button"
            onClick={() => {
              setMessages([
                {
                  id: 'welcome',
                  sender: 'assistant',
                  text: '🧹 **Đã làm mới phiên hội thoại!** Ngữ cảnh câu hỏi trước đã được xóa sạch. Tôi đã sẵn sàng nhận yêu cầu mới của bạn.',
                  suggestions: ['systemctl status', 'free -h', 'uptime'],
                  timestamp: 'Vừa xong'
                }
              ]);
            }}
            title="Xóa sạch bộ nhớ ngữ cảnh hội thoại để bắt đầu phiên mới"
            className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/30 text-[11px] flex items-center gap-1 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Xóa nhớ</span>
          </button>
        </div>
      </div>

      {/* Thông báo cảnh báo khi ở chế độ Auto-Pilot */}
      {executionMode === 'auto_pilot' && (
        <div className="px-3 py-1.5 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <span className="truncate">
              <strong>Cảnh báo Auto-Pilot:</strong> AI sẽ tự động gọi lệnh shell liên tiếp với toàn quyền root.
            </span>
          </div>
          <button
            onClick={() => handleToggleMode('require_approval')}
            className="text-[10px] underline text-amber-700 dark:text-amber-200 hover:text-amber-950 dark:hover:text-white flex-shrink-0 cursor-pointer"
          >
            Chuyển về Cần Duyệt
          </button>
        </div>
      )}

      {/* Danh sách tin nhắn */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs bg-slate-50/50 dark:bg-slate-900/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1 px-1">
              <span>{msg.sender === 'user' ? 'Bạn' : 'Autonomous Agent'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
              {msg.executionMode && (
                <span className={`px-1 rounded text-[9px] font-mono ${
                  msg.executionMode === 'auto_pilot' ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {msg.executionMode === 'auto_pilot' ? '⚡ Auto-Pilot' : '🛡️ Require Approval'}
                </span>
              )}
              {msg.hasContext && (
                <span className="text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1 rounded text-[9px]">
                  +Terminal Log
                </span>
              )}
            </div>

            <div
              className={`p-3 rounded-2xl max-w-[94%] leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-sm'
                  : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
              }`}
            >
              {/* Lịch sử các bước thực thi trong Agentic Loop (nếu có) */}
              {msg.steps && msg.steps.length > 0 && (
                <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 dark:text-purple-300 border-b border-slate-200 dark:border-slate-800/80 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      LỊCH SỬ THỰC THI ({msg.steps.length} BƯỚC AGENTIC)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {msg.executionMode === 'auto_pilot' ? 'Tự Động' : 'Đã Phê Duyệt'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {msg.steps.map((step) => {
                      const isExpanded = expandedStepIndex === `${msg.id}-${step.stepIndex}`;
                      const isSuccess = step.toolResult?.success;
                      const isRejected = step.toolResult?.rejectedByUser;

                      return (
                        <div
                          key={step.stepIndex}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 overflow-hidden text-[11px]"
                        >
                          <div
                            onClick={() =>
                              setExpandedStepIndex(
                                isExpanded ? null : `${msg.id}-${step.stepIndex}`
                              )
                            }
                            className="p-2 flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] flex items-center justify-center flex-shrink-0">
                                #{step.stepIndex}
                              </span>
                              <code className="text-slate-900 dark:text-white font-mono truncate font-medium">
                                {step.command}
                              </code>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isSuccess ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Exit 0</span>
                                </span>
                              ) : isRejected ? (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-semibold flex items-center gap-0.5">
                                  <XCircle className="w-3 h-3" />
                                  <span>Từ chối</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Exit {step.toolResult?.exitCode}</span>
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Chi tiết Output stdout/stderr khi bung rộng */}
                          {isExpanded && (
                            <div className="p-2.5 bg-slate-950 border-t border-slate-200 dark:border-slate-800 font-mono text-[10px] space-y-1.5">
                              {step.toolResult?.stdout && (
                                <div>
                                  <span className="text-slate-400 block mb-0.5">STDOUT:</span>
                                  <pre className="text-emerald-400 whitespace-pre-wrap break-all max-h-36 overflow-y-auto bg-black/40 p-1.5 rounded">
                                    {step.toolResult.stdout}
                                  </pre>
                                </div>
                              )}
                              {step.toolResult?.stderr && (
                                <div>
                                  <span className="text-rose-400 block mb-0.5">STDERR:</span>
                                  <pre className="text-rose-400 whitespace-pre-wrap break-all max-h-36 overflow-y-auto bg-black/40 p-1.5 rounded">
                                    {step.toolResult.stderr}
                                  </pre>
                                </div>
                              )}
                              <div className="text-slate-500 text-[9px] flex items-center justify-between pt-1">
                                <span>Thời gian chạy: {step.toolResult?.executionTimeMs || 0}ms</span>
                                {onInsertCommand && (
                                  <button
                                    onClick={() => onInsertCommand(step.command)}
                                    className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
                                  >
                                    Chạy lại trên Terminal
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nội dung kết luận / giải thích của AI */}
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Danh sách câu lệnh gợi ý (nếu có) */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Lệnh gợi ý (Bấm để Copy):
                  </div>
                  {msg.suggestions.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 font-mono text-[11px]"
                    >
                      <code className="text-emerald-700 dark:text-emerald-300 truncate">{cmd}</code>
                      <button
                        onClick={() => handleCopyCommand(cmd)}
                        className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex-shrink-0 transition-colors"
                        title="Sao chép lệnh"
                      >
                        {copiedCmd === cmd ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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

        {/* Trạng thái tiến trình Live Steps đang diễn ra trong Agentic Loop */}
        {loading && (
          <div className="space-y-2 p-3 bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-500/30 rounded-2xl text-xs w-full max-w-[94%] shadow-sm">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span>AI Agent đang phân tích & vận hành Agentic Loop...</span>
            </div>

            {liveSteps.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                {liveSteps.map((step) => (
                  <div
                    key={step.stepIndex}
                    className="flex items-center justify-between text-[11px] font-mono bg-slate-50 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                  >
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      #{step.stepIndex}: {step.command}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold flex-shrink-0 ${
                      step.status === 'success'
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : step.status === 'waiting_approval'
                        ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse'
                        : step.status === 'running_autopilot'
                        ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {step.status === 'waiting_approval'
                        ? 'Đang chờ bạn duyệt...'
                        : step.status === 'running_autopilot'
                        ? 'Đang chạy (Auto-Pilot)...'
                        : step.status === 'success'
                        ? 'Hoàn thành'
                        : 'Đang xử lý...'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Thanh gợi ý câu hỏi nhanh (Quick Chips) */}
      <div className="p-2 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {quickActions.map((qa, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(qa.prompt)}
            disabled={loading}
            className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:border-purple-300 dark:hover:border-purple-500/40 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-200 whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer shadow-xs"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Form nhập liệu */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
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
            placeholder={
              executionMode === 'auto_pilot'
                ? 'Nhập yêu cầu: AI sẽ tự động phân tích và tự chạy lệnh sửa lỗi...'
                : 'Nhập yêu cầu: AI sẽ phân tích và hỏi bạn trước khi chạy lệnh...'
            }
            disabled={loading}
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="p-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer flex-shrink-0 shadow-md"
            title="Gửi câu hỏi cho AI Agent"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Modal Phê Duyệt Lệnh Hệ Thống (Cảnh Báo Đỏ - Human-in-the-Loop) */}
      <CommandApprovalModal
        request={currentApproval}
        onApprove={handleApproveCommand}
        onReject={handleRejectCommand}
        isProcessing={isProcessingApproval}
      />

      {/* Modal Cấu hình AI trực tiếp */}
      <AiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigUpdated={(newModel) => setCurrentModel(newModel)}
      />
    </div>
  );
};
