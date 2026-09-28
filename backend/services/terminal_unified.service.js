// filepath: backend/services/terminal_unified.service.js
const { spawn } = require('child_process');
const path = require('path');

/**
 * Service quản lý Terminal Đồng Nhất (Unified Shared Terminal)
 * Đảm bảo:
 * 1. AI và Người dùng tương tác trên CÙNG 1 PHIÊN TERMINAL DUY NHẤT.
 * 2. Mọi lệnh AI thực thi đều hiển thị trực tiếp và theo thời gian thực (real-time stream) trên màn hình Terminal của người dùng.
 * 3. Đa người dùng / đa thiết bị / chuyển tab đều giữ nguyên lịch sử terminal (Rolling Scrollback Buffer).
 */
class TerminalUnifiedService {
  constructor() {
    this.io = null;
    this.shellProcess = null;
    this.scrollbackBuffer = '';
    this.maxBufferSize = 150000; // Lưu 150KB lịch sử terminal gần nhất
    this.activeAiTask = null;
    this.isShellReady = false;
    this.connectedSockets = new Set();
    this.activeSshSession = null; // Tích hợp với phiên SSH2 nếu người dùng kết nối SSH riêng
  }

  /**
   * Khởi tạo kết nối Socket.io
   * @param {import('socket.io').Server} ioInstance
   */
  init(ioInstance) {
    this.io = ioInstance;
    console.log('[Unified Terminal] 🚀 Khởi tạo Service Terminal Đồng Nhất (AI & User Shared PTY)');
    this.ensureShellProcess();
  }

