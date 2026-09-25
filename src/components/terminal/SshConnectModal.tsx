// filepath: frontend/src/components/terminal/SshConnectModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Key,
  ShieldCheck,
  X,
  Bookmark,
  Trash2,
  Zap,
  Plus,
  Server,
  Lock,
  Unlock,
  CheckCircle2,
  Edit3,
  Globe,
  Tag,
  ArrowRight
} from 'lucide-react';
import { SshConfig, SavedSshProfile } from '../../types/system.types';
import {
  getSavedSshProfiles,
  saveSshProfile,
  deleteSshProfile,
  updateLastConnected
} from '../../utils/sshStorage';

interface SshConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: SshConfig) => void;
  isConnecting: boolean;
  initialProfileToLoad?: SavedSshProfile | null;
}

export const SshConnectModal: React.FC<SshConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
  initialProfileToLoad
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'form'>('saved');
  const [profiles, setProfiles] = useState<SavedSshProfile[]>([]);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('Máy chủ Ubuntu VPS');
  const [host, setHost] = useState<string>('127.0.0.1');
  const [port, setPort] = useState<number>(22);
  const [username, setUsername] = useState<string>('ubuntu');
  const [password, setPassword] = useState<string>('');
  const [saveProfile, setSaveProfile] = useState<boolean>(true);
  const [savePassword, setSavePassword] = useState<boolean>(true);
  const [tag, setTag] = useState<string>('Production');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load profiles when modal opens
  useEffect(() => {
    if (isOpen) {
      const list = getSavedSshProfiles();
      setProfiles(list);

      if (initialProfileToLoad) {
        loadProfileIntoForm(initialProfileToLoad);
      } else if (list.length > 0) {
        setActiveTab('saved');
      } else {
        setActiveTab('form');
      }
    }
  }, [isOpen, initialProfileToLoad]);

  if (!isOpen) return null;

  const loadProfileIntoForm = (p: SavedSshProfile) => {
    setEditingId(p.id);
    setProfileName(p.name);
    setHost(p.host);
    setPort(p.port);
    setUsername(p.username);
    setPassword(p.password || '');
    setSavePassword(!!p.savePassword);
    setTag(p.tag || 'Cục bộ');
    setSaveProfile(true);
    setActiveTab('form');
  };

  const resetForm = () => {
    setEditingId(null);
    setProfileName('Máy chủ Mới');
    setHost('127.0.0.1');
    setPort(22);
    setUsername('ubuntu');
    setPassword('');
    setSaveProfile(true);
    setSavePassword(true);
    setTag('Production');
  };

  const handleQuickConnect = (p: SavedSshProfile) => {
    updateLastConnected(p.id);
    onConnect({
      host: p.host,
      port: Number(p.port),
      username: p.username,
      password: p.password || undefined
    });
    onClose();
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa hồ sơ SSH này khỏi danh sách lưu?')) {
      const updated = deleteSshProfile(id);
      setProfiles(updated);
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const handleSaveOnly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !host.trim() || !username.trim()) {
      setStatusMessage('Vui lòng điền đầy đủ Tên hồ sơ, Host và Username.');
      return;
    }

    const saved = saveSshProfile({
      id: editingId || undefined,
      name: profileName.trim(),
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      password: password,
      savePassword: savePassword,
      tag: tag.trim() || 'Máy chủ'
    });

    setProfiles(getSavedSshProfiles());
    setStatusMessage(`Đã lưu thành công hồ sơ "${saved.name}"!`);
    setTimeout(() => {
      setStatusMessage(null);
      setActiveTab('saved');
    }, 800);
  };

  const handleSubmitConnect = (e: React.FormEvent) => {
    e.preventDefault();

    if (saveProfile) {
      const saved = saveSshProfile({
        id: editingId || undefined,
        name: profileName.trim() || `${username}@${host}`,
        host: host.trim(),
        port: Number(port) || 22,
        username: username.trim(),
        password: password,
        savePassword: savePassword,
        tag: tag.trim() || 'Máy chủ'
      });
      updateLastConnected(saved.id);
      setProfiles(getSavedSshProfiles());
    }

    onConnect({
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      password: password || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Quản Lý Kết Nối SSH</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Web Terminal
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trữ và kết nối nhanh 1-Click tới các máy chủ Ubuntu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'saved'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Tài Khoản Đã Lưu</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {profiles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('form');
            }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingId ? 'Chỉnh Sửa Hồ Sơ' : 'Thêm / Kết Nối Mới'}</span>
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab 1: Danh sách tài khoản đã lưu (Quick Connect) */}
        {activeTab === 'saved' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            {profiles.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-500">
                  <Server className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium text-slate-300">Chưa có tài khoản SSH nào được lưu</div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Hãy thêm thông tin máy chủ của bạn để lần sau có thể kết nối ngay chỉ với 1 cú click chuột.
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('form');
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 mx-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tài khoản đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Chọn máy chủ để kết nối nhanh (1-Click):</span>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('form');
                    }}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm máy chủ</span>
                  </button>
                </div>

                {profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleQuickConnect(p)}
                    className="group bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3.5 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm hover:shadow-emerald-950/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/80 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 flex-shrink-0 transition-colors">
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white text-xs sm:text-sm truncate group-hover:text-emerald-300 transition-colors">
                            {p.name}
                          </h4>
                          {p.tag && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                              {p.tag}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                          <span>
                            {p.username}@{p.host}:{p.port}
                          </span>
                          <span>•</span>
                          <span
                            className="flex items-center gap-0.5 text-slate-500"
                            title={p.savePassword ? 'Có mật khẩu lưu sẵn (Auto-login)' : 'Chưa lưu mật khẩu'}
                          >
                            {p.savePassword ? (
                              <Lock className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Unlock className="w-2.5 h-2.5 text-amber-400" />
                            )}
                            {p.savePassword ? 'Auto-Login' : 'Nhập mật khẩu'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Nút sửa */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadProfileIntoForm(p);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
                        title="Chỉnh sửa thông số"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Nút xóa */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProfile(p.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Nút kết nối nhanh */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickConnect(p);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-emerald-700/20 transition-all ml-1"
                        title="Kết nối nhanh 1-Click"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Kết nối</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Form Thêm / Chỉnh sửa hồ sơ SSH */}
        {activeTab === 'form' && (
          <form onSubmit={handleSubmitConnect} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Tên Gợi Nhớ (Profile Name)
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Ví dụ: VPS Ubuntu Chính, Server Nginx..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  Nhãn (Tag)
                </label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="Production">Production</option>
                  <option value="Cục bộ">Cục bộ (Local)</option>
                  <option value="Staging">Staging</option>
                  <option value="Dự phòng">Dự phòng</option>
                  <option value="Cloud">VPS Cloud</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  Địa chỉ Host / IP
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="127.0.0.1 hoặc tên miền"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Cổng (Port)
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  placeholder="22"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Tài khoản SSH (Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ubuntu hoặc root"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  Mật khẩu SSH (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Để trống nếu máy chủ xác thực bằng SSH Key cục bộ"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Checkbox lưu hồ sơ & mật khẩu */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveProfile}
                  onChange={(e) => setSaveProfile(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">Lưu máy chủ này vào danh sách kết nối nhanh</span>
              </label>

              {saveProfile && (
                <div className="pl-5 pt-1 space-y-1 border-t border-slate-800/80">
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savePassword}
                      onChange={(e) => setSavePassword(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Lưu kèm mật khẩu (để tự động kết nối 1-click không cần gõ lại)</span>
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Dữ liệu được lưu an toàn trong trình duyệt cục bộ (Local Storage) của thiết bị này.
                  </p>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSaveOnly}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Chỉ Lưu Hồ Sơ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-700/20 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>{editingId ? 'Cập Nhật & Kết Nối' : 'Lưu & Kết Nối Ngay'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
