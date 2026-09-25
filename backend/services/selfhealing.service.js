// filepath: backend/services/selfhealing.service.js
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SelfHealingService {
  constructor() {
    this.ramThresholdPercent = 95;      // Ngưỡng RAM: 95%
    this.ramDurationRequiredMs = 2 * 60 * 1000; // Phải duy trì liên tục trên 2 phút (120s)
    this.ramHighStartTime = null;        // Thời điểm bắt đầu vượt ngưỡng RAM

    this.diskThresholdPercent = 90;     // Ngưỡng Ổ cứng: 90%
    
    // Cooldown để tránh gọi liên tục dồn dập
    this.lastRamHealTime = 0;
    this.ramCooldownMs = 5 * 60 * 1000;  // 5 phút cooldown sau mỗi lần cứu hộ RAM
    
    this.lastDiskHealTime = 0;
    this.diskCooldownMs = 15 * 60 * 1000; // 15 phút cooldown sau mỗi lần dọn ổ đĩa

    this.io = null;
    this.healingLogs = [];
    this.isHealRunning = false;
  }

  /**
   * Khởi tạo liên kết Socket.io để phát sự kiện cảnh báo
   */
  init(io) {
    this.io = io;
    console.log('[SelfHealingService] 🩺 Đã kích hoạt hệ thống Tự Phục Hồi & Dọn Dẹp An Toàn (RAM >95%, Disk >90%)');
  }

  /**
   * Kiểm tra thông số định kỳ mỗi khi có metrics mới từ SystemService
   */
  async checkMetrics(metrics) {
    if (!metrics || this.isHealRunning) return;

    try {
      const memPercent = metrics.memory?.usedPercent || 0;
      const diskPercent = metrics.disk?.usedPercent || 0;
      const now = Date.now();

      // 1. KIỂM TRA NGƯỠNG BỘ NHỚ RAM (>95% TRONG 2 PHÚT)
      if (memPercent >= this.ramThresholdPercent) {
        if (!this.ramHighStartTime) {
          this.ramHighStartTime = now;
          console.warn(`[SelfHealingService] ⚠️ RAM vượt ngưỡng ${this.ramThresholdPercent}% (Hiện tại: ${memPercent}%). Bắt đầu theo dõi duy trì...`);
        } else {
          const duration = now - this.ramHighStartTime;
          // Nếu đã duy trì cao liên tục trên 2 phút và đã qua thời gian Cooldown
          if (duration >= this.ramDurationRequiredMs && (now - this.lastRamHealTime >= this.ramCooldownMs)) {
            await this.executeRamHealing(memPercent, Math.round(duration / 1000));
          }
        }
      } else {
        // Reset nếu RAM hạ xuống dưới ngưỡng
        if (this.ramHighStartTime) {
          this.ramHighStartTime = null;
        }
      }

      // 2. KIỂM TRA NGƯỠNG Ổ CỨNG (>90%)
      if (diskPercent >= this.diskThresholdPercent) {
        if (now - this.lastDiskHealTime >= this.diskCooldownMs) {
          await this.executeDiskHealing(diskPercent);
        }
      }
    } catch (err) {
      console.error('[SelfHealingService Check Error]:', err.message);
    }
  }

  /**
   * Thực thi chuỗi lệnh tự phục hồi RAM an toàn
   */
  async executeRamHealing(currentMemPercent, durationSeconds) {
    this.isHealRunning = true;
    this.lastRamHealTime = Date.now();
    this.ramHighStartTime = null;

    console.log(`[SelfHealingService] 🚨 KÍCH HOẠT TỰ PHỤC HỒI RAM: Sử dụng ${currentMemPercent}% liên tục ${durationSeconds}s`);

    const outputLogs = [];
    let dropCachesSuccess = false;
    let restartNginxSuccess = false;

    // Bước 1: Đồng bộ dữ liệu xuống đĩa và giải phóng PageCache, Dentries, Inodes
    try {
      await execPromise('sudo /bin/sync');
      // Thử lệnh sysctl giải phóng cache an toàn
      try {
        await execPromise('sudo /usr/sbin/sysctl -w vm.drop_caches=3');
      } catch (e1) {
        await execPromise('sudo /sbin/sysctl -w vm.drop_caches=3');
      }
      dropCachesSuccess = true;
      outputLogs.push('✓ Đã đồng bộ dữ liệu đĩa và giải phóng bộ đệm RAM (drop_caches=3)');
    } catch (err) {
      outputLogs.push(`⚠ Lỗi khi xả cache RAM: ${err.message}`);
    }

    // Bước 2: Khởi động lại Web Server Nginx để giải phóng worker rò rỉ bộ nhớ
    try {
      await execPromise('sudo /bin/systemctl restart nginx || sudo /usr/bin/systemctl restart nginx');
      restartNginxSuccess = true;
      outputLogs.push('✓ Đã khởi động lại dịch vụ Nginx thành công');
    } catch (err) {
      outputLogs.push(`⚠ Lỗi khi khởi động lại Nginx: ${err.message}`);
    }

    this.isHealRunning = false;

    const alertItem = {
      id: `heal-ram-${Date.now()}`,
      type: 'ram_heal',
      level: 'warning',
      title: 'TỰ ĐỘNG PHỤC HỒI RAM (SELF-HEAL)',
      action: 'Xả bộ đệm RAM Cache & Khởi động lại dịch vụ Nginx',
      details: `Bộ nhớ RAM sử dụng ${currentMemPercent}% duy trì trong ${durationSeconds} giây. Hệ thống đã tự động can thiệp để tránh OOM Crash.`,
      logs: outputLogs,
      success: dropCachesSuccess || restartNginxSuccess,
      timestamp: new Date().toISOString()
    };

    this.addLog(alertItem);

    // Phát cảnh báo qua Socket.io
    if (this.io) {
      this.io.emit('selfhealing:action', alertItem);
      this.io.emit('system:alert', alertItem);
    }

    return alertItem;
  }

  /**
   * Thực thi chuỗi lệnh dọn dẹp ổ đĩa an toàn
   */
  async executeDiskHealing(currentDiskPercent) {
    this.isHealRunning = true;
    this.lastDiskHealTime = Date.now();

    console.log(`[SelfHealingService] 🧹 KÍCH HOẠT DỌN DẸP Ổ CỨNG: Đã dùng ${currentDiskPercent}%`);

    const outputLogs = [];
    let vacuumSuccess = false;
    let aptCleanSuccess = false;

    // Bước 1: Thu gọn systemd journal log chỉ giữ lại 3 ngày gần nhất hoặc tối đa 100M
    try {
      await execPromise('sudo /usr/bin/journalctl --vacuum-time=3d');
      await execPromise('sudo /usr/bin/journalctl --vacuum-size=100M');
      vacuumSuccess = true;
      outputLogs.push('✓ Đã thu gọn nhật ký hệ thống systemd (journalctl giữ 3 ngày / 100MB)');
    } catch (err) {
      outputLogs.push(`⚠ Lỗi thu gọn journalctl: ${err.message}`);
    }

    // Bước 2: Dọn dẹp cache gói tải về của apt
    try {
      await execPromise('sudo /usr/bin/apt-get clean');
      await execPromise('sudo /usr/bin/apt-get autoremove -y');
      aptCleanSuccess = true;
      outputLogs.push('✓ Đã dọn dẹp kho cache apt và các package mồ côi không dùng');
    } catch (err) {
      outputLogs.push(`⚠ Lỗi dọn apt cache: ${err.message}`);
    }

    this.isHealRunning = false;

    const alertItem = {
      id: `heal-disk-${Date.now()}`,
      type: 'disk_heal',
      level: 'warning',
      title: 'TỰ ĐỘNG DỌN DẸP Ổ ĐĨA (SELF-CLEAN)',
      action: 'Thu gọn System Journal Logs & Dọn Cache Apt Packages',
      details: `Dung lượng ổ đĩa gốc (/) đạt ${currentDiskPercent}%. Hệ thống đã dọn dẹp rác an toàn để tránh tràn phân vùng.`,
      logs: outputLogs,
      success: vacuumSuccess || aptCleanSuccess,
      timestamp: new Date().toISOString()
    };

    this.addLog(alertItem);

    // Phát cảnh báo qua Socket.io
    if (this.io) {
      this.io.emit('selfhealing:action', alertItem);
      this.io.emit('system:alert', alertItem);
    }

    return alertItem;
  }

  /**
   * Kích hoạt dọn dẹp thủ công theo yêu cầu của Quản trị viên
   */
  async triggerManualCleanup(type) {
    if (type === 'ram') {
      return await this.executeRamHealing(100, 0);
    } else if (type === 'disk') {
      return await this.executeDiskHealing(95);
    } else {
      const ramRes = await this.executeRamHealing(100, 0);
      const diskRes = await this.executeDiskHealing(95);
      return { success: true, ramRes, diskRes };
    }
  }

  addLog(item) {
    this.healingLogs.unshift(item);
    if (this.healingLogs.length > 50) {
      this.healingLogs.pop();
    }
  }

  getStatus() {
    return {
      ramThreshold: this.ramThresholdPercent,
      diskThreshold: this.diskThresholdPercent,
      isMonitoring: true,
      lastRamHealTime: this.lastRamHealTime ? new Date(this.lastRamHealTime).toISOString() : null,
      lastDiskHealTime: this.lastDiskHealTime ? new Date(this.lastDiskHealTime).toISOString() : null,
      healingLogs: this.healingLogs
    };
  }
}

module.exports = new SelfHealingService();
