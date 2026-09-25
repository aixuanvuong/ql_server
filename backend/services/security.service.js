// filepath: backend/services/security.service.js
const { exec, spawn } = require('child_process');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

class SecurityService {
  constructor() {
    this.maxFailedAttempts = 5;       // Số lần thất bại tối đa
    this.timeWindowMs = 5 * 60 * 1000; // 5 phút (300.000 ms)
    
    // Lưu lịch sử các lần đăng nhập sai theo IP: Map<ip, timestamp[]>
    this.failedAttempts = new Map();
    
    // Danh sách các IP đã chặn: Set<ip>
    this.bannedIps = new Set();
    
    // Nhật ký sự kiện bảo mật (lưu tối đa 100 sự kiện gần nhất)
    this.alerts = [];

    // Socket.io instance
    this.io = null;

    // Tiến trình tail đang theo dõi log
    this.tailProcess = null;
    this.isWatching = false;
  }

  /**
   * Khởi tạo giám sát log xác thực SSH trong thời gian thực
   */
  startMonitoring(io) {
    if (this.isWatching) return;
    this.io = io;
    this.isWatching = true;

    // Nạp danh sách các IP đã bị chặn trước đó từ iptables/ufw
    this.loadExistingBans().catch((err) => {
      console.warn('[SecurityService] Warning loading existing bans:', err.message);
    });

    // Bắt đầu lắng nghe log SSH
    this.initLogWatcher();

    // Dọn dẹp định kỳ các bản ghi thất bại đã quá 5 phút
    setInterval(() => this.cleanupExpiredAttempts(), 60 * 1000);
  }

