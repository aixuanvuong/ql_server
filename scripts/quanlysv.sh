#!/usr/bin/env bash

# ==============================================================================
# 🛠️ TRÌNH QUẢN LÝ DỰ ÁN: UBUNTU REMOTE MONITOR & WEB SSH
# Lệnh gọi nhanh từ bất kỳ đâu trên Terminal: quanlysv
# Repository: https://github.com/aixuanvuong/ql_server.git
# ==============================================================================

# Định dạng màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

INSTALL_DIR="/opt/ql_server"
WEB_ROOT="/var/www/ql_server"
PM2_NAME="ql_server-backend"
NGINX_CONF="/etc/nginx/sites-available/ql_server"

# Hàm kiểm tra quyền root
check_root() {
  if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[Lỗi]: Vui lòng chạy lệnh với quyền sudo hoặc root!${NC}"
    echo -e "Ví dụ: ${YELLOW}sudo quanlysv${NC}"
    exit 1
  fi
}

# ------------------------------------------------------------------------------
# MỤC 1: XEM TÌNH TRẠNG CỦA ỨNG DỤNG ĐANG CHẠY HAY CHƯA
# ------------------------------------------------------------------------------
show_status() {
  clear
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║${CYAN}${BOLD}           📊 TÌNH TRẠNG HOẠT ĐỘNG CỦA HỆ THỐNG               ${NC}${PURPLE}║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  # 1. Kiểm tra Backend Agent (PM2)
  echo -e "${YELLOW}1. Backend Agent (Node.js API & WebSocket):${NC}"
  if pm2 list | grep -q "$PM2_NAME"; then
    STATUS=$(pm2 jlist | grep -o "\"name\":\"$PM2_NAME\",\"pm_id\":[0-9]*,\"status\":\"[a-zA-Z]*\"" || true)
    if echo "$STATUS" | grep -q "online"; then
      echo -e "   • Trạng thái: ${GREEN}${BOLD}● ĐANG CHẠY (ONLINE)${NC}"
    else
      echo -e "   • Trạng thái: ${RED}${BOLD}● ĐÃ DỪNG HOẶC LỖI (STOPPED/ERRORED)${NC}"
    fi
  else
    echo -e "   • Trạng thái: ${RED}Chưa cài đặt hoặc tiến trình PM2 không tồn tại!${NC}"
  fi

  # 2. Kiểm tra Nginx Web Server
  echo ""
  echo -e "${YELLOW}2. Web Server (Nginx Reverse Proxy):${NC}"
  if systemctl is-active --quiet nginx; then
    echo -e "   • Trạng thái: ${GREEN}${BOLD}● ĐANG CHẠY (ACTIVE)${NC}"
  else
    echo -e "   • Trạng thái: ${RED}${BOLD}● ĐÃ DỪNG HOẶC LỖI (INACTIVE)${NC}"
  fi

  # 3. Kiểm tra Cloudflare Tunnel
  echo ""
  echo -e "${YELLOW}3. Cloudflare Tunnel (Kết nối Internet Zero Open Ports):${NC}"
  if systemctl is-active --quiet cloudflared; then
    echo -e "   • Service cloudflared: ${GREEN}${BOLD}● ĐANG CHẠY (TOKEN CHÍNH THỨC)${NC}"
  elif systemctl is-active --quiet cloudflared-quick.service; then
    echo -e "   • Service Quick Tunnel: ${GREEN}${BOLD}● ĐANG CHẠY (QUICK TUNNEL TRYCLOUDFLARE)${NC}"
    QUICK_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*.trycloudflare.com' /var/log/cloudflared-quick.log 2>/dev/null | tail -n 1 || true)
    if [ -n "$QUICK_URL" ]; then
      echo -e "   • Link truy cập: ${CYAN}${BOLD}${QUICK_URL}${NC}"
    fi
  else
    echo -e "   • Trạng thái: ${RED}${BOLD}● KHÔNG HOẠT ĐỘNG${NC}"
  fi

  # 4. Thông tin tài khoản đăng nhập đã lưu trong .env
  echo ""
  echo -e "${YELLOW}4. Thông tin tài khoản Admin Dashboard:${NC}"
  if [ -f "$INSTALL_DIR/backend/.env" ]; then
    ADMIN_USER=$(grep -E '^ADMIN_USERNAME=' "$INSTALL_DIR/backend/.env" | cut -d '=' -f2)
    echo -e "   • Tên đăng nhập : ${GREEN}${ADMIN_USER}${NC}"
    echo -e "   • File cấu hình : ${CYAN}$INSTALL_DIR/backend/.env${NC}"
  else
    echo -e "   • Không tìm thấy file .env tại $INSTALL_DIR/backend/.env"
  fi

  echo ""
  echo -e "${PURPLE}------------------------------------------------------------------${NC}"
  read -p "Nhấn phím [Enter] để quay lại menu chính..."
}

