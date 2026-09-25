// filepath: frontend/src/App.tsx
import { useState } from 'react';
import { getStoredToken, removeStoredToken } from './api/auth.api';
import { AuthUser } from './types/system.types';
import { useSocket } from './hooks/useSocket';
import { useSystemStats } from './hooks/useSystemStats';
import { LoginForm } from './components/auth/LoginForm';
import { ChangeCredentialsModal } from './components/auth/ChangeCredentialsModal';
import { Header } from './components/layout/Header';
import { TabsNav } from './components/layout/TabsNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { WebTerminal } from './components/terminal/WebTerminal';

export default function App() {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(
    token ? { username: 'admin', role: 'admin' } : null
  );
  const [activeTab, setActiveTab] = useState<'monitor' | 'terminal'>('monitor');
  const [isChangeCredsOpen, setIsChangeCredsOpen] = useState(false);

  // Khởi tạo kết nối Socket.io với Token xác thực
  const { socket, isConnected } = useSocket(token);

  // Hook nhận luồng thông số phần cứng thời gian thực
  const { staticInfo, metrics, history } = useSystemStats(socket, isConnected);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Header chính */}
      <Header
        user={user}
        isConnected={isConnected}
        hostname={staticInfo.hostname}
        onLogout={handleLogout}
        onChangeCredentials={() => setIsChangeCredsOpen(true)}
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

      {/* 2. Nội dung các Tab chức năng */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'monitor' ? (
          <DashboardView
            staticInfo={staticInfo}
            metrics={metrics}
            history={history}
            isConnected={isConnected}
            onOpenTerminal={() => setActiveTab('terminal')}
          />
        ) : (
          <div className="space-y-4 pb-20 md:pb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Web-based SSH Terminal</h2>
                <p className="text-xs text-slate-400">
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
    </div>
  );
}
