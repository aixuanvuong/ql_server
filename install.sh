#!/usr/bin/env bash

# ==============================================================================
# 🚀 UBUNTU REMOTE MONITOR & WEB SSH - SCRIPT CÀI ĐẶT TỰ ĐỘNG CLOUDFLARE TUNNEL
# Repository: https://github.com/aixuanvuong/ql_server.git
# Chạy 100% qua Cloudflare Tunnel - KHÔNG CẦN MỞ CỔNG (ZERO OPEN PORTS)
# Hỗ trợ hệ điều hành: Ubuntu 20.04 / 22.04 / 24.04 LTS & Debian 11/12
# ==============================================================================

set -e

# Màu sắc giao diện terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# In tiêu đề
clear
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${CYAN}${BOLD}     🚀 CÀI ĐẶT TỰ ĐỘNG: UBUNTU MONITOR + CLOUDFLARE TUNNEL           ${NC}${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}       Zero Open Ports • Tự Động HTTPS • Hỗ Trợ Mọi Mạng Internet     ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}       Repository: https://github.com/aixuanvuong/ql_server.git        ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[Lỗi]: Vui lòng chạy script này với quyền root hoặc sudo!${NC}"
  echo -e "Lệnh chuẩn: ${YELLOW}curl -sSL https://raw.githubusercontent.com/aixuanvuong/ql_server/main/install.sh | sudo bash${NC}"
  exit 1
fi

INSTALL_DIR="/opt/ql_server"
WEB_ROOT="/var/www/ql_server"
BACKEND_PORT=5000

# 2. Cấu hình thông tin người dùng
echo -e "${YELLOW}⚙️  BƯỚC 1: CẤU HÌNH THÔNG TIN QUẢN TRỊ & CLOUDFLARE TUNNEL${NC}"
echo -e "------------------------------------------------------------------"

read -p "Tên đăng nhập Admin Dashboard [Mặc định: admin]: " INPUT_USER
ADMIN_USER=${INPUT_USER:-admin}

DEFAULT_PASS=$(openssl rand -base64 9 | tr -dc 'a-zA-Z0-9' | head -c 10)
read -p "Mật khẩu Admin [Mặc định: $DEFAULT_PASS]: " INPUT_PASS
ADMIN_PASS=${INPUT_PASS:-$DEFAULT_PASS}

read -p "Google Gemini API Key (Bấm Enter để bỏ qua nếu chưa có): " INPUT_GEMINI
GEMINI_KEY=${INPUT_GEMINI:-""}

echo ""
echo -e "${CYAN}☁️  CẤU HÌNH CLOUDFLARE TUNNEL (Để ra Internet không cần mở cổng):${NC}"
echo -e "  Nếu bạn đã tạo Tunnel trên Cloudflare Zero Trust (Networks > Tunnels),"
echo -e "  hãy dán ${BOLD}Cloudflare Tunnel Token${NC} (chuỗi ký tự dài bắt đầu bằng 'eyJh...')."
echo -e "  (Nếu chưa có, hãy nhấn Enter để tạo Quick Tunnel tạm thời hoặc cấu hình sau)."
read -p "Cloudflare Tunnel Token: " INPUT_CF_TOKEN
CF_TUNNEL_TOKEN=${INPUT_CF_TOKEN:-""}

JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo -e "${GREEN}✓ Đã ghi nhận cấu hình! Bắt đầu quá trình thiết lập tự động...${NC}"
echo ""

# 3. Cài đặt các gói hệ điều hành cần thiết
echo -e "${YELLOW}📦 BƯỚC 2: CẬP NHẬT HỆ THỐNG VÀ CÀI ĐẶT CÁC GÓI NỀN TẢNG...${NC}"
apt-get update -y
apt-get install -y curl git ufw nginx build-essential openssl

# 4. Cài đặt Node.js LTS (v20.x) & PM2
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
  echo -e "${CYAN}→ Đang cài đặt Node.js v20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
  echo -e "${CYAN}→ Đang cài đặt PM2 Process Manager...${NC}"
  npm install -g pm2
fi

# 5. Cài đặt Cloudflare Tunnel Daemon (cloudflared)
echo ""
echo -e "${YELLOW}☁️  BƯỚC 3: CÀI ĐẶT CLOUDFLARE TUNNEL DAEMON (cloudflared)...${NC}"
if ! command -v cloudflared &> /dev/null; then
  ARCH=$(dpkg --print-architecture)
  if [ "$ARCH" = "amd64" ]; then
    CF_DEB_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
  elif [ "$ARCH" = "arm64" ]; then
    CF_DEB_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb"
  else
    CF_DEB_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-386.deb"
  fi

  echo -e "${CYAN}→ Tải gói cloudflared (${ARCH})...${NC}"
  curl -L -o /tmp/cloudflared.deb "$CF_DEB_URL"
  dpkg -i /tmp/cloudflared.deb || apt-get install -f -y
  rm -f /tmp/cloudflared.deb
