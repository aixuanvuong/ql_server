// filepath: backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authController = require('./controllers/auth.controller');
const aiController = require('./controllers/ai.controller');
const socketAuthMiddleware = require('./sockets/socket.auth');
const registerStatsSocket = require('./sockets/stats.socket');
const registerSshSocket = require('./sockets/ssh.socket');

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

// Endpoint trợ lý AI SysAdmin Assistant (Phân tích log terminal và thông số)
app.post('/api/ai-chat', aiController.chatWithAssistant);

// --- 2. CẤU HÌNH SOCKET.IO CHO REALTIME VÀ SSH ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // Hỗ trợ WebSocket và polling fallback cho mạng di động yếu
  transports: ['websocket', 'polling']
});

// Gắn Middleware xác thực JWT cho mọi kết nối WebSocket
io.use(socketAuthMiddleware);

// Xử lý sự kiện khi có Client kết nối thành công
io.on('connection', (socket) => {
  console.log(`[Socket] Client đã kết nối thành công: ${socket.id} (User: ${socket.user?.username})`);

  // Đăng ký kênh truyền tải dữ liệu phần cứng thời gian thực
  registerStatsSocket(io, socket);

  // Đăng ký kênh truyền tải luồng dữ liệu SSH Terminal
  registerSshSocket(io, socket);

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
