// filepath: frontend/src/types/system.types.ts

export interface StaticSystemInfo {
  hostname: string;
  platform: string;
  distro: string;
  release: string;
  arch: string;
  cpuBrand: string;
  cores: number;
  physicalCores?: number;
  speed?: number;
  model: string;
}

export interface RaplPowerZone {
  id: string;
  name: string;
  label: string;
  powerWatts: number;
  energyJoules?: number;
  maxEnergyRangeJoules?: number;
  constraintPl1Watts?: number;
  constraintPl2Watts?: number;
}

export interface RaplPowerMetrics {
  supported: boolean;
  isHardwareRapl: boolean; // true nếu đọc trực tiếp từ /sys/class/powercap/intel-rapl
  source: string;
  currentWatts: number;
  packageWatts: number;
  coresWatts: number;
  uncoreWatts?: number;
  dramWatts?: number;
  platformWatts?: number;
  limitPl1Watts?: number; // Giới hạn công suất dài hạn (PL1 / TDP)
  limitPl2Watts?: number; // Giới hạn công suất ngắn hạn (PL2 / Turbo Boost)
  cumulativeKwh: number; // Tổng điện năng tiêu thụ tích lũy (kWh)
  estimatedCostVnd?: number; // Ước tính chi phí tiền điện (VNĐ)
  zones: RaplPowerZone[];
}

export interface DynamicSystemMetrics {
  timestamp: number;
  uptime: number;
  cpu: {
    loadPercent: number;
    cores: number[];
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    usedPercent: number;
    mount: string;
  };
  power?: RaplPowerMetrics;
}

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface SavedSshProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  savePassword?: boolean;
  tag?: string;
  lastConnected?: string;
}

export interface AuthUser {
  username: string;
  role: string;
}
