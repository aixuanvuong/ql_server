// filepath: backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authController = require('./controllers/auth.controller');
const aiController = require('./controllers/ai.controller');
const networkController = require('./controllers/network.controller');
const updateController = require('./controllers/update.controller');
const telegramController = require('./controllers/telegram.controller');
const securityController = require('./controllers/security.controller');
const securityService = require('./services/security.service');
const selfhealingController = require('./controllers/selfhealing.controller');
const selfHealingService = require('./services/selfhealing.service');
const systemService = require('./services/system.service');
const socketAuthMiddleware = require('./sockets/socket.auth');
const registerStatsSocket = require('./sockets/stats.socket');
const registerSshSocket = require('./sockets/ssh.socket');
const registerAiSocket = require('./sockets/ai.socket');
const agentApprovalService = require('./services/agent_approval.service');
const telegramService = require('./services/telegram.service');

const app = express();
const server = http.createServer(app);

// Cấu hình CORS để cho phép Frontend kết nối từ các origin khác nhau
const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép tất cả các nguồn hoặc các nguồn trong danh sách (dễ dàng kết nối từ mobile IP LAN)
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// --- 1. REST API ROUTES ---
// Endpoint kiểm tra trạng thái hoạt động của Backend
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Ubuntu Remote Monitor Agent',
    time: new Date().toISOString()
  });
});

// Endpoint đăng nhập xác thực
app.post('/api/auth/login', authController.login);

// Endpoint kiểm tra token
app.get('/api/auth/verify', authController.verifyToken);

// Endpoint đổi tài khoản và mật khẩu
app.post('/api/auth/change-credentials', authController.changeCredentials);

// Endpoints Quản lý Hạ tầng Mạng, Lưu lượng Internet & An ninh
app.get('/api/network/overview', networkController.getNetworkOverview);
app.post('/api/network/ping', networkController.pingTest);
app.post('/api/network/lookup', networkController.dnsLookup);
app.post('/api/network/kill-process', networkController.killProcess);
app.post('/api/network/ai-audit', networkController.auditNetworkWithAi);

// Endpoint trợ lý AI SysAdmin Assistant (Phân tích log terminal và thông số)
app.post('/api/ai-chat', aiController.chatWithAssistant);
app.post('/api/ai/approve', aiController.approveCommand);
app.get('/api/ai/pending-approvals', aiController.getPendingApprovals);
app.get('/api/ai/config', aiController.getAiConfig);
app.post('/api/ai/config', aiController.updateAiConfig);
app.post('/api/ai/test', aiController.testAiConnection);

// Endpoints Quản lý và Cấu hình Telegram ChatOps Bot trực tiếp trên Web
app.get('/api/telegram/config', telegramController.getTelegramConfig);
app.post('/api/telegram/config', telegramController.updateTelegramConfig);
app.post('/api/telegram/test-connection', telegramController.testTelegramConnection);
app.post('/api/telegram/send-test', telegramController.sendTestNotification);

// --- 2. CẤU HÌNH SOCKET.IO CHO REALTIME VÀ SSH ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // Hỗ trợ WebSocket và polling fallback cho mạng di động yếu
  transports: ['websocket', 'polling']
});

// Endpoints Tự Động Cập Nhật Trực Tiếp Trên Web
app.get('/api/system/check-update', updateController.checkForUpdates);
app.post('/api/system/trigger-update', updateController.triggerUpdate(io));
app.get('/api/system/update-status', updateController.getUpdateStatus);

// Endpoints Quản Lý An Ninh & Auto-Ban Hackers
app.get('/api/security/status', securityController.getSecurityStatus);
app.post('/api/security/ban', securityController.banIpManual);
app.post('/api/security/unban', securityController.unbanIp);

// Endpoints Tự Phục Hồi Hệ Thống (Self-Healing & Safe Clean)
app.get('/api/selfhealing/status', selfhealingController.getHealingStatus);
app.post('/api/selfhealing/clean', selfhealingController.triggerManualCleanup);

// Gắn Middleware xác thực JWT cho mọi kết nối WebSocket
io.use(socketAuthMiddleware);

// Khởi chạy tiến trình Auto-Ban giám sát đăng nhập SSH trong thời gian thực
securityService.startMonitoring(io);

// Khởi tạo hệ thống Tự Phục Hồi (Self-Healing) chạy nền liên tục 24/7
selfHealingService.init(io);

// Khởi tạo hệ thống Phê duyệt Lệnh cho AI Autonomous Agent (Human-in-the-Loop)
agentApprovalService.init(io);

// Khởi tạo Telegram ChatOps Bot (Chế độ Polling & Bảo mật Admin ID)
telegramService.init();
setInterval(async () => {
  try {
    const metrics = await systemService.getDynamicMetrics();
    if (metrics) {
      await selfHealingService.checkMetrics(metrics);
    }
  } catch (err) {
    // Bỏ qua lỗi vòng lặp nền
  }
}, 5000);

// Xử lý sự kiện khi có Client kết nối thành công
io.on('connection', (socket) => {
  console.log(`[Socket] Client đã kết nối thành công: ${socket.id} (User: ${socket.user?.username})`);

  // Đăng ký kênh truyền tải dữ liệu phần cứng thời gian thực
  registerStatsSocket(io, socket);

  // Đăng ký kênh truyền tải luồng dữ liệu SSH Terminal
  registerSshSocket(io, socket);

  // Đăng ký kênh phê duyệt lệnh AI Autonomous Agent (Human-in-the-Loop)
  registerAiSocket(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client ${socket.id} đã ngắt kết nối: ${reason}`);
  });
});

// Khởi động server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Ubuntu Remote Monitor Agent đang chạy trên cổng ${PORT}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`====================================================`);
});
