// filepath: backend/sockets/ai.socket.js
const agentApprovalService = require('../services/agent_approval.service');

/**
 * Socket Controller quản lý các sự kiện phê duyệt lệnh và tiến độ của AI Agent
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
module.exports = (io, socket) => {
  // Lắng nghe khi người dùng bấm Đồng ý hoặc Từ chối lệnh trên giao diện Web
  socket.on('ai:command_approval_response', ({ approvalId, approved }) => {
    const username = socket.user?.username || 'Admin';
    console.log(`[Socket:AI] Nhận phản hồi duyệt lệnh từ ${socket.id} (User: ${username}) - ApprovalID: ${approvalId}, Approved: ${approved}`);
    
    agentApprovalService.resolveApproval(approvalId, approved, username);
  });

  // Gửi danh sách các lệnh đang chờ duyệt khi client vừa kết nối
  socket.on('ai:get_pending_approvals', () => {
    const pendings = agentApprovalService.getPendingApprovals();
    socket.emit('ai:pending_approvals_list', pendings);
  });
};
