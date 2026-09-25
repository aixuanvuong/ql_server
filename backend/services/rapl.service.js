// filepath: backend/services/rapl.service.js
const fs = require('fs');
const path = require('path');

/**
 * Service trích xuất dữ liệu Điện năng Thời gian thực từ phần cứng
 * thông qua giao tiếp Intel RAPL (Running Average Power Limit) trên Linux Kernel
 * Hỗ trợ các chuẩn Sysfs: /sys/class/powercap/intel-rapl/
 */
class RaplService {
  constructor() {
    this.sysfsBasePath = '/sys/class/powercap/intel-rapl';
    this.altSysfsBasePath = '/sys/devices/virtual/powercap/intel-rapl';
    this.isHardwareAvailable = null;
    this.availableZones = []; // Danh sách domain RAPL tìm thấy (package-0, core, uncore, dram, psys)
    this.previousReadings = new Map(); // id -> { energyUj, timestamp }
    this.cumulativeJoules = 0;
    this.startTime = Date.now();
    this.lastSampleTime = Date.now();
  }

  /**
   * Khởi tạo và quét các RAPL domain trên phần cứng hệ điều hành
   */
  async initZones() {
    if (this.isHardwareAvailable !== null) return;

    let targetDir = null;
    if (fs.existsSync(this.sysfsBasePath)) {
      targetDir = this.sysfsBasePath;
    } else if (fs.existsSync(this.altSysfsBasePath)) {
      targetDir = this.altSysfsBasePath;
    }

    if (!targetDir) {
      this.isHardwareAvailable = false;
      this.availableZones = [];
      return;
    }

    try {
      const entries = await fs.promises.readdir(targetDir);
      const zones = [];

      for (const entry of entries) {
        if (entry.startsWith('intel-rapl:')) {
          const zonePath = path.join(targetDir, entry);
          const stat = await fs.promises.stat(zonePath);
          if (stat.isDirectory()) {
            // Đọc tên zone
            let name = entry;
            try {
              name = (await fs.promises.readFile(path.join(zonePath, 'name'), 'utf8')).trim();
            } catch (e) {}

            // Đọc max energy range
            let maxEnergyRangeUj = 0;
            try {
              maxEnergyRangeUj = parseFloat(await fs.promises.readFile(path.join(zonePath, 'max_energy_range_uj'), 'utf8'));
            } catch (e) {}

            // Đọc power limits (PL1 & PL2)
            let pl1Watts = null;
            let pl2Watts = null;
            try {
              const pl1Uw = parseFloat(await fs.promises.readFile(path.join(zonePath, 'constraint_0_power_limit_uw'), 'utf8'));
              if (!isNaN(pl1Uw) && pl1Uw > 0) pl1Watts = Math.round((pl1Uw / 1000000) * 10) / 10;
            } catch (e) {}

            try {
              const pl2Uw = parseFloat(await fs.promises.readFile(path.join(zonePath, 'constraint_1_power_limit_uw'), 'utf8'));
              if (!isNaN(pl2Uw) && pl2Uw > 0) pl2Watts = Math.round((pl2Uw / 1000000) * 10) / 10;
            } catch (e) {}

            zones.push({
              id: entry,
              path: zonePath,
              name,
              maxEnergyRangeUj,
              pl1Watts,
              pl2Watts
            });

            // Quét các sub-domain (ví dụ intel-rapl:0:0 - core, intel-rapl:0:1 - uncore)
            try {
              const subEntries = await fs.promises.readdir(zonePath);
              for (const sub of subEntries) {
                if (sub.startsWith(`${entry}:`)) {
                  const subPath = path.join(zonePath, sub);
                  const subStat = await fs.promises.stat(subPath);
                  if (subStat.isDirectory()) {
                    let subName = sub;
                    try {
                      subName = (await fs.promises.readFile(path.join(subPath, 'name'), 'utf8')).trim();
                    } catch (e) {}

                    zones.push({
                      id: sub,
                      path: subPath,
                      name: subName,
                      maxEnergyRangeUj: 0,
                      pl1Watts: null,
                      pl2Watts: null
                    });
                  }
                }
              }
            } catch (e) {}
          }
        }
      }

      this.availableZones = zones;
      this.isHardwareAvailable = zones.length > 0;
      console.log(`[Intel RAPL] Đã phát hiện ${zones.length} power domain phần cứng.`);
    } catch (err) {
      console.warn('[Intel RAPL] Không thể đọc sysfs RAPL:', err.message);
      this.isHardwareAvailable = false;
      this.availableZones = [];
    }
  }

