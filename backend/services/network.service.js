// filepath: backend/services/network.service.js
const si = require('systeminformation');
const dns = require('dns').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Cache tra cứu Reverse DNS để tăng tốc phản hồi
const dnsCache = new Map();

/**
 * Kiểm tra xem địa chỉ IP có phải là IP nội bộ/mạng riêng hay không
 */
function isPrivateOrLocalIp(ip) {
  if (!ip || ip === '0.0.0.0' || ip === '::' || ip === '*' || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true;
  }
  // Mạng riêng IPv4: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) {
    return true;
  }
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }
  }
  // IPv6 link-local hoặc loopback
  if (ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  return false;
}

/**
 * Xác định tên dịch vụ phổ biến dựa theo số cổng
 */
function identifyServiceName(port, processName = '') {
  const p = parseInt(port, 10);
  const proc = (processName || '').toLowerCase();

  if (proc.includes('cloudflared') || p === 7844) return 'Cloudflare Tunnel Edge';
  if (p === 443) return 'HTTPS (Web Bảo Mật)';
  if (p === 80) return 'HTTP (Web Thường)';
  if (p === 22) return 'SSH (Quản Trị Từ Xa)';
  if (p === 53) return 'DNS (Phân Giải Tên Miền)';
  if (p === 5000) return 'QL Server Backend API';
  if (p === 3000) return 'Node/Vite Dev App';
  if (p === 8080 || p === 8888) return 'Web Proxy / App Server';
  if (p === 3306) return 'MySQL Database';
  if (p === 5432) return 'PostgreSQL Database';
  if (p === 6379) return 'Redis Cache';
  if (p === 27017) return 'MongoDB Database';
  if (p === 123) return 'NTP Time Sync';
  if (p === 25 || p === 465 || p === 587) return 'SMTP Email';
  if (p === 993 || p === 143) return 'IMAP Email';
  if (p === 9090) return 'Prometheus Metrics';
  if (p === 9100) return 'Node Exporter';

  return `Port ${p}`;
}

/**
 * Tra cứu hostname từ IP công cộng (Reverse DNS) có cache
 */
async function resolveHostName(ip) {
  if (!ip || isPrivateOrLocalIp(ip)) {
    return null;
  }
  if (dnsCache.has(ip)) {
    return dnsCache.get(ip);
  }

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DNS Timeout')), 400)
    );
    const hostnames = await Promise.race([dns.reverse(ip), timeoutPromise]);
    const host = (hostnames && hostnames.length > 0) ? hostnames[0] : null;
    dnsCache.set(ip, host);
    return host;
  } catch (err) {
    dnsCache.set(ip, null);
    return null;
  }
}

class NetworkService {
  /**
   * Lấy tổng quan toàn diện hạ tầng mạng và danh sách kết nối đang truy cập
   */
  async getNetworkOverview() {
    try {
      const [interfaces, networkStats, connections, defaultGateway] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats(),
        si.networkConnections(),
        si.networkGatewayDefault().catch(() => '192.168.1.1')
      ]);

      // 1. Phối hợp thông tin Card Mạng (Interfaces) cùng thống kê tốc độ (Stats)
      const statsMap = new Map();
      if (Array.isArray(networkStats)) {
        networkStats.forEach(s => statsMap.set(s.iface, s));
      }

      let totalRxSec = 0;
      let totalTxSec = 0;

      const formattedInterfaces = (Array.isArray(interfaces) ? interfaces : []).map(iface => {
        const stats = statsMap.get(iface.iface) || {};
        const rxSec = stats.rx_sec || 0;
        const txSec = stats.tx_sec || 0;

        totalRxSec += rxSec;
        totalTxSec += txSec;

        return {
          name: iface.iface,
          ip4: iface.ip4 || 'N/A',
          ip6: iface.ip6 || 'N/A',
          mac: iface.mac || 'N/A',
          type: iface.type || 'wired',
          operstate: iface.operstate || 'up',
          speed: iface.speed || 0,
          mtu: iface.mtu || 1500,
          internal: iface.internal || false,
          virtual: iface.virtual || false,
          rxBytes: stats.rx_bytes || 0,
          txBytes: stats.tx_bytes || 0,
          rxSec: rxSec,
          txSec: txSec
        };
      });

      // 2. Xử lý và làm giàu dữ liệu các kết nối mạng (Active Connections)
      const rawConnections = Array.isArray(connections) ? connections : [];
      
      // Giới hạn xử lý tối đa 150 kết nối để đảm bảo tốc độ phản hồi cực nhanh
      const topConnections = rawConnections.slice(0, 150);