# ------------------------------------------------------------------------------
# MỤC 2: CẬP NHẬT PHIÊN BẢN MỚI TỪ GITHUB
# ------------------------------------------------------------------------------
update_version() {
  clear
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║${CYAN}${BOLD}         🔄 CẬP NHẬT PHIÊN BẢN MỚI TỪ GITHUB                   ${NC}${PURPLE}║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}[Lỗi]: Không tìm thấy thư mục dự án tại $INSTALL_DIR!${NC}"
    read -p "Nhấn [Enter] để quay lại..."
    return
  fi

  echo -e "${YELLOW}Đang kéo mã nguồn mới nhất từ kho GitHub aixuanvuong/ql_server...${NC}"
  cd "$INSTALL_DIR"
  git fetch --all
  git reset --hard origin/main || git pull origin main || git pull origin master

  # Cập nhật Backend
  echo ""
  echo -e "${CYAN}→ Đang cập nhật gói Backend...${NC}"
  cd "$INSTALL_DIR/backend" || cd "$INSTALL_DIR"
  npm install --production

  # Cập nhật Frontend
  echo ""
  echo -e "${CYAN}→ Đang biên dịch lại Frontend...${NC}"
  cd "$INSTALL_DIR/frontend" 2>/dev/null || cd "$INSTALL_DIR"
  npm install
  npm run build

  mkdir -p "$WEB_ROOT"
  rm -rf "$WEB_ROOT"/*
  if [ -d "dist" ]; then
    cp -r dist/* "$WEB_ROOT/"
  elif [ -d "build" ]; then
    cp -r build/* "$WEB_ROOT/"
  fi

  # Khởi động lại PM2 & Nginx
  echo ""
  echo -e "${CYAN}→ Khởi động lại dịch vụ...${NC}"
  pm2 restart "$PM2_NAME" || true
  systemctl restart nginx

  # Cập nhật lại chính file lệnh quanlysv vào /usr/local/bin
  if [ -f "$INSTALL_DIR/scripts/quanlysv.sh" ]; then
    cp "$INSTALL_DIR/scripts/quanlysv.sh" /usr/local/bin/quanlysv
    chmod +x /usr/local/bin/quanlysv
  fi

  echo ""
  echo -e "${GREEN}==================================================================${NC}"
  echo -e "${GREEN}${BOLD}     ✓ CẬP NHẬT HOÀN TẤT LÊN PHIÊN BẢN MỚI NHẤT THÀNH CÔNG!       ${NC}"
  echo -e "${GREEN}==================================================================${NC}"
  echo ""
  read -p "Nhấn phím [Enter] để quay lại menu chính..."
}

# ------------------------------------------------------------------------------
# MỤC 3: THAY ĐỔI TÊN MIỀN / CẤU HÌNH CLOUDFLARE TUNNEL
# ------------------------------------------------------------------------------
change_domain() {
  clear
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║${CYAN}${BOLD}         🌐 THAY ĐỔI TÊN MIỀN / CLOUDFLARE TUNNEL              ${NC}${PURPLE}║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "Bạn muốn thay đổi tên miền theo hình thức nào?"
  echo -e "  ${BOLD}1.${NC} Cài đặt ${CYAN}Cloudflare Tunnel Token chính thức${NC} (Tên miền riêng: monitor.domain.com)"
  echo -e "  ${BOLD}2.${NC} Tạo lại ${CYAN}Cloudflare Quick Tunnel miễn phí${NC} (*.trycloudflare.com)"
  echo -e "  ${BOLD}3.${NC} Cập nhật tên miền truyền thống trên Nginx (server_name)"
  echo -e "  ${BOLD}0.${NC} Hủy bỏ và quay lại"
  echo ""
  read -p "Nhập lựa chọn của bạn [0-3]: " DOMAIN_CHOICE

  case $DOMAIN_CHOICE in
    1)
      echo ""
      echo -e "${YELLOW}Hướng dẫn lấy Token:${NC}"
      echo -e "1. Vào ${CYAN}https://one.dash.cloudflare.com${NC} > Networks > Tunnels."
      echo -e "2. Tạo hoặc chọn Tunnel > Copy chuỗi Token dài bắt đầu bằng 'eyJh...'."
      echo ""
      read -p "Dán Cloudflare Tunnel Token của bạn vào đây: " NEW_TOKEN
      if [ -n "$NEW_TOKEN" ]; then
        echo -e "${CYAN}→ Đang áp dụng Token mới cho cloudflared...${NC}"
        systemctl stop cloudflared-quick.service 2>/dev/null || true
        systemctl disable cloudflared-quick.service 2>/dev/null || true
        cloudflared service uninstall 2>/dev/null || true
        cloudflared service install "$NEW_TOKEN"
        systemctl start cloudflared
        systemctl enable cloudflared
        echo -e "${GREEN}✓ Đã kích hoạt Cloudflare Tunnel với Token mới thành công!${NC}"
      else
        echo -e "${RED}Token rỗng. Hủy bỏ thay đổi!${NC}"
      fi
      ;;
    2)
      echo -e "${CYAN}→ Đang tạo lại Cloudflare Quick Tunnel mới...${NC}"
      systemctl stop cloudflared 2>/dev/null || true
      systemctl restart cloudflared-quick.service
      sleep 4
      QUICK_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*.trycloudflare.com' /var/log/cloudflared-quick.log 2>/dev/null | tail -n 1 || true)
      echo -e "${GREEN}✓ URL Quick Tunnel mới của bạn là:${NC} ${CYAN}${BOLD}${QUICK_URL}${NC}"
      ;;
    3)
      read -p "Nhập tên miền mới của bạn (ví dụ: my-server.com): " NEW_DOMAIN
      if [ -n "$NEW_DOMAIN" ]; then
        sed -i "s/server_name .*/server_name $NEW_DOMAIN localhost _;/g" "$NGINX_CONF"
        nginx -t && systemctl restart nginx
        echo -e "${GREEN}✓ Đã cập nhật Nginx server_name thành: $NEW_DOMAIN${NC}"
      fi
      ;;
    *)
      return
      ;;
  esac

  echo ""
  read -p "Nhấn phím [Enter] để quay lại menu chính..."
}

