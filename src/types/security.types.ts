// filepath: frontend/src/types/security.types.ts

export type AlertType = 'ban' | 'unban' | 'ram_heal' | 'disk_heal' | 'warning' | 'info';
export type AlertLevel = 'critical' | 'warning' | 'info';

export interface SystemAlert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  ip?: string;
  reason?: string;
  action?: string;
  details?: string;
  method?: string;
  logs?: string[];
  success?: boolean;
  timestamp: string;
}

export interface SecurityStatusData {
  bannedIps: string[];
  totalBanned: number;
  alerts: SystemAlert[];
  activeMonitoring: boolean;
}

export interface SelfHealingStatusData {
  ramThreshold: number;
  diskThreshold: number;
  isMonitoring: boolean;
  lastRamHealTime: string | null;
  lastDiskHealTime: string | null;
  healingLogs: SystemAlert[];
}
