// filepath: backend/services/command_executor.service.js
const { exec } = require('child_process');
const path = require('path');

class CommandExecutorService {
  constructor() {
    this.defaultTimeoutMs = 15000; // Mặc định 15 giây tự ngắt để tránh treo lệnh như ping, tail -f
    this.maxTimeoutMs = 60000;     // Tối đa 60 giây
    this.maxOutputChars = 8000;    // Giới hạn độ dài output để tránh tràn token LLM
  }

  /**
   * Định nghĩa Tool Calling theo chuẩn OpenAPI / Model Context Protocol (MCP) cho AI Agent
   * GỠ BỎ TOÀN BỘ WHITELIST: Cho phép AI thực thi bất kỳ câu lệnh nào trên server.
   */
  getToolDefinition() {
    return {
      type: 'function',
      function: {
        name: 'execute_command',
        description: 'Thực thi câu lệnh Bash trên máy chủ Ubuntu (toàn quyền root/sudo, cài đặt gói apt, sửa file cấu hình bằng sed/echo, restart systemd, quản lý tiến trình, kiểm tra log mạng và phần cứng). Tool này có God Mode - không bị giới hạn danh sách trắng.',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Câu lệnh Bash hoàn chỉnh cần chạy trên terminal (ví dụ: "systemctl status nginx", "sudo systemctl restart nginx", "apt update -y", "free -h", "sed -i ...")'
            },
            timeoutSeconds: {
              type: 'number',
              description: 'Thời gian tối đa cho phép lệnh chạy tính theo giây trước khi tự động ép tắt (mặc định: 15s, tối đa: 60s). Đối với các lệnh như ping hay tail, luôn cần giới hạn để tránh treo.'
            },
            workingDirectory: {
              type: 'string',
              description: 'Thư mục thực thi lệnh (mặc định là thư mục gốc của dự án hoặc /var/www/ql_server)'
            }
          },
          required: ['command']
        }
      }
    };
  }

  /**
   * Chuẩn bị câu lệnh kèm xử lý quyền Sudo tự động
   * @param {string} rawCommand Câu lệnh do AI đề xuất
   * @returns {{ cmdToRun: string, isSudo: boolean }}
   */
  prepareCommandWithSudo(rawCommand) {
    const trimmed = rawCommand.trim();
    const sudoPassword = process.env.SUDO_PASSWORD || process.env.ADMIN_PASSWORD || '';
    const isSudo = /^\s*sudo\b|\bsudo\b/.test(trimmed);

    // Nếu lệnh có sudo và có mật khẩu sudo được cấu hình trong .env
    // Dùng cơ chế `sudo -S -p ''` để nhận mật khẩu từ stdin mà không làm treo shell
    if (isSudo && sudoPassword) {
      // Thay thế sudo thường bằng sudo -S
      // Hoặc bọc echo password | sudo -S
      const sanitizedSudo = trimmed.replace(/\bsudo\s+/g, `echo '${sudoPassword.replace(/'/g, "'\\''")}' | sudo -S -p '' `);
      return { cmdToRun: sanitizedSudo, isSudo: true };
    }

    return { cmdToRun: trimmed, isSudo };
  }

  /**
   * Cắt tỉa output nếu quá dài để bảo vệ Token Window cho Agentic Loop
   */
  truncateOutput(output) {
    if (!output || typeof output !== 'string') return '';
    if (output.length <= this.maxOutputChars) return output;

    const headChars = Math.floor(this.maxOutputChars * 0.4);
    const tailChars = Math.floor(this.maxOutputChars * 0.6);

    return `${output.slice(0, headChars)}\n\n[...⚠️ Output dài ${output.length} ký tự, đã cắt bớt để bảo vệ Token Window của AI Agent...]\n\n${output.slice(-tailChars)}`;
  }

  /**
   * Thực thi câu lệnh hệ thống với kiểm soát Timeout nghiêm ngặt
   * @param {string} command Câu lệnh cần chạy
   * @param {object} options Tùy chọn timeoutSeconds và workingDirectory
   * @returns {Promise<{ success: boolean, command: string, stdout: string, stderr: string, exitCode: number, executionTimeMs: number, timedOut: boolean }>}
   */
  executeCommand(command, options = {}) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeoutSeconds = options.timeoutSeconds
        ? Math.min(Math.max(Number(options.timeoutSeconds), 1), this.maxTimeoutMs / 1000)
        : this.defaultTimeoutMs / 1000;

      const timeoutMs = timeoutSeconds * 1000;
      const cwd = options.workingDirectory || path.resolve(process.cwd());

      const { cmdToRun, isSudo } = this.prepareCommandWithSudo(command);

      console.log(`[CommandExecutor] ⚡ Thực thi lệnh (Timeout: ${timeoutSeconds}s, Sudo: ${isSudo}): "${command}"`);

      let isFinished = false;

      // Thực thi qua /bin/bash để hỗ trợ pipes, redirects, &&, ||
      const child = exec(
        cmdToRun,
        {
          shell: '/bin/bash',
          cwd: cwd,
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          env: {
            ...process.env,
            DEBIAN_FRONTEND: 'noninteractive', // Tránh apt-get hỏi giao diện ncurses
            LANG: 'C.UTF-8',
            LC_ALL: 'C.UTF-8'
          }
        },
        (error, stdout, stderr) => {
          if (isFinished) return;
          isFinished = true;

          const executionTimeMs = Date.now() - startTime;
          const timedOut = Boolean(error && (error.killed || error.signal === 'SIGTERM' || error.signal === 'SIGKILL'));

          let rawStdout = stdout ? stdout.toString() : '';
          let rawStderr = stderr ? stderr.toString() : '';

          // Lược bỏ dòng prompt password nếu có lọt vào stderr
          if (isSudo) {
            rawStderr = rawStderr.replace(/\[sudo\] password for [^:]+:\s*/gi, '');
          }

          const exitCode = timedOut ? 124 : (error ? (error.code || 1) : 0);

          if (timedOut) {
            rawStderr += `\n[TIMEOUT WARNING]: Câu lệnh đã bị buộc ngắt vì vượt quá giới hạn thời gian thực thi (${timeoutSeconds}s). Hãy thêm tham số dừng như "ping -c 4" hoặc "timeout 5s ...".`;
          }

          const result = {
            success: exitCode === 0,
            command: command,
            stdout: this.truncateOutput(rawStdout.trim()),
            stderr: this.truncateOutput(rawStderr.trim()),
            exitCode: exitCode,
            executionTimeMs: executionTimeMs,
            timedOut: timedOut
          };

          if (result.success) {
            console.log(`[CommandExecutor] ✓ Hoàn thành [Exit: 0] (${executionTimeMs}ms)`);
          } else {
            console.warn(`[CommandExecutor] ⚠ Lệnh kết thúc với lỗi [Exit: ${exitCode}] (${executionTimeMs}ms): ${result.stderr.slice(0, 150)}`);
          }

          resolve(result);
        }
      );

      // Dự phòng timeout cưỡng chế nếu exec process không tự ngắt
      const forceKillTimer = setTimeout(() => {
        if (!isFinished && child && !child.killed) {
          try {
            console.warn(`[CommandExecutor] 🛑 Ép buộc dừng tiến trình PID ${child.pid} do vượt quá ${timeoutMs}ms`);
            child.kill('SIGKILL');
          } catch {
            // Ignore kill errors
          }
        }
      }, timeoutMs + 1000);

      child.on('close', () => {
        clearTimeout(forceKillTimer);
      });
    });
  }
}

module.exports = new CommandExecutorService();