  /**
   * Đọc công suất tức thời từ phần cứng qua chênh lệch microjoules
   */
  async getHardwarePowerReadings() {
    await this.initZones();

    if (!this.isHardwareAvailable || this.availableZones.length === 0) {
      return null;
    }

    const now = Date.now();
    const zoneResults = [];
    let packageWatts = 0;
    let coresWatts = 0;
    let uncoreWatts = 0;
    let dramWatts = 0;
    let platformWatts = 0;
    let pl1Limit = null;
    let pl2Limit = null;

    for (const zone of this.availableZones) {
      try {
        const energyFile = path.join(zone.path, 'energy_uj');
        const content = await fs.promises.readFile(energyFile, 'utf8');
        const currentEnergyUj = parseFloat(content.trim());

        if (isNaN(currentEnergyUj)) continue;

        let powerWatts = 0;
        const prev = this.previousReadings.get(zone.id);

        if (prev) {
          const deltaMs = now - prev.timestamp;
          if (deltaMs > 200) {
            let deltaEnergyUj = currentEnergyUj - prev.energyUj;
            if (deltaEnergyUj < 0 && zone.maxEnergyRangeUj > 0) {
              deltaEnergyUj += zone.maxEnergyRangeUj;
            }
            if (deltaEnergyUj >= 0) {
              // P = (deltaEnergyUj / 10^6 Joules) / (deltaMs / 1000 s) = (deltaEnergyUj / deltaMs) / 1000
              powerWatts = Math.round((deltaEnergyUj / (deltaMs * 1000)) * 100) / 100;
            }
          } else {
            powerWatts = prev.lastWatts || 0;
          }
        }

        this.previousReadings.set(zone.id, {
          energyUj: currentEnergyUj,
          timestamp: now,
          lastWatts: powerWatts
        });

        // Phân loại domain RAPL
        const lowerName = zone.name.toLowerCase();
        let label = zone.name;

        if (lowerName.includes('package') || lowerName.includes('pkg')) {
          label = 'CPU Package (Toàn bộ chip)';
          packageWatts = Math.max(packageWatts, powerWatts);
          if (zone.pl1Watts) pl1Limit = zone.pl1Watts;
          if (zone.pl2Watts) pl2Limit = zone.pl2Watts;
        } else if (lowerName.includes('core')) {
          label = 'CPU Compute Cores (PP0)';
          coresWatts = Math.max(coresWatts, powerWatts);
        } else if (lowerName.includes('uncore')) {
          label = 'Uncore / iGPU / L3 Cache (PP1)';
          uncoreWatts = Math.max(uncoreWatts, powerWatts);
        } else if (lowerName.includes('dram')) {
          label = 'DRAM Memory Controller';
          dramWatts = Math.max(dramWatts, powerWatts);
        } else if (lowerName.includes('psys')) {
          label = 'Platform System Board (Psys)';
          platformWatts = Math.max(platformWatts, powerWatts);
        }

        zoneResults.push({
          id: zone.id,
          name: zone.name,
          label,
          powerWatts,
          energyJoules: Math.round(currentEnergyUj / 1000000),
          constraintPl1Watts: zone.pl1Watts || undefined,
          constraintPl2Watts: zone.pl2Watts || undefined
        });
      } catch (err) {
        // Có thể permission denied hoặc file tạm thời không đọc được
      }
    }

    if (zoneResults.length === 0) return null;

    // Tổng công suất hiện thời: ưu tiên packageWatts hoặc platformWatts
    const currentWatts = packageWatts > 0 ? packageWatts : (coresWatts + uncoreWatts) || zoneResults[0].powerWatts;

    // Tích lũy điện năng tiêu thụ (Joules -> kWh)
    const dtSeconds = Math.max(0.5, (now - this.lastSampleTime) / 1000);
    this.cumulativeJoules += currentWatts * dtSeconds;
    this.lastSampleTime = now;
    const cumulativeKwh = Math.round((this.cumulativeJoules / 3600000) * 10000) / 10000;

    return {
      supported: true,
      isHardwareRapl: true,
      source: 'sysfs:intel-rapl',
      currentWatts: Math.round(currentWatts * 10) / 10,
      packageWatts: Math.round(packageWatts * 10) / 10,
      coresWatts: Math.round(coresWatts * 10) / 10,
      uncoreWatts: uncoreWatts > 0 ? Math.round(uncoreWatts * 10) / 10 : undefined,
      dramWatts: dramWatts > 0 ? Math.round(dramWatts * 10) / 10 : undefined,
      platformWatts: platformWatts > 0 ? Math.round(platformWatts * 10) / 10 : undefined,
      limitPl1Watts: pl1Limit || undefined,
      limitPl2Watts: pl2Limit || undefined,
      cumulativeKwh,
      estimatedCostVnd: Math.round(cumulativeKwh * 2500), // Giá điện bình quân ~2,500đ / kWh
      zones: zoneResults
    };
  }

