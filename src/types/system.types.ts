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
}

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface AuthUser {
  username: string;
  role: string;
}
