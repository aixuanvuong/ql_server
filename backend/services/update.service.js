// filepath: backend/services/update.service.js
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

class UpdateService {
  constructor() {
    this.isUpdating = false;
    this.updateLogs = [];
    this.lastChecked = null;
    this.installDir = this.detectInstallDir();
  }

  /**
   * Phát hiện thư mục gốc của dự án ql_server
   */
  detectInstallDir() {
    const candidates = [
      '/opt/ql_server',
      path.resolve(__dirname, '../../'),
      path.resolve(__dirname, '../..'),
      process.cwd()
    ];

    for (const dir of candidates) {
      if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, 'scripts/quanlysv.sh'))) {
        return dir;
      }
    }
    return '/opt/ql_server';
  }

  /**
   * Kiểm tra xem có phiên bản / commit mới trên GitHub hay không
   */
  async checkForUpdates() {
    try {
      const gitDir = this.installDir;
      // Lấy hash commit cục bộ hiện tại
      let localCommit = 'unknown';
      let localBranch = 'main';
      try {
        const { stdout: hashOut } = await execPromise('git rev-parse HEAD', { cwd: gitDir });
        localCommit = hashOut.trim().slice(0, 7);
        const { stdout: branchOut } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: gitDir });
        localBranch = branchOut.trim() || 'main';
      } catch (e) {
        // Bỏ qua nếu môi trường test không có git
      }

      // Fetch thông tin mới từ remote
      let remoteCommit = localCommit;
      let hasUpdate = false;
      let behindCount = 0;
      let commitMessage = '';

      try {
        await execPromise('git fetch origin', { cwd: gitDir, timeout: 10000 });
        const { stdout: remoteOut } = await execPromise(`git rev-parse origin/${localBranch}`, { cwd: gitDir });
        remoteCommit = remoteOut.trim().slice(0, 7);

        const { stdout: countOut } = await execPromise(`git rev-list --count HEAD..origin/${localBranch}`, { cwd: gitDir });
        behindCount = parseInt(countOut.trim(), 10) || 0;
        hasUpdate = behindCount > 0;

        if (hasUpdate) {
          const { stdout: logOut } = await execPromise(`git log -1 --pretty=format:"%s (%an)" origin/${localBranch}`, { cwd: gitDir });
          commitMessage = logOut.trim();
        }
      } catch (e) {
        console.warn('[UpdateService] git fetch check warning:', e.message);
      }

      this.lastChecked = new Date().toISOString();

      return {
        success: true,
        isUpdating: this.isUpdating,
        hasUpdate,
        behindCount,
        localCommit,
        remoteCommit,
        localBranch,
        commitMessage,
        lastChecked: this.lastChecked
      };
    } catch (error) {
      return {
        success: false,
        isUpdating: this.isUpdating,
        hasUpdate: false,
        error: error.message
      };
    }
  }

  /**
   * Khởi động quá trình tự động cập nhật
   */
  triggerUpdate(io) {
    if (this.isUpdating) {
      return { success: false, message: 'Hệ thống đang trong quá trình cập nhật! Vui lòng chờ.' };
    }

    this.isUpdating = true;
    this.updateLogs = [];
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    this.log(`[${timestamp}] 🚀 Bắt đầu quá trình tự động cập nhật hệ thống...`, io);

    const scriptPath = path.join(this.installDir, 'scripts/quanlysv.sh');
    const updateScript = `
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

echo "[1/5] 📥 Đang tải mã nguồn mới nhất từ GitHub..."
cd "${this.installDir}"
git fetch --all
git reset --hard origin/main || git pull origin main || git pull origin master

echo "[2/5] 📦 Cập nhật các gói phụ thuộc Backend..."
cd "${this.installDir}/backend" 2>/dev/null || cd "${this.installDir}"
npm install --production --legacy-peer-deps

echo "[3/5] 🔨 Biên dịch lại giao diện Frontend (Production Build)..."
cd "${this.installDir}/frontend" 2>/dev/null || cd "${this.installDir}"
npm install --legacy-peer-deps
npm run build

echo "[4/5] 🌐 Triển khai file tĩnh vào Web Server Nginx..."
WEB_ROOT="/var/www/ql_server"
mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/* 2>/dev/null || true
if [ -d "dist" ]; then
  cp -r dist/* "$WEB_ROOT/"
elif [ -d "build" ]; then
  cp -r build/* "$WEB_ROOT/"
elif [ -d "${this.installDir}/dist" ]; then
  cp -r "${this.installDir}/dist"/* "$WEB_ROOT/"
fi

# Đồng bộ file quanlysv.sh vào hệ thống
if [ -f "${this.installDir}/scripts/quanlysv.sh" ]; then
  cp "${this.installDir}/scripts/quanlysv.sh" /usr/local/bin/quanlysv 2>/dev/null || true
  chmod +x /usr/local/bin/quanlysv 2>/dev/null || true
fi

echo "[5/5] 🔄 Khởi động lại dịch vụ máy chủ..."
systemctl restart nginx 2>/dev/null || true
pm2 restart ql_server-backend 2>/dev/null || pm2 restart ql_server 2>/dev/null || pm2 restart all 2>/dev/null || true

echo "✅ Cập nhật thành công 100%! Hệ thống đang chạy phiên bản mới nhất."
`;

    // Chạy tiến trình shell cập nhật
    const child = spawn('bash', ['-c', updateScript]);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      this.log(text, io);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      this.log(text, io);
    });

    child.on('close', (code) => {
      this.isUpdating = false;
      if (code === 0) {
        this.log('🎉 [HOÀN TẤT] Quá trình cập nhật đã kết thúc thành công! Trang web sẽ tự động làm mới.', io);
        if (io) {
          io.emit('update:completed', { success: true, message: 'Cập nhật thành công!' });
        }
      } else {
        this.log(`❌ [LỖI] Tiến trình cập nhật kết thúc với mã lỗi: ${code}`, io);
        if (io) {
          io.emit('update:completed', { success: false, message: `Lỗi cập nhật (mã: ${code})` });
        }
      }
    });

    child.on('error', (err) => {
      this.isUpdating = false;
      this.log(`❌ [LỖI KHỞI CHẠY]: ${err.message}`, io);
      if (io) {
        io.emit('update:completed', { success: false, message: err.message });
      }
    });

    return {
      success: true,
      message: 'Tiến trình tự động cập nhật đã được khởi chạy trong nền.'
    };
  }

  log(message, io) {
    const lines = message.split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        this.updateLogs.push(line);
        if (this.updateLogs.length > 500) {
          this.updateLogs.shift();
        }
        if (io) {
          io.emit('update:log', line);
        }
      }
    });
  }

  getUpdateStatus() {
    return {
      isUpdating: this.isUpdating,
      logs: this.updateLogs,
      lastChecked: this.lastChecked
    };
  }
}

module.exports = new UpdateService();
