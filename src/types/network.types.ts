// filepath: frontend/src/types/network.types.ts

export interface NetworkInterface {
  name: string;
  ip4: string;
  ip6: string;
  mac: string;
  type: string;
  operstate: string; // 'up' | 'down'
  speed: number;
  mtu: number;
  internal: boolean;
  virtual: boolean;
  rxBytes: number;
  txBytes: number;
  rxSec: number; // bytes/s
  txSec: number; // bytes/s
}

export interface NetworkConnection {
  id: string;
  protocol: string;
  localAddress: string;
  localPort: number;
  peerAddress: string;
  peerPort: number;
  state: string; // 'ESTABLISHED' | 'LISTEN' | 'TIME_WAIT' | 'CLOSE_WAIT' | 'SYN_SENT'
  pid: number;
  process: string;
  serviceName: string;
  isInternet: boolean;
  direction: 'outbound' | 'inbound' | 'listen' | 'local';
  destinationHost: string;
}

export interface NetworkSummary {
  totalConnections: number;
  internetConnections: number;
  listeningPorts: number;
  localConnections: number;
  totalRxSec: number;
  totalTxSec: number;
  topProcesses: Array<{ name: string; count: number }>;
}

export interface NetworkOverview {
  timestamp: number;
  defaultGateway: string;
  interfaces: NetworkInterface[];
  connections: NetworkConnection[];
  summary: NetworkSummary;
}

export interface PingResult {
  success: boolean;
  target: string;
  latencyMs: number | null;
  rawOutput?: string;
  error?: string;
}

export interface DnsResult {
  success: boolean;
  domain: string;
  ipv4: string[];
  ipv6: string[];
  error?: string;
}

export interface NetworkAuditResult {
  analysis: string;
  safetyScore: number;
  suggestedCommands: string[];
}
