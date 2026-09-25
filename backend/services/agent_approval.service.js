// filepath: backend/services/agent_approval.service.js
const EventEmitter = require('events');

class AgentApprovalService extends EventEmitter {
  constructor() {
    super();
    this.pendingApprovals = new Map();
    this.io = null;
    this.approvalTimeoutMs = 60000; // 60 giây chờ người dùng duyệt lệnh
  }

  /**
   * Gán đối tượng Socket.io Server để phát sự kiện tới các Client
   * @param {import('socket.io').Server} io
   */
  init(io) {
    this.io = io;
    console.log('[AgentApprovalService] 🛡️ Đã kích hoạt hệ thống Phê duyệt Lệnh (Human-in-the-Loop)');
  }

  /**
   * Tạo yêu cầu chờ phê duyệt lệnh từ Quản trị viên
   * @param {object} params Thông tin câu lệnh cần chạy
   * @returns {Promise<{ approved: boolean, reason?: string, username?: string }>}
   */
  requestApproval({ command, timeoutSeconds = 15, workingDirectory, socketId, iteration = 1, explanation = '' }) {
    return new Promise((resolve) => {
      const approvalId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const isSudo = /^\s*sudo\b|\bsudo\b/.test(command.trim());

      const approvalData = {
        approvalId,
        command,
        timeoutSeconds,
        workingDirectory,
        isSudo,
        iteration,
        explanation: explanation || (isSudo ? 'Lệnh yêu cầu quyền Root/Sudo trên máy chủ' : 'Lệnh thực thi hệ thống từ AI Agent'),
        createdAt: Date.now(),
        expiresAt: Date.now() + this.approvalTimeoutMs
      };

      // Đặt bộ đếm thời gian tự động từ chối nếu không có phản hồi
      const timer = setTimeout(() => {
        if (this.pendingApprovals.has(approvalId)) {
          console.warn(`[AgentApprovalService] ⌛ Hết thời gian chờ phê duyệt cho lệnh: "${command}" (ID: ${approvalId})`);
          this.pendingApprovals.delete(approvalId);

          if (this.io) {
            this.io.emit('ai:command_approval_timeout', { approvalId, command });
          }

          resolve({
            approved: false,
            reason: 'Hết thời gian chờ người dùng phê duyệt (60s). Thao tác bị hủy để đảm bảo an toàn.'
          });
        }
      }, this.approvalTimeoutMs);

      // Lưu trữ promise resolver vào Map
      this.pendingApprovals.set(approvalId, {
        resolve,
        timer,
        data: approvalData
      });

      console.log(`[AgentApprovalService] 🔔 Đang chờ phê duyệt từ người dùng cho lệnh: "${command}" (ID: ${approvalId})`);

      // Phát sự kiện tới Client qua Socket.io
      if (this.io) {
        if (socketId) {
          // Gửi tới socket cụ thể nếu có
          this.io.to(socketId).emit('ai:command_approval_request', approvalData);
        } else {
          // Phát sóng tới tất cả admin đang mở tab web
          this.io.emit('ai:command_approval_request', approvalData);
        }
      }
    });
  }

  /**
   * Xử lý khi Quản trị viên bấm Đồng ý hoặc Từ chối từ giao diện Web
   * @param {string} approvalId Mã phê duyệt
   * @param {boolean} approved Trạng thái phê duyệt (true = Đồng ý, false = Từ chối)
   * @param {string} [username] Tên người dùng phê duyệt
   */
  resolveApproval(approvalId, approved, username = 'Admin') {
    const item = this.pendingApprovals.get(approvalId);
    if (!item) {
      console.warn(`[AgentApprovalService] ⚠ Không tìm thấy yêu cầu phê duyệt hoặc đã hết hạn: ${approvalId}`);
      return { success: false, message: 'Yêu cầu không tồn tại hoặc đã hết hạn.' };
    }

    clearTimeout(item.timer);
    this.pendingApprovals.delete(approvalId);

    const actionText = approved ? 'ĐỒNG Ý' : 'TỪ CHỐI';
    console.log(`[AgentApprovalService] 👤 Quản trị viên (${username}) đã ${actionText} thực thi lệnh: "${item.data.command}"`);

    // Thông báo cho tất cả client rằng yêu cầu đã được giải quyết
    if (this.io) {
      this.io.emit('ai:command_approval_resolved', {
        approvalId,
        approved,
        username,
        command: item.data.command
      });
    }

    item.resolve({
      approved: Boolean(approved),
      username,
      reason: approved ? undefined : 'Quản trị viên đã bấm TỪ CHỐI thực thi lệnh này.'
    });

    return {
      success: true,
      message: `Đã ${actionText} thực thi lệnh thành công.`
    };
  }

  /**
   * Lấy danh sách các yêu cầu đang chờ phê duyệt
   */
  getPendingApprovals() {
    return Array.from(this.pendingApprovals.values()).map((p) => p.data);
  }
}

module.exports = new AgentApprovalService();