  /**
   * Đảm bảo tiến trình Interactive Shell (/bin/bash) luôn sống và sẵn sàng
   */
  ensureShellProcess() {
    if (this.shellProcess && !this.shellProcess.killed) {
      return;
    }

    try {
      const workingDir = process.env.HOME || '/opt/ql_server' || process.cwd();
      
      // Khởi tạo tiến trình interactive bash shell
      this.shellProcess = spawn('/bin/bash', ['-i'], {
        cwd: workingDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          DEBIAN_FRONTEND: 'noninteractive'
        }
      });

      this.isShellReady = true;
      console.log(`[Unified Terminal] 🐚 Đã khởi tạo bash shell nội bộ tại: ${workingDir} (PID: ${this.shellProcess.pid})`);

      // Lắng nghe dữ liệu xuất từ shell và broadcast về toàn bộ client
      this.shellProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        this.broadcastOutput(text);
      });

      this.shellProcess.stderr.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        this.broadcastOutput(text);
      });

      this.shellProcess.on('exit', (code, signal) => {
        console.warn(`[Unified Terminal] ⚠️ Bash shell đã thoát (Code: ${code}, Signal: ${signal}). Đang tự động khởi động lại...`);
        this.isShellReady = false;
        this.shellProcess = null;
        setTimeout(() => this.ensureShellProcess(), 1000);
      });

      this.shellProcess.on('error', (err) => {
        console.error('[Unified Terminal] ❌ Lỗi tiến trình shell:', err.message);
      });

      // Viết thông điệp khởi động ban đầu vào buffer
      const banner = `\r\n\x1b[32m╔════════════════════════════════════════════════════════════════╗\x1b[0m\r\n` +
                     `\x1b[32m║   🤖 UNIFIED SYSTEM TERMINAL - ĐỒNG NHẤT CHO USER & AI AGENT   ║\x1b[0m\r\n` +
                     `\x1b[32m╚════════════════════════════════════════════════════════════════╝\x1b[0m\r\n` +
                     `\x1b[36m• Phiên Terminal đồng nhất: Mọi thao tác của bạn và AI đều xuất hiện tại đây.\x1b[0m\r\n` +
                     `\x1b[36m• AI Agent có thể tương tác trực tiếp và bạn sẽ nhìn thấy từng lệnh chạy.\x1b[0m\r\n\r\n`;
      this.appendBuffer(banner);

    } catch (error) {
      console.error('[Unified Terminal] ❌ Không thể khởi tạo shell:', error.message);
    }
  }

  /**
   * Lưu buffer cuộn trang (scrollback) để khi mở tab mới không bị mất màn hình
   */
  appendBuffer(text) {
    this.scrollbackBuffer += text;
    if (this.scrollbackBuffer.length > this.maxBufferSize) {
      this.scrollbackBuffer = this.scrollbackBuffer.slice(-this.maxBufferSize);
    }
  }

  /**
   * Phát dữ liệu ra toàn bộ màn hình Terminal của các Client đang kết nối
   */
  broadcastOutput(text) {
    this.appendBuffer(text);
    if (this.io) {
      this.io.emit('terminal:output', text);
    }
  }

  /**
   * Đăng ký một Client mới vào Unified Terminal
   */
  registerClient(socket) {
    this.connectedSockets.add(socket.id);
    this.ensureShellProcess();

    // Gửi lại toàn bộ lịch sử màn hình gần nhất cho client vừa vào
    if (this.scrollbackBuffer) {
      socket.emit('terminal:output', this.scrollbackBuffer);
    }

    socket.emit('terminal:status', {
      status: 'connected',
      message: 'Đã kết nối vào Terminal Đồng Nhất (Unified Shell Session)',
      unified: true
    });

    // Thông báo trạng thái nếu AI đang thao tác dở
    if (this.activeAiTask) {
      socket.emit('ai:terminal_activity', {
        active: true,
        command: this.activeAiTask.command,
        status: 'running'
      });
    }

    console.log(`[Unified Terminal] 👤 Client ${socket.id} đã tham gia phiên Terminal đồng nhất. (Tổng clients: ${this.connectedSockets.size})`);
  }

  /**
   * Hủy đăng ký khi Client ngắt kết nối
   */
  unregisterClient(socketId) {
    this.connectedSockets.delete(socketId);
    console.log(`[Unified Terminal] 🚪 Client ${socketId} rời khỏi terminal. (Còn lại: ${this.connectedSockets.size})`);
  }

  /**
   * Nhận ký tự gõ phím từ người dùng và đẩy vào shell
   */
  handleUserInput(data) {
    if (this.activeSshSession) {
      this.activeSshSession.write(data);
      return;
    }

    this.ensureShellProcess();
    if (this.shellProcess && this.shellProcess.stdin && this.shellProcess.stdin.writable) {
      this.shellProcess.stdin.write(data);
    }
  }

  /**
   * Xử lý thay đổi kích thước cửa sổ (cols, rows)
   */
  handleResize(cols, rows) {
    if (this.activeSshSession) {
      this.activeSshSession.resize(cols, rows);
    }
  }

  /**
   * THỰC THI LỆNH TRỰC TIẾP TỪ AI AGENT LÊN MÀN HÌNH TERMINAL ĐỒNG NHẤT
   * - Người dùng sẽ nhìn thấy AI gõ lệnh và log chạy từng dòng trực tiếp
   * - Đồng thời trả về kết quả cho AI tiếp tục vòng lặp Agentic
   * @param {string} command Câu lệnh AI cần thực thi
   * @param {object} options Các tùy chọn (timeoutSeconds, workingDirectory)
   */
  async executeCommandAsAi(command, options = {}) {
    const startTime = Date.now();
    const timeoutSeconds = options.timeoutSeconds ? Math.min(Math.max(Number(options.timeoutSeconds), 1), 60) : 20;
    const cwd = options.workingDirectory || process.env.HOME || '/opt/ql_server' || process.cwd();

    this.activeAiTask = {
      command,
      startTime
    };

    // 1. Phát sự kiện thông báo AI bắt đầu thao tác Terminal cho giao diện Web
    if (this.io) {
      this.io.emit('ai:terminal_activity', {
        active: true,
        command: command,
        status: 'running',
        timestamp: Date.now()
      });
    }

    // 2. In khung viền thông báo trực quan màu Tím Neon lên Terminal để người dùng dễ theo dõi
    const aiHeader = `\r\n\x1b[1;38;5;201m╭── 🤖 [AI SysAdmin Agent] Đang thực thi lệnh trên Terminal ──────────────────\x1b[0m\r\n` +
                     `\x1b[1;38;5;201m│\x1b[0m \x1b[1;32m$ \x1b[1;37m${command}\x1b[0m\r\n` +
                     `\x1b[1;38;5;201m╰────────────────────────────────────────────────────────────────────────────\x1b[0m\r\n`;
    this.broadcastOutput(aiHeader);

    // 3. Khởi tạo tiến trình thực thi câu lệnh với streaming thời gian thực
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isDone = false;

      // Xử lý quyền Sudo nếu cần
      const sudoPassword = process.env.SUDO_PASSWORD || process.env.ADMIN_PASSWORD || '';
      const isSudo = /^\s*sudo\b|\bsudo\b/.test(command.trim());
      let cmdToRun = command.trim();

      if (isSudo && sudoPassword) {
        cmdToRun = cmdToRun.replace(/\bsudo\s+/g, `echo '${sudoPassword.replace(/'/g, "'\\''")}' | sudo -S -p '' `);
      }

      const child = spawn('/bin/bash', ['-c', cmdToRun], {
        cwd: cwd,
        env: {
          ...process.env,
          DEBIAN_FRONTEND: 'noninteractive',
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
      });

      // Stream trực tiếp stdout của lệnh ra Terminal người dùng
      child.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        stdout += text;
        this.broadcastOutput(text);
      });

      // Stream trực tiếp stderr của lệnh ra Terminal người dùng
      child.stderr.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        stderr += text;
        this.broadcastOutput(text);
      });

      // Bộ đếm Timeout an toàn
      const timer = setTimeout(() => {
        if (isDone) return;
        isDone = true;
        try {
          child.kill('SIGTERM');
          setTimeout(() => {
            try { child.kill('SIGKILL'); } catch (e) {}
          }, 1500);
        } catch (e) {}

        const timeoutMsg = `\r\n\x1b[1;31m[⚠️ AI Lệnh bị timeout sau ${timeoutSeconds}s - Đã tự động ngắt]\x1b[0m\r\n\r\n`;
        this.broadcastOutput(timeoutMsg);

        this.finishAiTask(command, false);

        resolve({
          success: false,
          command,
          stdout,
          stderr: stderr + `\r\n[Lệnh bị timeout sau ${timeoutSeconds} giây]`,
          exitCode: 124,
          executionTimeMs: Date.now() - startTime,
          timedOut: true
        });
      }, timeoutSeconds * 1000);

      // Khi lệnh hoàn tất
      child.on('close', (code) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(timer);

        const executionTimeMs = Date.now() - startTime;
        const success = code === 0;

        // In footer kết quả ra Terminal
        const footerColor = success ? '\x1b[1;32m' : '\x1b[1;31m';
        const symbol = success ? '✓' : '✗';
        const aiFooter = `${footerColor}[${symbol} AI hoàn tất lệnh trong ${executionTimeMs}ms - Mã thoát: ${code ?? 0}]\x1b[0m\r\n\r\n`;
        this.broadcastOutput(aiFooter);

        this.finishAiTask(command, success);

        resolve({
          success,
          command,
          stdout,
          stderr,
          exitCode: code ?? 0,
          executionTimeMs,
          timedOut: false
        });
      });

      child.on('error', (err) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(timer);

        const errMsg = `\r\n\x1b[1;31m[❌ Lỗi khởi tạo lệnh: ${err.message}]\x1b[0m\r\n\r\n`;
        this.broadcastOutput(errMsg);

        this.finishAiTask(command, false);

        resolve({
          success: false,
          command,
          stdout,
          stderr: err.message,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          timedOut: false
        });
      });
    });
  }

  /**
   * Kết thúc tác vụ AI và thông báo UI
   */
  finishAiTask(command, success) {
    this.activeAiTask = null;
    if (this.io) {
      this.io.emit('ai:terminal_activity', {
        active: false,
        command,
        status: success ? 'completed' : 'failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Gán phiên SSH riêng nếu người dùng có kết nối SSH chuyên dụng
   */
  setActiveSshSession(sshSession) {
    this.activeSshSession = sshSession;
  }

  /**
   * Xóa toàn bộ màn hình Terminal đồng nhất
   */
  clearBuffer() {
    this.scrollbackBuffer = '';
    if (this.io) {
      this.io.emit('terminal:output', '\x1b[2J\x1b[H');
    }
  }
}

module.exports = new TerminalUnifiedService();