# ------------------------------------------------------------------------------
# MỤC 4: XÓA TOÀN BỘ DỰ ÁN RA KHỎI MÁY CHỦ (UNINSTALL)
# ------------------------------------------------------------------------------
uninstall_system() {
  clear
  echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║${BOLD}        ⚠️  CẢNH BÁO: GỠ BỎ TOÀN BỘ DỰ ÁN RA KHỎI MÁY CHỦ         ${NC}${RED}║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}${BOLD}Hành động này sẽ xóa vĩnh viễn:${NC}"
  echo -e "  • Dừng và xóa tiến trình PM2: ${YELLOW}$PM2_NAME${NC}"
  echo -e "  • Gỡ bỏ dịch vụ Cloudflare Tunnel (${YELLOW}cloudflared${NC})"
  echo -e "  • Xóa cấu hình Nginx và toàn bộ file web tại ${YELLOW}$WEB_ROOT${NC}"
  echo -e "  • Xóa toàn bộ mã nguồn và cấu hình tại ${YELLOW}$INSTALL_DIR${NC}"
  echo -e "  • Xóa lệnh quản lý ${YELLOW}quanlysv${NC}"
  echo ""

  read -p "Bạn có CHẮC CHẮN 100% muốn xóa sạch dự án? (Gõ 'YES' viết hoa để xác nhận): " CONFIRM
  if [ "$CONFIRM" != "YES" ]; then
    echo -e "${GREEN}Đã hủy bỏ thao tác gỡ cài đặt. Dữ liệu của bạn an toàn!${NC}"
    sleep 2
    return
  fi

  echo ""
  echo -e "${YELLOW}→ Đang dừng tiến trình PM2...${NC}"
  pm2 delete "$PM2_NAME" 2>/dev/null || true
  pm2 save 2>/dev/null || true

  echo -e "${YELLOW}→ Đang dừng các dịch vụ Cloudflare Tunnel...${NC}"
  systemctl stop cloudflared 2>/dev/null || true
  systemctl disable cloudflared 2>/dev/null || true
  cloudflared service uninstall 2>/dev/null || true
  systemctl stop cloudflared-quick.service 2>/dev/null || true
  systemctl disable cloudflared-quick.service 2>/dev/null || true
  rm -f /etc/systemd/system/cloudflared-quick.service
  systemctl daemon-reload

  echo -e "${YELLOW}→ Đang gỡ bỏ cấu hình Nginx...${NC}"
  rm -f /etc/nginx/sites-enabled/ql_server
  rm -f "$NGINX_CONF"
  systemctl restart nginx 2>/dev/null || true

  echo -e "${YELLOW}→ Đang xóa thư mục webroot và mã nguồn...${NC}"
  rm -rf "$WEB_ROOT"
  rm -rf "$INSTALL_DIR"

  echo -e "${YELLOW}→ Đang xóa lệnh quanlysv...${NC}"
  rm -f /usr/local/bin/quanlysv

  echo ""
  echo -e "${GREEN}==================================================================${NC}"
  echo -e "${GREEN}${BOLD}✓ ĐÃ GỠ BỎ TOÀN BỘ HỆ THỐNG RA KHỎI MÁY CHỦ SẠCH SẼ!${NC}"
  echo -e "${GREEN}==================================================================${NC}"
  echo ""
  exit 0
}

