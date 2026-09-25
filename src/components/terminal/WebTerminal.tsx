// filepath: frontend/src/components/terminal/WebTerminal.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as TerminalIcon, RotateCcw, Trash2, Maximize2, Minimize2, Settings, Bot, ChevronDown, ChevronUp, Zap, Server, Bookmark, Plus } from 'lucide-react';
import { MobileKeyboardBar } from './MobileKeyboardBar';
import { SshConnectModal } from './SshConnectModal';
import { SshConfig, DynamicSystemMetrics, SavedSshProfile } from '../../types/system.types';
import { extractTerminalBuffer } from '../../utils/terminalHelper';
import { AiChatbox } from '../ai/AiChatbox';
import { getSavedSshProfiles, updateLastConnected } from '../../utils/sshStorage';

interface WebTerminalProps {
  socket: Socket | null;
  isConnected: boolean;
  metrics?: DynamicSystemMetrics | null;
}

export const WebTerminal: React.FC<WebTerminalProps> = ({ socket, isConnected, metrics = null }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [terminalStatus, setTerminalStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(true);
  const [mobilePane, setMobilePane] = useState<'terminal' | 'ai'>('terminal');
  const [demoBuffer, setDemoBuffer] = useState<string>('');

  // Quản lý danh sách tài khoản SSH đã lưu để kết nối nhanh
  const [savedProfiles, setSavedProfiles] = useState<SavedSshProfile[]>([]);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState<boolean>(false);

  // Tải danh sách hồ sơ SSH đã lưu
  useEffect(() => {
    setSavedProfiles(getSavedSshProfiles());
  }, [isModalOpen]);

  // Khởi tạo Terminal xterm.js
  useEffect(() => {
    if (!containerRef.current) return;

    // Cấu hình giao diện chuẩn cho xterm
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: window.innerWidth < 640 ? 12 : 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.2,
      theme: {
        background: '#090d16',
        foreground: '#e2e8f0',
        cursor: '#10b981',
        selectionBackground: 'rgba(16, 185, 129, 0.3)',
        black: '#1e293b',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Canh chỉnh kích thước Terminal vừa khớp container
    try {
      fitAddon.fit();
    } catch (e) {
      // Ignore initial fit timing
    }

    // In thông điệp chào mừng
    term.writeln('\x1b[32m╔════════════════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[32m║        UBUNTU REMOTE MONITOR & WEB-BASED SSH TERMINAL          ║\x1b[0m');
    term.writeln('\x1b[32m╚════════════════════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('Gõ lệnh hoặc bấm nút \x1b[33m"Cấu hình SSH"\x1b[0m bên trên để kết nối tới server.');
    term.writeln('');

    // Xử lý sự kiện gõ phím từ người dùng
    term.onData((data) => {
      if (socket && isConnected && socket.connected) {
        // Gửi ký tự nhập lên máy chủ Ubuntu qua Socket.io
        socket.emit('terminal:input', data);
      } else {
        // Giả lập Shell tương tác khi chạy ở chế độ Standalone / Demo
        handleLocalShellInput(data, term);
      }
    });

    // Lắng nghe sự kiện đổi kích thước màn hình
    const handleResize = () => {
      if (fitAddonRef.current && termRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && socket && isConnected) {
          socket.emit('terminal:resize', { cols: dims.cols, rows: dims.rows });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Tự động canh chỉnh kích thước Terminal khi đổi layout, chế độ toàn màn hình hoặc chuyển tab
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims && socket && isConnected) {
            socket.emit('terminal:resize', { cols: dims.cols, rows: dims.rows });
          }
        } catch {
          // ignore
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isAiOpen, isFullscreen, mobilePane, socket, isConnected]);

  // Lắng nghe dữ liệu SSH từ máy chủ truyền về qua Socket.io
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleOutput = (data: string) => {
      if (termRef.current) {
        termRef.current.write(data);
      }
    };

    const handleStatus = (statusData: { status: 'connected' | 'disconnected' | 'connecting'; message?: string }) => {
      setTerminalStatus(statusData.status);
      if (statusData.message && termRef.current) {
        termRef.current.writeln(`\r\n\x1b[36m${statusData.message}\x1b[0m\r\n`);
      }
    };

    const handleError = (errorMsg: string) => {
      if (termRef.current) {
        termRef.current.write(`\r\n\x1b[31m[Lỗi]: ${errorMsg}\x1b[0m\r\n`);
      }
    };

    socket.on('terminal:output', handleOutput);
    socket.on('terminal:status', handleStatus);
    socket.on('terminal:error', handleError);

    return () => {
      socket.off('terminal:output', handleOutput);
      socket.off('terminal:status', handleStatus);
      socket.off('terminal:error', handleError);
    };
  }, [socket, isConnected]);

  // Xử lý gửi ký tự từ thanh phím ảo trên điện thoại Android
  const handleVirtualKey = useCallback((code: string) => {
    if (socket && isConnected && socket.connected) {
      socket.emit('terminal:input', code);
    } else if (termRef.current) {
      handleLocalShellInput(code, termRef.current);
    }
    // Giữ focus vào terminal
    termRef.current?.focus();
  }, [socket, isConnected]);

  // Bộ mô phỏng Terminal cục bộ (Local Shell Simulator)
  let cmdBuffer = demoBuffer;
  const handleLocalShellInput = (char: string, term: Terminal) => {
    if (char === '\r') {
      // Enter
      term.writeln('');
      const trimmed = cmdBuffer.trim();
      processDemoCommand(trimmed, term);
      cmdBuffer = '';
      setDemoBuffer('');
      term.write('\x1b[32mubuntu@server:~$ \x1b[0m');
    } else if (char === '\u007F' || char === '\b') {
      // Backspace
      if (cmdBuffer.length > 0) {
        cmdBuffer = cmdBuffer.slice(0, -1);
        setDemoBuffer(cmdBuffer);
        term.write('\b \b');
      }
    } else if (char === '\x03') {
      // Ctrl+C
      term.writeln('^C');
      cmdBuffer = '';
      setDemoBuffer('');
      term.write('\x1b[32mubuntu@server:~$ \x1b[0m');
    } else {
      cmdBuffer += char;
      setDemoBuffer(cmdBuffer);
      term.write(char);
    }
  };

  const processDemoCommand = (cmd: string, term: Terminal) => {
    switch (cmd.toLowerCase()) {
      case 'help':
        term.writeln('Lệnh mẫu có sẵn trong chế độ giả lập:');
        term.writeln('  uname -a     - Xem thông tin hệ điều hành Linux');
        term.writeln('  uptime       - Xem thời gian hoạt động của máy chủ');
        term.writeln('  free -h      - Xem dung lượng RAM');
        term.writeln('  df -h        - Xem dung lượng ổ cứng');
        term.writeln('  whoami       - Tên người dùng hiện tại');
        term.writeln('  clear        - Xóa trắng màn hình terminal');
        term.writeln('\x1b[33m* Lưu ý: Kết nối Backend Ubuntu để thực thi toàn bộ lệnh bash thật!\x1b[0m');
        break;
      case 'uname -a':
        term.writeln('Linux ubuntu-production-01 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
        break;
      case 'whoami':
        term.writeln('ubuntu');
        break;
      case 'uptime':
        term.writeln(' 20:25:00 up 5 days, 4:32,  2 users,  load average: 0.24, 0.31, 0.18');
        break;
      case 'free -h':
      case 'free -m':
        term.writeln('               total        used        free      shared  buff/cache   available');
        term.writeln('Mem:           7.8Gi       3.2Gi       2.8Gi        42Mi       1.8Gi       4.3Gi');
        term.writeln('Swap:          2.0Gi          0B       2.0Gi');
        break;
      case 'df -h':
        term.writeln('Filesystem      Size  Used Avail Use% Mounted on');
        term.writeln('/dev/root        98G   38G   60G  39% /');
        term.writeln('tmpfs           3.9G     0  3.9G   0% /dev/shm');
        break;
      case 'clear':
        term.clear();
        break;
      default:
        if (cmd) {
          term.writeln(`bash: ${cmd}: lệnh chưa tìm thấy trong chế độ demo. Kết nối SSH thật để thực thi.`);
        }
        break;
    }
  };

  // Khởi chạy phiên SSH thực tế
  const handleConnectSsh = (config: SshConfig) => {
    setIsModalOpen(false);
    setTerminalStatus('connecting');

    if (termRef.current) {
      termRef.current.writeln(`\r\n\x1b[33m[Đang kết nối SSH tới ${config.username}@${config.host}:${config.port}...]\x1b[0m`);
    }

    if (socket && isConnected) {
      const dims = fitAddonRef.current?.proposeDimensions();
      socket.emit('ssh:connect', {
        ...config,
        cols: dims?.cols || 80,
        rows: dims?.rows || 24
      });
    } else {
      setTimeout(() => {
        setTerminalStatus('connected');
        if (termRef.current) {
          termRef.current.writeln(`\x1b[32m[Phiên SSH mô phỏng kết nối thành công: ${config.username}@${config.host}]\x1b[0m\r\n`);
          termRef.current.write('\x1b[32mubuntu@server:~$ \x1b[0m');
        }
      }, 800);
    }
  };

  const handleClearTerminal = () => {
    termRef.current?.clear();
    termRef.current?.focus();
  };

  return (
    <div
      className={`flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'h-[580px] sm:h-[620px]'
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Terminal Window Dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-300">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">bash — ubuntu@server</span>
            <span className="sm:hidden">Web SSH</span>
          </div>

          {/* Connection Status Badge */}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
              terminalStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : terminalStatus === 'connecting'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                terminalStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : terminalStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            {terminalStatus === 'connected'
              ? 'SSH Online'
              : terminalStatus === 'connecting'
              ? 'Đang kết nối'
              : 'Chưa kết nối'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick Connect Dropdown cho tài khoản đã lưu */}
          <div className="relative">
            <button
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Danh sách máy chủ đã lưu (Kết nối nhanh 1-Click)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Kết nối nhanh</span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded font-mono text-amber-300">
                {savedProfiles.length}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {isQuickMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsQuickMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-amber-400" />
                      MÁY CHỦ ĐÃ LƯU
                    </span>
                    <button
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        setIsModalOpen(true);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 text-[10px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {savedProfiles.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        Chưa có tài khoản nào được lưu
                      </div>
                    ) : (
                      savedProfiles.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setIsQuickMenuOpen(false);
                            updateLastConnected(p.id);
                            handleConnectSsh({
                              host: p.host,
                              port: p.port,
                              username: p.username,
                              password: p.password || undefined
                            });
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-white group-hover:text-amber-300 truncate flex items-center gap-1.5">
                              <Server className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 flex-shrink-0" />
                              <span className="truncate">{p.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono pl-5 truncate">
                              {p.username}@{p.host}:{p.port}
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-amber-500/20 group-hover:text-amber-300 flex-shrink-0 font-medium">
                            ⚡ Kết nối
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-800 p-1.5 bg-slate-950/60">
                    <button
                      onClick={() => {
                        setIsQuickMenuOpen(false);
                        setIsModalOpen(true);
                      }}
                      className="w-full py-1.5 px-2 text-center text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 font-medium"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Quản lý danh sách máy chủ</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
              isAiOpen
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Bật/Tắt Trợ lý AI SysAdmin"
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Trợ lý AI</span>
            {isAiOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Cấu hình Host & Quản lý tài khoản SSH"
          >
            <Settings className="w-3 h-3" />
            <span className="hidden sm:inline">Cấu hình SSH</span>
          </button>

          <button
            onClick={handleClearTerminal}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
            title="Xóa trắng màn hình terminal (Clear)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* On Mobile when AI is open: Tab switcher giữa Terminal và AI để không bị bóp nghẹt màn hình */}
      {isAiOpen && (
        <div className="lg:hidden flex items-center bg-slate-950 p-1.5 border-b border-slate-800 gap-1">
          <button
            type="button"
            onClick={() => setMobilePane('terminal')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobilePane === 'terminal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Màn Hình Terminal</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('ai')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobilePane === 'ai'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-purple-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Trợ Lý AI (God Mode)</span>
          </button>
        </div>
      )}

      {/* Main Terminal + AI Workstation Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Terminal Container */}
        <div
          className={`flex flex-col flex-1 min-h-[350px] ${
            isAiOpen ? 'w-full lg:w-7/12 border-b lg:border-b-0 lg:border-r border-slate-800' : 'w-full'
          } ${isAiOpen && mobilePane === 'ai' ? 'hidden lg:flex' : 'flex'}`}
        >
          <div
            ref={containerRef}
            className="flex-1 w-full bg-[#090d16] p-2 overflow-hidden"
            style={{ minHeight: '280px' }}
          />
          {/* Virtual Touch Keyboard for Android Mobile */}
          <MobileKeyboardBar onSendKey={handleVirtualKey} />
        </div>

        {/* AI SysAdmin Chatbox Panel */}
        {isAiOpen && (
          <div
            className={`w-full lg:w-5/12 flex-1 lg:flex-initial flex flex-col bg-slate-900 overflow-hidden ${
              mobilePane === 'terminal' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <AiChatbox
              getTerminalBuffer={() => extractTerminalBuffer(termRef.current, 60)}
              metrics={metrics}
              socket={socket}
              onInsertCommand={(cmd) => handleVirtualKey(cmd + '\r')}
            />
          </div>
        )}
      </div>

      {/* Modal SSH Connection Settings */}
      <SshConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnectSsh}
        isConnecting={terminalStatus === 'connecting'}
      />
    </div>
  );
};
