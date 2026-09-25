// filepath: backend/services/ssh.service.js
const { Client } = require('ssh2');

/**
 * Service quản lý phiên SSH kết nối tới máy chủ Ubuntu
 * Sử dụng thư viện `ssh2` để tạo PTY shell tương thích với xterm.js
 */
class SshService {
  /**
   * Tạo phiên SSH mới gắn liền với kết nối WebSocket của Client
   * @param {Object} socket - Socket.io instance của client
   * @param {Object} config - Cấu hình SSH (host, port, username, password/privateKey, cols, rows)
   */
  createSession(socket, config) {
    const conn = new Client();
    let stream = null;

    const sshHost = config.host || process.env.SSH_HOST || '127.0.0.1';
    const sshPort = parseInt(config.port || process.env.SSH_PORT || '22', 10);
    const username = config.username || 'ubuntu';
    const cols = config.cols || 80;
    const rows = config.rows || 24;

    // Khi SSH kết nối thành công và xác thực được
    conn.on('ready', () => {
      socket.emit('terminal:status', {
        status: 'connected',
        message: `Đã kết nối thành công tới ${username}@${sshHost}:${sshPort}`
      });

      // Yêu cầu mở Pseudo-Terminal (PTY) với cấu hình xterm-256color
      conn.shell(
        {
          term: 'xterm-256color',
          cols: cols,
          rows: rows
        },
        (err, sshStream) => {
          if (err) {
            socket.emit('terminal:error', `Không thể mở terminal shell: ${err.message}\r\n`);
            return conn.end();
          }

          stream = sshStream;

          // Luồng đọc dữ liệu từ máy chủ và phát về Client qua WebSocket
          stream.on('data', (data) => {
            // Chuyển buffer sang dạng UTF-8 string và gửi cho xterm.js
            socket.emit('terminal:output', data.toString('utf-8'));
          });

          // Khi luồng shell bị đóng (ví dụ: gõ exit hoặc lệnh logout)
          stream.on('close', () => {
            socket.emit('terminal:output', '\r\n\x1b[33m[Phiên SSH đã đóng]\x1b[0m\r\n');
            socket.emit('terminal:status', { status: 'disconnected' });
            conn.end();
          });

          stream.stderr.on('data', (data) => {
            socket.emit('terminal:output', data.toString('utf-8'));
          });
        }
      );
    });

    // Bắt lỗi kết nối SSH (sai pass, không mở port 22, timeout, etc.)
    conn.on('error', (err) => {
      socket.emit('terminal:error', `Lỗi SSH: ${err.message}\r\n`);
      socket.emit('terminal:status', {
        status: 'error',
        message: err.message
      });
    });

    // Khi kết nối SSH ngắt hoàn toàn
    conn.on('end', () => {
      socket.emit('terminal:status', { status: 'disconnected' });
    });

    conn.on('close', () => {
      socket.emit('terminal:status', { status: 'disconnected' });
    });

    // Thực hiện kết nối SSH
    try {
      const connectOptions = {
        host: sshHost,
        port: sshPort,
        username: username,
        readyTimeout: 10000,
        keepaliveInterval: 15000
      };

      if (config.password) {
        connectOptions.password = config.password;
      } else if (config.privateKey) {
        connectOptions.privateKey = config.privateKey;
      }

      conn.connect(connectOptions);
    } catch (err) {
      socket.emit('terminal:error', `Không thể khởi tạo SSH: ${err.message}\r\n`);
    }

    // Trả về các hàm điều khiển stream
    return {
      write: (data) => {
        if (stream && stream.writable) {
          stream.write(data);
        }
      },
      resize: (newCols, newRows) => {
        if (stream && stream.setWindow) {
          stream.setWindow(newRows, newCols, 0, 0);
        }
      },
      close: () => {
        try {
          if (stream) stream.end();
          if (conn) conn.end();
        } catch (e) {
          // Bỏ qua lỗi dọn dẹp kết nối
        }
      }
    };
  }
}

module.exports = new SshService();
