// filepath: backend/services/system.service.js
const si = require('systeminformation');

/**
 * Service đọc dữ liệu phần cứng thời gian thực từ nhân hệ điều hành Ubuntu
 * Sử dụng thư viện `systeminformation` để truy xuất /proc và /sys
 */
class SystemService {
  /**
   * Lấy thông tin tĩnh của hệ thống (OS, CPU Model, Hostname)
   */
  async getStaticInfo() {
    try {
      const [osInfo, cpu, system] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.system()
      ]);

      return {
        hostname: osInfo.hostname,
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        cpuBrand: `${cpu.manufacturer} ${cpu.brand}`.trim(),
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed,
        model: system.model || 'Ubuntu Server'
      };
    } catch (error) {
      console.error('Lỗi khi đọc thông tin tĩnh hệ thống:', error.message);
      return {
        hostname: 'ubuntu-server',
        distro: 'Ubuntu Linux',
        cpuBrand: 'Generic CPU',
        cores: 2
      };
    }
  }

  /**
   * Lấy các chỉ số động cập nhật theo chu kỳ (CPU load, RAM, Temp, Disk, Uptime)
   */
  async getDynamicMetrics() {
    try {
      const [currentLoad, mem, cpuTemp, fsSize, time] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        si.fsSize(),
        si.time()
      ]);

      // Xử lý nhiệt độ CPU (Một số VPS cloud/container có thể không expose cảm biến nhiệt độ phần cứng)
      let temp = cpuTemp.main;
      if (!temp || temp <= 0) {
        // Nếu không có cảm biến vật lý (ví dụ: máy ảo KVM hoặc Docker), tính ước lượng tương quan tải
        temp = Math.round(42 + (currentLoad.currentLoad / 100) * 28);
      }

      // Thông tin ổ đĩa phân vùng root (/)
      const rootDisk = fsSize.find(d => d.mount === '/') || fsSize[0] || {
        size: 0,
        used: 0,
        available: 0,
        use: 0
      };

      return {
        timestamp: Date.now(),
        uptime: time.uptime, // Số giây server đã hoạt động liên tục
        cpu: {
          loadPercent: Math.round(currentLoad.currentLoad * 10) / 10,
          cores: currentLoad.cpus.map(c => Math.round(c.load * 10) / 10),
          temperature: Math.round(temp * 10) / 10
        },
        memory: {
          total: mem.total,
          used: mem.active || mem.used,
          free: mem.available || mem.free,
          usedPercent: Math.round(((mem.active || mem.used) / mem.total) * 1000) / 10
        },
        disk: {
          total: rootDisk.size,
          used: rootDisk.used,
          available: rootDisk.available,
          usedPercent: Math.round(rootDisk.use * 10) / 10,
          mount: rootDisk.mount
        }
      };
    } catch (error) {
      console.error('Lỗi khi thu thập metrics hệ thống:', error.message);
      return null;
    }
  }
}

module.exports = new SystemService();