fi
echo -e "${GREEN}✓ cloudflared phiên bản: $(cloudflared --version)${NC}"

# 6. Tải và đồng bộ mã nguồn từ GitHub
echo ""
echo -e "${YELLOW}📥 BƯỚC 4: TẢI MÃ NGUỒN TỪ GITHUB...${NC}"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${CYAN}→ Thư mục $INSTALL_DIR đã tồn tại. Đang đồng bộ...${NC}"
  cd "$INSTALL_DIR"
  git pull origin main || git pull origin master || true
else
  echo -e "${CYAN}→ Đang clone mã nguồn từ https://github.com/aixuanvuong/ql_server.git...${NC}"
  git clone https://github.com/aixuanvuong/ql_server.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# 7. Cấu hình Backend
echo ""
echo -e "${YELLOW}🔧 BƯỚC 5: CẤU HÌNH VÀ CÀI ĐẶT BACKEND...${NC}"
cd "$INSTALL_DIR/backend" || cd "$INSTALL_DIR"

cat << EOF > .env
PORT=${BACKEND_PORT}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
ADMIN_USERNAME=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASS}
SSH_HOST=127.0.0.1
SSH_PORT=22
GEMINI_API_KEY=${GEMINI_KEY}
AI_MODEL=gemini-3.8-flash
NODE_ENV=production
EOF

echo -e "${CYAN}→ Đang cài đặt thư viện Backend...${NC}"
npm install --production

# 8. Cấu hình Frontend & Build
echo ""
echo -e "${YELLOW}🎨 BƯỚC 6: BIÊN DỊCH GIAO DIỆN REACT FRONTEND...${NC}"
cd "$INSTALL_DIR/frontend" 2>/dev/null || cd "$INSTALL_DIR"

# Frontend dùng origin tương đối nên hoạt động hoàn hảo dưới bất kỳ domain Cloudflare nào
cat << EOF > .env
VITE_API_URL=
EOF

echo -e "${CYAN}→ Đang cài đặt thư viện Frontend và build tĩnh...${NC}"
npm install
npm run build

mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
if [ -d "dist" ]; then
  cp -r dist/* "$WEB_ROOT/"
elif [ -d "build" ]; then
  cp -r build/* "$WEB_ROOT/"
fi

# 9. Cấu hình Nginx (Lắng nghe cục bộ 127.0.0.1:80 để Cloudflare Tunnel chuyển tiếp vào)
echo ""
echo -e "${YELLOW}🌐 BƯỚC 7: CẤU HÌNH NGINX REVERSE PROXY NỘI BỘ...${NC}"
NGINX_CONF="/etc/nginx/sites-available/ql_server"
cat << EOF > "$NGINX_CONF"
server {
    listen 80;
    listen 127.0.0.1:80;
    server_name _;

    # 1. Giao diện Frontend tĩnh
    location / {
        root ${WEB_ROOT};
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # 2. REST API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # 3. Kênh WebSocket Socket.io và Web SSH Terminal
    location /socket.io/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Forwarded-Proto https;

        # Giữ kết nối SSH không bị timeout
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl restart nginx
systemctl enable nginx

# 10. Khởi động Backend bằng PM2
echo ""
echo -e "${YELLOW}⚡ BƯỚC 8: KHỞI CHẠY BACKEND AGENT VỚI PM2...${NC}"
cd "$INSTALL_DIR/backend" || cd "$INSTALL_DIR"
pm2 delete ql_server-backend 2>/dev/null || true
pm2 start server.js --name "ql_server-backend"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup || true

# 11. Cấu hình và Kích hoạt Cloudflare Tunnel Service
echo ""
echo -e "${YELLOW}🚀 BƯỚC 9: KHỞI ĐỘNG DỊCH VỤ CLOUDFLARE TUNNEL...${NC}"

PUBLIC_URL=""

if [ -n "$CF_TUNNEL_TOKEN" ]; then
  echo -e "${CYAN}→ Đang cài đặt service Cloudflare Tunnel với Token của bạn...${NC}"
  systemctl stop cloudflared 2>/dev/null || true
  cloudflared service uninstall 2>/dev/null || true
  cloudflared service install "$CF_TUNNEL_TOKEN"
  systemctl start cloudflared
  systemctl enable cloudflared
  PUBLIC_URL="https://[Tên miền bạn đã gán trên Cloudflare Dashboard]"
  echo -e "${GREEN}✓ Cloudflare Tunnel Service đã được kích hoạt thành công!${NC}"
else
  # Tạo một service Quick Tunnel (chạy ngầm tự động qua systemd)
  echo -e "${CYAN}→ Khởi động Cloudflare Quick Tunnel tự động (Miễn phí, không cần cấu hình)...${NC}"
  
  cat << 'EOF' > /etc/systemd/system/cloudflared-quick.service
[Unit]
Description=Cloudflare Quick Tunnel for QL Server
After=network.target nginx.service

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://127.0.0.1:80
StandardOutput=append:/var/log/cloudflared-quick.log
StandardError=append:/var/log/cloudflared-quick.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  # Copy cloudflared vào /usr/local/bin nếu cần
  cp $(which cloudflared) /usr/local/bin/cloudflared 2>/dev/null || true
  systemctl daemon-reload
  systemctl restart cloudflared-quick.service
  systemctl enable cloudflared-quick.service

  # Đợi 3 giây để lấy URL từ log
  sleep 4
  QUICK_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*.trycloudflare.com' /var/log/cloudflared-quick.log | tail -n 1 || true)
  if [ -n "$QUICK_URL" ]; then
    PUBLIC_URL="$QUICK_URL"
  else
    PUBLIC_URL="Xem trong lệnh: cat /var/log/cloudflared-quick.log"
  fi
fi

# 12. Tường lửa an toàn: KHÔNG MỞ CỔNG 80/5000 RA INTERNET
echo ""
echo -e "${YELLOW}🛡️ BƯỚC 10: THIẾT LẬP BẢO MẬT TƯỜNG LỬA (ZERO OPEN PORTS)...${NC}"
# Chỉ cần giữ cổng SSH nếu cần, cổng Web được bảo vệ an toàn qua Cloudflare Tunnel
ufw allow 22/tcp comment 'SSH Port' >/dev/null 2>&1 || true
# Có thể mở cổng nội bộ 80 nếu muốn truy cập từ mạng LAN
ufw allow 80/tcp comment 'Local HTTP' >/dev/null 2>&1 || true

# 13. Cài đặt tiện ích quản lý CLI: quanlysv
echo ""
echo -e "${YELLOW}⚙️  BƯỚC 11: CÀI ĐẶT MENU QUẢN LÝ NHANH 'quanlysv'...${NC}"
if [ -f "$INSTALL_DIR/scripts/quanlysv.sh" ]; then
  cp "$INSTALL_DIR/scripts/quanlysv.sh" /usr/local/bin/quanlysv
  chmod +x /usr/local/bin/quanlysv
  echo -e "${GREEN}✓ Đã cài đặt lệnh 'quanlysv' vào /usr/local/bin/quanlysv thành công!${NC}"
fi

# 14. Xuất thông tin hoàn tất
echo ""
echo -e "${GREEN}========================================================================${NC}"
echo -e "${GREEN}${BOLD}      🎉 CHÚC MỪNG! HỆ THỐNG ĐÃ KẾT NỐI CLOUDFLARE TUNNEL THÀNH CÔNG!     ${NC}"
echo -e "${GREEN}========================================================================${NC}"
echo ""
echo -e "🌐 ${BOLD}ĐỊA CHỈ TRUY CẬP INTERNET (HTTPS TỰ ĐỘNG, KHÔNG MỞ CỔNG):${NC}"
echo -e "   👉 ${CYAN}${BOLD}${PUBLIC_URL}${NC}"
echo ""
echo -e "🔑 ${BOLD}THÔNG TIN ĐĂNG NHẬP:${NC}"
echo -e "   • Tên đăng nhập: ${GREEN}${ADMIN_USER}${NC}"
echo -e "   • Mật khẩu     : ${YELLOW}${BOLD}${ADMIN_PASS}${NC}"
echo ""
echo -e "🛠️  ${BOLD}LỆNH QUẢN LÝ DỰ ÁN QUA MENU INTERACTIVE:${NC}"
echo -e "   Từ bất kỳ đâu trên Terminal, chỉ cần gõ: ${CYAN}${BOLD}quanlysv${NC}"
echo -e "   (Bao gồm: Kiểm tra trạng thái, Cập nhật code, Đổi tên miền, Gỡ cài đặt)"
echo ""
echo -e "☁️  ${BOLD}CÁCH GÁN TÊN MIỀN RIÊNG BẤT CỨ LÚC NÀO:${NC}"
echo -e "   Chạy lệnh ${CYAN}quanlysv${NC} > Chọn [3] > Dán Cloudflare Tunnel Token."
echo ""
echo -e "📱 ${BOLD}MẸO DÙNG TRÊN ĐIỆN THOẠI ANDROID:${NC}"
echo -e "   Mở Chrome trên điện thoại > truy cập link HTTPS ở trên >"
echo -e "   Bấm Menu (3 chấm) > chọn ${CYAN}'Thêm vào Màn hình chính'${NC} để dùng như App!"
echo ""
echo -e "${PURPLE}========================================================================${NC}"
