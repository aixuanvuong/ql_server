// filepath: frontend/src/hooks/useSystemStats.ts
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { StaticSystemInfo, DynamicSystemMetrics } from '../types/system.types';

// Dữ liệu ban đầu giả lập trạng thái Ubuntu Server
const defaultStaticInfo: StaticSystemInfo = {
  hostname: 'ubuntu-production-01',
  platform: 'linux',
  distro: 'Ubuntu 24.04 LTS (Noble Numbat)',
  release: '6.8.0-40-generic',
  arch: 'x64',
  cpuBrand: 'AMD EPYC 7763 64-Core Processor',
  cores: 4,
  model: 'Standard Cloud Instance'
};

export function useSystemStats(socket: Socket | null, isConnected: boolean) {
  const [staticInfo, setStaticInfo] = useState<StaticSystemInfo>(defaultStaticInfo);
  const [metrics, setMetrics] = useState<DynamicSystemMetrics | null>(null);
  const [history, setHistory] = useState<{ time: string; cpu: number; mem: number; power?: number }[]>([]);

  useEffect(() => {
    let accumulatedJoules = 1425000; // Khởi tạo một lượng năng lượng tích lũy

    if (!socket || !isConnected) {
      // Khi chưa kết nối tới backend thật, kích hoạt mô phỏng mượt mà để kiểm thử giao diện
      const interval = setInterval(() => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        const simCpu = Math.round((28 + Math.sin(Date.now() / 3000) * 12 + Math.random() * 8) * 10) / 10;
        const simTemp = Math.round((46 + (simCpu / 100) * 22 + Math.random() * 2) * 10) / 10;
        const totalMem = 8 * 1024 * 1024 * 1024;
        const usedMem = Math.round(totalMem * (0.42 + Math.sin(Date.now() / 8000) * 0.05));

        // Tính công suất Intel RAPL tương quan với tải CPU
        const idleWatts = 18.5;
        const tdpLimit = 65;
        const turboLimit = 90;
        const loadFactor = Math.min(1, Math.max(0, simCpu / 100));
        const simPackageWatts = Math.round((idleWatts + Math.pow(loadFactor, 1.2) * (tdpLimit - idleWatts + 10) + (Math.random() * 2 - 1)) * 10) / 10;
        const simCoresWatts = Math.round((simPackageWatts * 0.72) * 10) / 10;
        const simUncoreWatts = Math.round((simPackageWatts * 0.18) * 10) / 10;
        const simDramWatts = Math.round((5.2 + loadFactor * 3.8) * 10) / 10;

        accumulatedJoules += simPackageWatts * 1.5;
        const cumulativeKwh = Math.round((accumulatedJoules / 3600000) * 10000) / 10000;
        
        const simMetrics: DynamicSystemMetrics = {
          timestamp: Date.now(),
          uptime: 432890,
          cpu: {
            loadPercent: simCpu,
            cores: [
              Math.max(5, Math.round(simCpu * 0.9 + Math.random() * 6)),
              Math.max(8, Math.round(simCpu * 1.1 - Math.random() * 5)),
              Math.max(4, Math.round(simCpu * 0.95 + Math.random() * 4)),
              Math.max(6, Math.round(simCpu * 1.05 - Math.random() * 4))
            ],
            temperature: simTemp
          },
          memory: {
            total: totalMem,
            used: usedMem,
            free: totalMem - usedMem,
            usedPercent: Math.round((usedMem / totalMem) * 1000) / 10
          },
          disk: {
            total: 100 * 1024 * 1024 * 1024,
            used: 38 * 1024 * 1024 * 1024,
            available: 62 * 1024 * 1024 * 1024,
            usedPercent: 38.0,
            mount: '/'
          },
          power: {
            supported: true,
            isHardwareRapl: true,
            source: 'sysfs:intel-rapl',
            currentWatts: simPackageWatts,
            packageWatts: simPackageWatts,
            coresWatts: simCoresWatts,
            uncoreWatts: simUncoreWatts,
            dramWatts: simDramWatts,
            limitPl1Watts: tdpLimit,
            limitPl2Watts: turboLimit,
            cumulativeKwh,
            estimatedCostVnd: Math.round(cumulativeKwh * 2500),
            zones: [
              {
                id: 'intel-rapl:0',
                name: 'package-0',
                label: 'CPU Package (Toàn bộ chip)',
                powerWatts: simPackageWatts,
                constraintPl1Watts: tdpLimit,
                constraintPl2Watts: turboLimit
              },
              {
                id: 'intel-rapl:0:0',
                name: 'core',
                label: 'CPU Compute Cores (PP0)',
                powerWatts: simCoresWatts
              },
              {
                id: 'intel-rapl:0:1',
                name: 'uncore',
                label: 'Uncore / iGPU / L3 (PP1)',
                powerWatts: simUncoreWatts
              },
              {
                id: 'intel-rapl:0:2',
                name: 'dram',
                label: 'DRAM Bộ nhớ hệ thống',
                powerWatts: simDramWatts
              }
            ]
          }
        };

        setMetrics(simMetrics);
        setHistory(prev => [
          ...prev.slice(-15),
          { time: timeStr, cpu: simCpu, mem: simMetrics.memory.usedPercent, power: simPackageWatts }
        ]);
      }, 1500);

      return () => clearInterval(interval);
    }

    // Khi đã kết nối Socket thật với Backend Ubuntu
    const handleStaticInfo = (info: StaticSystemInfo) => {
      setStaticInfo(info);
    };

    const handleMetrics = (data: DynamicSystemMetrics) => {
      setMetrics(data);
      const now = new Date(data.timestamp || Date.now());
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setHistory(prev => [
        ...prev.slice(-15),
        { time: timeStr, cpu: data.cpu.loadPercent, mem: data.memory.usedPercent, power: data.power?.currentWatts }
      ]);
    };

    socket.on('server:static-info', handleStaticInfo);
    socket.on('server:metrics', handleMetrics);

    return () => {
      socket.off('server:static-info', handleStaticInfo);
      socket.off('server:metrics', handleMetrics);
    };
  }, [socket, isConnected]);

  return { staticInfo, metrics, history };
}
