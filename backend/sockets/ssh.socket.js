// filepath: backend/sockets/ssh.socket.js
const sshService = require('../services/ssh.service');

/**
 * Xử lý luồng dữ liệu SSH Terminal 2 chiều qua Socket.io
 * Cầu nối giữa giao diện xterm.js trên Frontend và PTY của hệ điều hành Ubuntu
 */
module.exports = (io, socket) => {
  let activeSession = null;

  // 1. Lắng nghe yêu cầu khởi tạo phiên SSH từ Client
  socket.on('ssh:connect', (sshConfig) => {
    // Nếu socket này đang có phiên cũ thì đóng trước khi mở phiên mới
    if (activeSession) {
      activeSession.close();
      activeSession = null;
    }

    socket.emit('terminal:output', '\r\n\x1b[36m[Đang kết nối SSH tới máy chủ Ubuntu...]\x1b[0m\r\n');

    // Tạo phiên SSH mới thông qua sshService
    activeSession = sshService.createSession(socket, sshConfig || {});
  });

  // 2. Nhận ký tự gõ phím từ xterm.js và chuyển tiếp trực tiếp vào SSH stream
  socket.on('terminal:input', (data) => {
    if (activeSession) {
      activeSession.write(data);
    }
  });

  // 3. Nhận kích thước cửa sổ mới (cols, rows) khi người dùng co giãn màn hình hoặc xoay điện thoại
  socket.on('terminal:resize', ({ cols, rows }) => {
    if (activeSession && cols && rows) {
      activeSession.resize(cols, rows);
    }
  });

  // 4. Lắng nghe yêu cầu đóng phiên SSH chủ động từ nút Disconnect
  socket.on('ssh:disconnect', () => {
    if (activeSession) {
      activeSession.close();
      activeSession = null;
      socket.emit('terminal:status', { status: 'disconnected' });
    }
  });

  // 5. Tự động giải phóng tài nguyên SSH khi kết nối WebSocket bị đứt
  socket.on('disconnect', () => {
    if (activeSession) {
      activeSession.close();
      activeSession = null;
    }
  });
};