  /**
   * Khởi chạy tiến trình theo dõi log auth.log hoặc journalctl
   */
  initLogWatcher() {
    try {
      const authLogPath = '/var/log/auth.log';
      let spawnCmd = 'tail';
      let spawnArgs = ['-F', '-n', '0', authLogPath];

      // Nếu hệ thống Ubuntu 24.04+ không có file /var/log/auth.log, dùng journalctl
      if (!fs.existsSync(authLogPath)) {
        spawnCmd = 'journalctl';
        spawnArgs = ['-u', 'ssh', '-u', 'sshd', '-f', '-n', '0', '-o', 'cat'];
      }

      console.log(`[SecurityService] 🛡️ Bắt đầu theo dõi đăng nhập SSH qua: ${spawnCmd} ${spawnArgs.join(' ')}`);
      
      this.tailProcess = spawn(spawnCmd, spawnArgs);

      this.tailProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.processAuthLine(line);
          }
        }
      });

      this.tailProcess.stderr.on('data', (chunk) => {
        const errText = chunk.toString().trim();
        if (errText) {
          console.warn('[SecurityService Log Watcher Stderr]:', errText);
        }
      });

      this.tailProcess.on('close', (code) => {
        console.warn(`[SecurityService] Log watcher kết thúc với mã ${code}. Đang thử khởi động lại sau 5s...`);
        this.isWatching = false;
        setTimeout(() => this.initLogWatcher(), 5000);
      });

      this.tailProcess.on('error', (err) => {
        console.error('[SecurityService Log Watcher Error]:', err.message);
        this.isWatching = false;
      });
    } catch (error) {
      console.error('[SecurityService Start Error]:', error.message);
      this.isWatching = false;
    }
  }

  /**
   * Phân tích từng dòng log SSH để phát hiện các lần xác thực thất bại
   */
  processAuthLine(line) {
    try {
      // Regex phát hiện các mẫu thất bại phổ biến của OpenSSH:
      // 1. Failed password for invalid user root from 1.2.3.4 port 1234 ssh2
      // 2. Failed password for root from 1.2.3.4 port 1234 ssh2
      // 3. Invalid user admin from 1.2.3.4 port 1234
      // 4. authentication failure; ... rhost=1.2.3.4
      let ip = null;
      let reason = 'Đăng nhập SSH sai mật khẩu liên tục';

      const failedMatch = line.match(/Failed password for (?:invalid user )?(\S+) from (\d+\.\d+\.\d+\.\d+)/i);
      const rhostMatch = line.match(/authentication failure;.*rhost=(\d+\.\d+\.\d+\.\d+)/i);
      const invalidUserMatch = line.match(/Invalid user (\S+) from (\d+\.\d+\.\d+\.\d+)/i);

      if (failedMatch) {
        ip = failedMatch[2];
        const user = failedMatch[1];
        reason = `Nhập sai mật khẩu tài khoản '${user}'`;
      } else if (rhostMatch) {
        ip = rhostMatch[1];
        reason = 'Xác thực SSH thất bại';
      } else if (invalidUserMatch) {
        ip = invalidUserMatch[2];
        const user = invalidUserMatch[1];
        reason = `Cố gắng dò quét tài khoản không tồn tại '${user}'`;
      }

      if (ip) {
        this.registerFailedAttempt(ip, reason);
      }
    } catch (err) {
      console.error('[SecurityService Process Line Error]:', err.message);
    }
  }

  /**
   * Ghi nhận 1 lần thất bại và kích hoạt lệnh chặn nếu vượt quá 5 lần / 5 phút
   */
  async registerFailedAttempt(ip, reason) {
    // 1. Kiểm tra an toàn: Không bao giờ chặn IP cục bộ / Whitelist
    if (this.isWhitelistedIp(ip)) {
      return;
    }

    // 2. Nếu IP đã bị chặn trước đó, bỏ qua
    if (this.bannedIps.has(ip)) {
      return;
    }

    const now = Date.now();
    const attempts = this.failedAttempts.get(ip) || [];
    
    // Lọc lại các lần thử trong vòng 5 phút gần nhất
    const recentAttempts = attempts.filter((time) => now - time <= this.timeWindowMs);
    recentAttempts.push(now);
    this.failedAttempts.set(ip, recentAttempts);

    console.log(`[SecurityService] ⚠️ Cảnh báo: IP ${ip} đăng nhập thất bại (${recentAttempts.length}/${this.maxFailedAttempts}) - ${reason}`);

    // Bắn sự kiện cảnh báo sớm lên giao diện web
    if (this.io) {
      this.io.emit('security:attempt', {
        ip,
        count: recentAttempts.length,
        max: this.maxFailedAttempts,
        reason,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Nếu vượt ngưỡng 5 lần trong 5 phút -> Chặn ngay lập tức!
    if (recentAttempts.length >= this.maxFailedAttempts) {
      await this.banIp(ip, `Thất bại ${recentAttempts.length} lần trong 5 phút (${reason})`);
    }
  }

  /**
   * Thực thi lệnh chặn IP bằng ufw hoặc iptables
   */
  async banIp(ip, reason) {
    if (this.bannedIps.has(ip) || this.isWhitelistedIp(ip)) {
      return { success: false, message: 'IP đã bị chặn hoặc nằm trong Whitelist an toàn.' };
    }

    this.bannedIps.add(ip);
    this.failedAttempts.delete(ip);

    console.log(`[SecurityService] 🚫 Đang kích hoạt chặn IP Hacker: ${ip} (Lý do: ${reason})`);

    let executionSuccess = false;
    let methodUsed = '';

    // Thử chặn bằng UFW trước
    try {
      await execPromise(`sudo /usr/sbin/ufw deny from ${ip} to any`);
      executionSuccess = true;
      methodUsed = 'ufw deny';
    } catch (ufwErr) {
      // Nếu UFW không khả dụng hoặc lỗi, fallback sang iptables
      try {
        await execPromise(`sudo /usr/sbin/iptables -I INPUT -s ${ip} -j DROP`);
        executionSuccess = true;
        methodUsed = 'iptables DROP';
      } catch (iptablesErr) {
        console.error('[SecurityService Ban Error]:', iptablesErr.message);
      }
    }

    const alertItem = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'ban',
      level: 'critical',
      title: `ĐÃ CHẶN HACKER: ${ip}`,
      ip,
      reason,
      method: methodUsed || 'tường lửa',
      success: executionSuccess,
      timestamp: new Date().toISOString()
    };

    this.addAlert(alertItem);

    // Phát sự kiện Socket.io thời gian thực lên toàn bộ client web
    if (this.io) {
      this.io.emit('security:ban', alertItem);
      this.io.emit('system:alert', alertItem);
    }

    return {
      success: executionSuccess,
      ip,
      message: `Đã chặn thành công IP ${ip} qua ${methodUsed}`
    };
  }

  /**
   * Bỏ chặn (Unban) IP nếu người quản trị muốn gỡ
   */
  async unbanIp(ip) {
    if (!ip) return { success: false, message: 'Thiếu địa chỉ IP' };

    try {
      // Gỡ từ UFW
      try {
        await execPromise(`sudo /usr/sbin/ufw delete deny from ${ip}`);
      } catch (e) {
        // Bỏ qua nếu rule không có trong ufw
      }

      // Gỡ từ iptables
      try {
        await execPromise(`sudo /usr/sbin/iptables -D INPUT -s ${ip} -j DROP`);
      } catch (e) {
        // Bỏ qua nếu rule không có trong iptables
      }

      this.bannedIps.delete(ip);

      const alertItem = {
        id: `alert-unban-${Date.now()}`,
        type: 'unban',
        level: 'info',
        title: `Đã mở chặn IP: ${ip}`,
        ip,
        reason: 'Quản trị viên gỡ bỏ giới hạn thủ công',
        timestamp: new Date().toISOString()
      };

      this.addAlert(alertItem);
      if (this.io) {
        this.io.emit('security:unban', alertItem);
      }

      return { success: true, message: `Đã mở chặn IP ${ip}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Tải danh sách IP đang bị chặn từ ufw / iptables
   */
  async loadExistingBans() {
    try {
      const { stdout } = await execPromise('sudo /usr/sbin/iptables -L INPUT -n');
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('DROP')) {
          const match = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
          if (match && match[0] !== '0.0.0.0') {
            this.bannedIps.add(match[0]);
          }
        }
      }
    } catch (e) {
      // Có thể chưa cấu hình sudoers hoặc không có rule nào
    }
  }

  /**
   * Kiểm tra xem IP có thuộc danh sách an toàn không
   */
  isWhitelistedIp(ip) {
    if (!ip) return true;
    // Loopback và private network
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
    if (ip.startsWith('172.')) {
      const parts = ip.split('.');
      if (parts.length >= 2) {
        const sec = parseInt(parts[1], 10);
        if (sec >= 16 && sec <= 31) return true;
      }
    }
    return false;
  }

  /**
   * Dọn dẹp các IP đã hết hạn thử
   */
  cleanupExpiredAttempts() {
    const now = Date.now();
    for (const [ip, timestamps] of this.failedAttempts.entries()) {
      const valid = timestamps.filter((time) => now - time <= this.timeWindowMs);
      if (valid.length === 0) {
        this.failedAttempts.delete(ip);
      } else {
        this.failedAttempts.set(ip, valid);
      }
    }
  }

  /**
   * Thêm sự kiện vào lịch sử cảnh báo
   */
  addAlert(alertItem) {
    this.alerts.unshift(alertItem);
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }
  }

  /**
   * Lấy danh sách trạng thái an ninh mạng hiện tại
   */
  getSecurityStatus() {
    return {
      bannedIps: Array.from(this.bannedIps),
      totalBanned: this.bannedIps.size,
      alerts: this.alerts,
      activeMonitoring: this.isWatching
    };
  }
}

module.exports = new SecurityService();
