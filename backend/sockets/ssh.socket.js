// filepath: backend/sockets/ssh.socket.js
const sshService = require('../services/ssh.service');
const terminalUnifiedService = require('../services/terminal_unified.service');

/**
 * Xử lý luồng dữ liệu Terminal Đồng Nhất (Unified Terminal) qua Socket.io
 * Cầu nối giữa giao diện xterm.js trên Frontend, AI Agent, và Shell của hệ điều hành Ubuntu
 */
module.exports = (io, socket) => {
  let activeCustomSession = null;

  // 1. Tự động gắn client vào phiên Terminal Đồng Nhất (Unified Session)
  terminalUnifiedService.registerClient(socket);

  // 2. Lắng nghe yêu cầu khởi tạo phiên SSH tùy chỉnh nếu người dùng cấu hình tài khoản SSH riêng
  socket.on('ssh:connect', (sshConfig) => {
    // Nếu chỉ kết nối mặc định (không có pass/key riêng hoặc yêu cầu unified shell)
    if (!sshConfig || (!sshConfig.password && !sshConfig.privateKey && (!sshConfig.host || sshConfig.host === '127.0.0.1' || sshConfig.host === 'localhost'))) {
      terminalUnifiedService.registerClient(socket);
      return;
    }

    // Nếu người dùng có cấu hình tài khoản SSH cụ thể (ví dụ kết nối tới user khác)
    if (activeCustomSession) {
      activeCustomSession.close();
      activeCustomSession = null;
    }

    socket.emit('terminal:output', '\r\n\x1b[36m[Đang kết nối SSH chuyên dụng tới máy chủ Ubuntu...]\x1b[0m\r\n');

    activeCustomSession = sshService.createSession(socket, sshConfig || {});
    terminalUnifiedService.setActiveSshSession(activeCustomSession);
  });

  // 3. Nhận ký tự gõ phím từ xterm.js và chuyển tiếp trực tiếp vào Terminal Đồng Nhất
  socket.on('terminal:input', (data) => {
    terminalUnifiedService.handleUserInput(data);
  });

  // 4. Nhận kích thước cửa sổ mới (cols, rows) khi người dùng co giãn màn hình hoặc xoay điện thoại
  socket.on('terminal:resize', ({ cols, rows }) => {
    terminalUnifiedService.handleResize(cols, rows);
  });

  // 5. Yêu cầu xóa trắng màn hình
  socket.on('terminal:clear', () => {
    terminalUnifiedService.clearBuffer();
  });

  // 6. Lắng nghe yêu cầu ngắt kết nối SSH tùy chỉnh
  socket.on('ssh:disconnect', () => {
    if (activeCustomSession) {
      activeCustomSession.close();
      activeCustomSession = null;
      terminalUnifiedService.setActiveSshSession(null);
    }
    socket.emit('terminal:status', { status: 'disconnected' });
  });

  // 7. Giải phóng tài nguyên khi client ngắt kết nối
  socket.on('disconnect', () => {
    if (activeCustomSession) {
      activeCustomSession.close();
      activeCustomSession = null;
      terminalUnifiedService.setActiveSshSession(null);
    }
    terminalUnifiedService.unregisterClient(socket.id);
  });
};