      const enrichedConnections = await Promise.all(
        topConnections.map(async (conn, index) => {
          const peerIp = conn.peerAddress || '0.0.0.0';
          const isInternet = !isPrivateOrLocalIp(peerIp);
          const serviceName = identifyServiceName(conn.peerPort || conn.localPort, conn.process);

          let direction = 'outbound';
          if (conn.state === 'LISTEN') {
            direction = 'listen';
          } else if (!isInternet) {
            direction = 'local';
          } else if (conn.localPort === 80 || conn.localPort === 443 || conn.localPort === 5000) {
            direction = 'inbound';
          }

          // Tra cứu tên miền nếu là kết nối Internet
          let destinationHost = null;
          if (isInternet) {
            destinationHost = await resolveHostName(peerIp);
          }

          return {
            id: `conn-${index}-${conn.pid || '0'}-${conn.localPort}-${conn.peerPort}`,
            protocol: (conn.protocol || 'tcp').toLowerCase(),
            localAddress: conn.localAddress || '0.0.0.0',
            localPort: conn.localPort || 0,
            peerAddress: peerIp,
            peerPort: conn.peerPort || 0,
            state: conn.state || 'ESTABLISHED',
            pid: conn.pid || 0,
            process: conn.process || (conn.state === 'LISTEN' ? 'system-listen' : 'unknown'),
            serviceName,
            isInternet,
            direction, // 'outbound' | 'inbound' | 'listen' | 'local'
            destinationHost: destinationHost || peerIp
          };
        })
      );

      // 3. Thống kê tổng hợp (Summary Metrics)
      let internetCount = 0;
      let listeningCount = 0;
      let localCount = 0;
      const processCounter = {};

      enrichedConnections.forEach(c => {
        if (c.state === 'LISTEN') {
          listeningCount++;
        } else if (c.isInternet) {
          internetCount++;
        } else {
          localCount++;
        }

        const proc = c.process || 'khác';
        processCounter[proc] = (processCounter[proc] || 0) + 1;
      });

      const topProcesses = Object.entries(processCounter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      return {
        timestamp: Date.now(),
        defaultGateway: defaultGateway || '192.168.1.1',
        interfaces: formattedInterfaces,
        connections: enrichedConnections,
        summary: {
          totalConnections: enrichedConnections.length,
          internetConnections: internetCount,
          listeningPorts: listeningCount,
          localConnections: localCount,
          totalRxSec, // Bytes/giây
          totalTxSec, // Bytes/giây
          topProcesses
        }
      };
    } catch (error) {
      console.error('[NetworkService Error]:', error.message);
      return {
        timestamp: Date.now(),
        defaultGateway: '192.168.1.1',
        interfaces: [],
        connections: [],
        summary: {
          totalConnections: 0,
          internetConnections: 0,
          listeningPorts: 0,
          localConnections: 0,
          totalRxSec: 0,
          totalTxSec: 0,
          topProcesses: []
        }
      };
    }
  }

  /**
   * Kiểm tra độ trễ Ping tới một máy chủ chỉ định (Mặc định: Google 8.8.8.8 hoặc Cloudflare 1.1.1.1)
   */
  async pingHost(target = '8.8.8.8') {
    try {
      // Làm sạch input để chống command injection
      const cleanTarget = target.trim().replace(/[^a-zA-Z0-9.-]/g, '');
      const startTime = Date.now();
      
      const { stdout } = await execPromise(`ping -c 3 -W 2 ${cleanTarget}`);
      const duration = Date.now() - startTime;

      // Phân tích kết quả ping (rtt min/avg/max/mdev)
      const avgMatch = stdout.match(/min\/avg\/max\/(?:mdev|stddev) = [0-9.]+\/([0-9.]+)\//);
      const avgLatency = avgMatch ? parseFloat(avgMatch[1]) : Math.round(duration / 3);

      return {
        success: true,
        target: cleanTarget,
        latencyMs: avgLatency,
        rawOutput: stdout
      };
    } catch (error) {
      return {
        success: false,
        target,
        latencyMs: null,
        error: error.message
      };
    }
  }

  /**
   * Tra cứu phân giải tên miền (DNS Lookup)
   */
  async dnsLookup(domain) {
    try {
      const cleanDomain = domain.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
      const [ipv4Records, ipv6Records] = await Promise.allSettled([
        dns.resolve4(cleanDomain),
        dns.resolve6(cleanDomain)
      ]);

      return {
        success: true,
        domain: cleanDomain,
        ipv4: ipv4Records.status === 'fulfilled' ? ipv4Records.value : [],
        ipv6: ipv6Records.status === 'fulfilled' ? ipv6Records.value : []
      };
    } catch (error) {
      return {
        success: false,
        domain,
        error: error.message
      };
    }
  }

  /**
   * Ngắt tiến trình / socket khả nghi theo PID
   */
  async killProcess(pid) {
    try {
      const p = parseInt(pid, 10);
      if (!p || p <= 1) {
        throw new Error('PID không hợp lệ hoặc là tiến trình hệ thống bảo vệ.');
      }
      process.kill(p, 'SIGTERM');
      return { success: true, message: `Đã gửi tín hiệu dừng tới tiến trình PID ${p}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new NetworkService();
