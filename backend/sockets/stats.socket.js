// filepath: backend/sockets/stats.socket.js
const systemService = require('../services/system.service');

/**
 * Quản lý luồng gửi thông số phần cứng thời gian thực qua Socket.io
 * Chu kỳ phát sóng: 1.5 giây / lần tới các Client đã xác thực
 */
module.exports = (io, socket) => {
  // Gửi thông tin cấu hình tĩnh (OS, CPU Model, Hostname) ngay khi vừa kết nối
  systemService.getStaticInfo().then((staticInfo) => {
    socket.emit('server:static-info', staticInfo);
  });

  // Gửi ngay một bản snapshot thông số động lần đầu tiên
  systemService.getDynamicMetrics().then((initialMetrics) => {
    if (initialMetrics) {
      socket.emit('server:metrics', initialMetrics);
    }
  });

  // Thiết lập vòng lặp định kỳ (Interval) 1.5 giây gửi dữ liệu 1 lần
  const intervalId = setInterval(async () => {
    if (socket.connected) {
      const metrics = await systemService.getDynamicMetrics();
      if (metrics) {
        socket.emit('server:metrics', metrics);
      }
    }
  }, 1500);

  // Dọn dẹp bộ đếm khi Client ngắt kết nối hoặc đóng tab
  socket.on('disconnect', () => {
    clearInterval(intervalId);
  });
};