  /**
   * Tính toán công suất ước lượng độ chính xác cao dựa trên tải CPU & mô hình phần cứng
   * Sử dụng khi máy chủ chạy trên môi trường ảo hóa (VPS KVM/Cloud) hoặc CPU không expose RAPL sysfs
   */
  getEstimatedPower(cpuLoadPercent, coresCount = 4, cpuBrand = '') {
    const now = Date.now();
    const dtSeconds = Math.max(0.5, (now - this.lastSampleTime) / 1000);
    this.lastSampleTime = now;

    // Ước tính TDP cơ bản dựa trên loại CPU
    let tdp = 65; // Mặc định 65W
    const brand = (cpuBrand || '').toLowerCase();
    if (brand.includes('xeon') || brand.includes('epyc') || coresCount >= 16) {
      tdp = 150;
    } else if (brand.includes('i9') || brand.includes('ryzen 9') || coresCount >= 12) {
      tdp = 125;
    } else if (brand.includes('i7') || brand.includes('ryzen 7') || coresCount >= 8) {
      tdp = 95;
    } else if (brand.includes('i5') || brand.includes('ryzen 5') || coresCount >= 4) {
      tdp = 65;
    } else if (brand.includes('n100') || brand.includes('atom') || brand.includes('celeron') || brand.includes('mobile')) {
      tdp = 25;
    }

    const idlePower = Math.round(tdp * 0.18 * 10) / 10; // ~18% TDP khi idle
    const loadFactor = Math.min(1, Math.max(0, cpuLoadPercent / 100));
    
    // Đường cong tiêu thụ phi tuyến tính (dynamic power scaling)
    const dynamicFactor = Math.pow(loadFactor, 1.25);
    const packageWatts = Math.round((idlePower + dynamicFactor * (tdp - idlePower)) * 10) / 10;
    const coresWatts = Math.round((packageWatts * 0.72) * 10) / 10;
    const uncoreWatts = Math.round((packageWatts * 0.20) * 10) / 10;
    const dramWatts = Math.round((4.5 + loadFactor * 5.5) * 10) / 10;

    this.cumulativeJoules += packageWatts * dtSeconds;
    const cumulativeKwh = Math.round((this.cumulativeJoules / 3600000) * 10000) / 10000;

    return {
      supported: true,
      isHardwareRapl: false,
      source: 'hardware-model:rapl-emulated',
      currentWatts: packageWatts,
      packageWatts,
      coresWatts,
      uncoreWatts,
      dramWatts,
      limitPl1Watts: tdp,
      limitPl2Watts: Math.round(tdp * 1.25),
      cumulativeKwh,
      estimatedCostVnd: Math.round(cumulativeKwh * 2500),
      zones: [
        {
          id: 'package-0',
          name: 'package-0',
          label: 'CPU Package (Toàn bộ chip)',
          powerWatts: packageWatts,
          constraintPl1Watts: tdp,
          constraintPl2Watts: Math.round(tdp * 1.25)
        },
        {
          id: 'core',
          name: 'core',
          label: 'CPU Compute Cores (PP0)',
          powerWatts: coresWatts
        },
        {
          id: 'uncore',
          name: 'uncore',
          label: 'Uncore / L3 Cache / Agent (PP1)',
          powerWatts: uncoreWatts
        },
        {
          id: 'dram',
          name: 'dram',
          label: 'DRAM Bộ nhớ hệ thống',
          powerWatts: dramWatts
        }
      ]
    };
  }

  /**
   * Thu thập dữ liệu RAPL (Ưu tiên phần cứng thật, tự động fallback nếu ảo hóa)
   */
  async getMetrics(cpuLoadPercent, coresCount = 4, cpuBrand = '') {
    const hwReadings = await this.getHardwarePowerReadings();
    if (hwReadings && hwReadings.currentWatts > 0) {
      return hwReadings;
    }
    return this.getEstimatedPower(cpuLoadPercent, coresCount, cpuBrand);
  }
}

module.exports = new RaplService();
