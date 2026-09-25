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

  // Khởi tạo kết nối Socket.io với Token xác thực
  const { socket, isConnected } = useSocket(token);

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
            uptimeSeconds: metrics.uptime
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