# ------------------------------------------------------------------------------
# MENU CHÍNH
# ------------------------------------------------------------------------------
main_menu() {
  check_root

  while true; do
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${CYAN}${BOLD}       🛠️  BẢNG ĐIỀU KHIỂN QUẢN TRỊ MÁY CHỦ: QUANLYSV          ${NC}${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC}       Hệ Thống Giám Sát & Web SSH Terminal + Trợ Lý AI AI       ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}${GREEN}[1]${NC} ${BOLD}Xem tình trạng ứng dụng đang chạy hay chưa${NC}"
    echo -e "      ${CYAN}Kiểm tra Backend PM2, Web Server Nginx, Cloudflare Tunnel, URL${NC}"
    echo ""
    echo -e "  ${BOLD}${YELLOW}[2]${NC} ${BOLD}Cập nhật phiên bản mới từ GitHub${NC}"
    echo -e "      ${CYAN}Tự động git pull, build lại Frontend, cập nhật gói và restart${NC}"
    echo ""
    echo -e "  ${BOLD}${BLUE}[3]${NC} ${BOLD}Thay đổi tên miền / Cloudflare Tunnel${NC}"
    echo -e "      ${CYAN}Cập nhật Cloudflare Tunnel Token, đổi tên miền riêng${NC}"
    echo ""
    echo -e "  ${BOLD}${RED}[4]${NC} ${BOLD}Xóa toàn bộ dự án ra khỏi máy chủ (Uninstall)${NC}"
    echo -e "      ${RED}Gỡ bỏ PM2, Nginx config, Cloudflare daemon và xóa sạch thư mục${NC}"
    echo ""
    echo -e "  ${BOLD}[0]${NC} Thoát (Exit)"
    echo ""
    echo -e "${PURPLE}──────────────────────────────────────────────────────────────────${NC}"
    read -p "Nhập lựa chọn của bạn [0-4]: " OPTION

    case $OPTION in
      1)
        show_status
        ;;
      2)
        update_version
        ;;
      3)
        change_domain
        ;;
      4)
        uninstall_system
        ;;
      0)
        clear
        echo -e "${GREEN}Tạm biệt! Bạn có thể gõ lại ${CYAN}quanlysv${GREEN} bất cứ lúc nào.${NC}"
        exit 0
        ;;
      *)
        echo -e "${RED}Lựa chọn không hợp lệ! Vui lòng chọn từ 0 đến 4.${NC}"
        sleep 1.5
        ;;
    esac
  done
}

# Khởi động Menu chính
main_menu
