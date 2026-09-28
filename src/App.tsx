// filepath: frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { getStoredToken, removeStoredToken } from './api/auth.api';
import { AuthUser } from './types/system.types';
import { useSocket } from './hooks/useSocket';
import { useSystemStats } from './hooks/useSystemStats';
import { LoginForm } from './components/auth/LoginForm';
import { ChangeCredentialsModal } from './components/auth/ChangeCredentialsModal';
import { UpdateModal } from './components/update/UpdateModal';
import { TelegramSettingsModal } from './components/telegram/TelegramSettingsModal';
import { ServerConnectionModal } from './components/common/ServerConnectionModal';
import { Header, NavTabType } from './components/layout/Header';
import { TabsNav } from './components/layout/TabsNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { NetworkView } from './components/network/NetworkView';
import { WebTerminal } from './components/terminal/WebTerminal';
import { AgentView } from './components/ai/AgentView';
import { clientTelegramListener } from './services/client_telegram_listener.service';
import { sendAiQuery } from './api/ai.api';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

export default function App() {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(
    token ? { username: 'admin', role: 'admin' } : null
  );
  const [activeTab, setActiveTab] = useState<NavTabType>('monitor');
  const [isChangeCredsOpen, setIsChangeCredsOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Khởi tạo kết nối Socket.io với Token xác thực
  const { socket, isConnected, reconnect } = useSocket(token);

  // Hook nhận luồng thông số phần cứng thời gian thực
  const { staticInfo, metrics, history } = useSystemStats(socket, isConnected);

  // Lắng nghe trực tiếp tin nhắn Telegram từ trình duyệt (Client-side long polling)
  useEffect(() => {
    // Kết nối bộ xử lý tin nhắn AI Agent kèm ngữ cảnh đa lượt
    clientTelegramListener.setMessageHandler(async (incoming) => {
      try {
        const response = await sendAiQuery({
          message: incoming.text,
          history: incoming.history,
          systemMetrics: metrics ? {
            cpuLoad: metrics.cpu.loadPercent,
            ramUsedPercent: metrics.memory.usedPercent,
            temperature: metrics.cpu.temperature,
            uptimeSeconds: metrics.uptime,
            powerWatts: metrics.power?.currentWatts
          } : undefined,
          executionMode: 'auto_pilot'
        });

        if (response.reply) {
          return response.reply;
        }
        return 'Đã xử lý xong yêu cầu của bạn.';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi xử lý';
        return `⚠️ Không thể xử lý yêu cầu lúc này: ${msg}`;
      }
    });

    clientTelegramListener.start();

    return () => {
      clientTelegramListener.stop();
    };
  }, [metrics]);

  // Tự động kiểm tra và giải phóng Demo Token nếu đang truy cập trên tên miền thật qua HTTPS
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      const origin = window.location.origin;
      const storedUrl = localStorage.getItem('ubuntu_monitor_server_url');
      if (storedUrl && (storedUrl.includes('192.168.') || storedUrl.includes('localhost') || storedUrl.includes('127.0.0.1') || storedUrl.startsWith('http://'))) {
        localStorage.setItem('ubuntu_monitor_server_url', origin);
      }

      const storedToken = localStorage.getItem('ubuntu_monitor_token');
      if (storedToken === 'demo_jwt_token_sample_2026') {
        removeStoredToken();
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  // Xử lý khi đăng nhập thành công
  const handleLoginSuccess = (newToken: string, loggedUser: AuthUser) => {
    setToken(newToken);
    setUser(loggedUser);
  };

  // Xử lý cập nhật thông tin tài khoản / mật khẩu thành công
  const handleCredentialsUpdated = (newToken: string, updatedUser: AuthUser) => {
    setToken(newToken);
    setUser(updatedUser);
  };

  // Xử lý khi đăng xuất
  const handleLogout = () => {
    removeStoredToken();
    localStorage.removeItem('ubuntu_monitor_token');
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes(':3000') && !window.location.origin.includes(':5173')) {
      localStorage.setItem('ubuntu_monitor_server_url', window.location.origin);
    }
    setToken(null);
    setUser(null);
  };

  // Nếu chưa đăng nhập, hiển thị Màn hình Đăng nhập an toàn
  if (!token) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-200 transition-colors duration-200">
      {/* 1. Header chính */}
      <Header
        user={user}
        isConnected={isConnected}
        hostname={staticInfo.hostname}
        onLogout={handleLogout}
        onChangeCredentials={() => setIsChangeCredsOpen(true)}
        onOpenUpdate={() => setIsUpdateOpen(true)}
        onOpenTelegram={() => setIsTelegramOpen(true)}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Cảnh báo rõ ràng khi đang ở chế độ Demo mô phỏng (Chưa nối tới server thật) */}
      {!isConnected && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-6 py-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
              <span>
                <strong>CHẾ ĐỘ MÔ PHỎNG (DEMO):</strong> Bạn đang xem thông số phần cứng mẫu (CPU AMD EPYC giả lập). Chưa kết nối tới máy chủ Ubuntu thật của bạn.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-auto text-[11px]"
            >
              Kết Nối Máy Chủ Thật &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Modal cấu hình kết nối máy chủ */}
      <ServerConnectionModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        isConnected={isConnected}
        onReconnect={(newUrl) => {
          reconnect();
        }}
      />

      {/* Modal đổi tài khoản / mật khẩu */}
      <ChangeCredentialsModal
        isOpen={isChangeCredsOpen}
        onClose={() => setIsChangeCredsOpen(false)}
        token={token}
        currentUser={user}
        onUpdateSuccess={handleCredentialsUpdated}
      />

      {/* Modal tự động cập nhật hệ thống từ GitHub */}
      <UpdateModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        token={token}
        socket={socket}
      />

      {/* Modal cấu hình Telegram Bot trực tiếp trên Web */}
      <TelegramSettingsModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />

      {/* 2. Nội dung các Tab chức năng */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6 pb-20 md:pb-8">
        {activeTab === 'monitor' ? (
          <DashboardView
            staticInfo={staticInfo}
            metrics={metrics}
            history={history}
            isConnected={isConnected}
            onOpenTerminal={() => setActiveTab('terminal')}
            onOpenUpdate={() => setIsUpdateOpen(true)}
            token={token}
            socket={socket}
          />
        ) : activeTab === 'network' ? (
          <NetworkView token={token} />
        ) : activeTab === 'agent' ? (
          <AgentView
            socket={socket}
            metrics={metrics}
            staticInfo={staticInfo}
            onOpenTerminal={() => setActiveTab('terminal')}
            onOpenTelegram={() => setIsTelegramOpen(true)}
          />
        ) : (
          <div className="space-y-4 pb-12 md:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Web-based SSH Terminal
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thực thi lệnh trực tiếp trên máy chủ Ubuntu qua WebSocket stream
                </p>
              </div>
            </div>

            {/* Container Web Terminal có hỗ trợ phím ảo cho Android và tích hợp AI SysAdmin */}
            <WebTerminal socket={socket} isConnected={isConnected} metrics={metrics} />
          </div>
        )}
      </main>

      {/* 3. Thanh điều hướng Tab cố định bên dưới dành cho điện thoại Android */}
      <TabsNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Cảnh báo chế độ Offline PWA */}
      <OfflineIndicator />
    </div>
  );
}
