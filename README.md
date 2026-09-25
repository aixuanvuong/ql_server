# 🚀 Ubuntu Remote Monitor & Web SSH với Trợ Lý AI SysAdmin (Cloudflare Tunnel)

Hệ thống quản trị và giám sát máy chủ **Ubuntu Server** từ xa theo thời gian thực (Real-time), tích hợp **Web-based SSH Terminal** tối ưu cho điện thoại Android và **Trợ lý AI SysAdmin (Google Gemini 3.8)**. 

Đặc biệt, hệ thống **bắt buộc chạy qua Cloudflare Tunnel** — cho phép truy cập Internet với chứng chỉ **HTTPS bảo mật miễn phí mà KHÔNG CẦN MỞ CỔNG (Zero Open Ports)** trên Router/Modem/VPS!

---

## ⚡ Cài Đặt Nhanh Bằng 1 Câu Lệnh Duy Nhất (Chạy Qua Cloudflare Tunnel)

Chỉ cần đăng nhập vào máy chủ Ubuntu của bạn qua Terminal và chạy lệnh sau (chạy với quyền `root` hoặc `sudo`):

```bash
curl -sSL https://raw.githubusercontent.com/aixuanvuong/ql_server/main/install.sh | sudo bash
```

> **Script tự động thực hiện 100% các công việc sau:**
> 1. Kiểm tra môi trường và cài đặt các gói hệ thống: `curl`, `git`, `nginx`, `ufw`, `openssl`, `build-essential`.
> 2. Cài đặt **Node.js v20 LTS**, **PM2** và **`cloudflared` (Cloudflare Tunnel Daemon)** chính thức.
> 3. Tải mã nguồn mới nhất từ GitHub: `https://github.com/aixuanvuong/ql_server.git`.
> 4. Tạo mã bí mật `JWT_SECRET` ngẫu nhiên và cấu hình an toàn cho Backend.
> 5. Cài đặt toàn bộ dependencies và biên dịch Frontend tĩnh.
> 6. Thiết lập **PM2 Process Manager** để ứng dụng tự động chạy ngầm và tự khởi động lại khi reboot server.
> 7. Tự động cấu hình **Nginx Reverse Proxy nội bộ** hỗ trợ WebSocket `socket.io` và Web SSH.
> 8. **Kích hoạt Cloudflare Tunnel**:
>    - Hỗ trợ nhập trực tiếp **Cloudflare Tunnel Token** (gán domain riêng qua Cloudflare Zero Trust).
>    - Hoặc tự động tạo **Quick Tunnel** miễn phí (`https://xxxx.trycloudflare.com`) dùng ngay lập tức không cần cấu hình DNS.
> 9. **Bảo mật tuyệt đối (Zero Inbound Ports)**: Không cần mở bất kỳ cổng web nào (80/443/5000) ra ngoài Internet!
> 10. **Tự động cài đặt lệnh quản trị `quanlysv`** vào `/usr/local/bin/quanlysv`.

---

## 🛠️ Menu Quản Trị Hệ Thống Nhanh (`quanlysv`)

Sau khi cài đặt xong, bất cứ khi nào mở Terminal máy chủ, bạn chỉ cần gõ một chữ duy nhất:

```bash
sudo quanlysv
```

Giao diện Menu trực quan sẽ xuất hiện với 6 tính năng:

```text
╔══════════════════════════════════════════════════════════════════╗
║       🛠️  BẢNG ĐIỀU KHIỂN QUẢN TRỊ MÁY CHỦ: QUANLYSV          ║
║       Hệ Thống Giám Sát & Web SSH Terminal + Trợ Lý AI AI       ║
╚══════════════════════════════════════════════════════════════════╝

  [1] Xem tình trạng ứng dụng đang chạy hay chưa
      (Kiểm tra Backend PM2, Web Server Nginx, Cổng Port, Cloudflare Tunnel, Link URL)

  [2] Cập nhật phiên bản mới từ GitHub
      (Tự động git pull, build lại Frontend, cập nhật gói và restart)

  [3] Thay đổi tên miền / Cloudflare Tunnel
      (Cập nhật Cloudflare Tunnel Token, đổi tên miền riêng)

  [4] Thay đổi cổng truy cập hệ thống (Web Port)
      (Tùy chỉnh đổi sang bất kỳ cổng nào: 80, 8080, 8888, 3000...)

  [5] Thay đổi tài khoản & mật khẩu đăng nhập Admin
      (Đổi trực tiếp tên đăng nhập và mật khẩu quản trị hệ thống)

  [6] Xóa toàn bộ dự án ra khỏi máy chủ (Uninstall)
      (Gỡ bỏ PM2, Nginx config, Cloudflare daemon và xóa sạch thư mục)

  [0] Thoát (Exit)
```

---

## 🌟 Các Tính Năng Nổi Bật (Features)

### 1. 📊 Giám Sát Tài Nguyên Hệ Thống Thời Gian Thực (Real-time Monitor)
- **Cập nhật liên tục (1.5s/lần)** qua kết nối WebSocket (`Socket.io`).
- **Chỉ số CPU**: Tải trung bình toàn hệ thống, tải chi tiết từng nhân (Multi-core) và biểu đồ lịch sử 15 chu kỳ gần nhất.
- **Nhiệt độ CPU (°C)**: Đọc cảm biến nhiệt độ phần cứng từ Linux kernel, tự động cảnh báo đổi màu khi nhiệt độ vượt ngưỡng an toàn (>75°C).
- **Bộ nhớ RAM & Ổ đĩa Root**: Phân tích trực quan dung lượng đã dùng, còn trống và tỷ lệ phần trăm (GB/MB).
- **Thông tin hệ điều hành**: Tên máy chủ (Hostname), phiên bản phân phối Ubuntu, phiên bản nhân Linux Kernel và thời gian hoạt động liên tục (Uptime).

### 2. 🌐 Quản Lý Hạ Tầng Mạng & Giám Sát Lưu Lượng Internet (Network Infrastructure)
- **Xem ứng dụng nào đang truy cập Internet**: Theo dõi chi tiết từng tiến trình (`node`, `cloudflared`, `nginx`, `sshd`, `curl`...) kèm PID.
- **Biết ứng dụng truy cập những gì ở đâu**:
  - Địa chỉ IP & tên miền đích (`destinationHost` qua Reverse DNS, ví dụ `cloudflare.com`, `google.com`, `github.com`...).
  - Cổng dịch vụ đích (`HTTPS 443`, `DNS 53`, `SSH 22`, `Database`, `Mail`...).
  - Phân loại rõ ràng kết nối `Internet Công Cộng` hay `Mạng Nội Bộ / LAN`.
- **Giám sát Cổng Dịch Vụ Đang Mở (Listening Ports)**: Kiểm tra các cổng TCP/UDP đang lắng nghe trên máy chủ.
- **Quản lý Card Mạng (Network Interfaces)**: Thẻ hiển thị từng adapter (`eth0`, `wlan0`, `docker0`, `tailscale0`, `lo`) với IPv4, IPv6, MAC, Trạng thái (UP/DOWN), MTU, Tốc độ truyền nhận tức thì (RX/TX per second) và tổng dung lượng.
- **Tiện ích kiểm tra độ trễ (Ping Test) & Phân giải tên miền (DNS Lookup)** trực tiếp từ máy chủ.
- **Thao tác ngắt kết nối**: Cho phép dừng/kill tiến trình lạ hoặc ngốn băng thông bất thường chỉ với 1 cú click.
- **🛡️ AI Đánh Giá An Ninh Mạng (Gemini AI Audit)**: Tự động phân tích toàn bộ danh sách kết nối và các cổng mở, cho điểm mức độ an toàn (Safety Score / 100), cảnh báo rủi ro bảo mật và gợi ý các lệnh Linux xử lý.

### 3. 🛡️ Tự Động Chặn Hacker (Auto-Ban) & Tự Phục Hồi (Self-Healing System)
- **Tự động chặn IP Brute-Force SSH (Auto-Ban)**:
  - Backend Node.js lắng nghe trực tiếp `/var/log/auth.log` hoặc `journalctl -u ssh` thời gian thực (realtime).
  - Thuật toán cửa sổ trượt: Nếu 1 địa chỉ IP nhập sai mật khẩu **≥ 5 lần trong vòng 5 phút**, hệ thống tự động kích hoạt `ufw deny` hoặc `iptables DROP` để chặn triệt để kẻ tấn công.
  - Whitelist thông minh: Tự động miễn trừ dải IP nội bộ/loopback (`127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`) để chống việc tự khóa admin.
  - Hỗ trợ xem danh sách IP đã bị chặn và nút **"Gỡ chặn (Unban)"** hoặc **"Chặn IP thủ công"** chỉ với 1 cú click.
- **Tự phục hồi hệ thống (Self-Healing)**:
  - **Cứu hộ RAM (> 95% duy trì 2 phút)**: Tự động chạy lệnh an toàn `sync`, giải phóng bộ đệm RAM Cache (`sysctl -w vm.drop_caches=3`) và khởi động lại dịch vụ Web Nginx nhằm triệt tiêu các worker bị rò rỉ bộ nhớ (memory leak), tránh tình trạng Linux kích hoạt OOM Killer gây sập máy chủ.
  - **Dọn dẹp Ổ cứng (> 90%)**: Tự động thu gọn nhật ký hệ thống `journalctl --vacuum-time=3d --vacuum-size=100M`, dọn kho lưu trữ gói tạm `apt-get clean` và gỡ bỏ gói mồ côi `apt-get autoremove -y`.
  - Bộ định thời Cooldown thông minh (RAM: 5 phút, Disk: 15 phút) ngăn chặn việc lặp lại dồn dập.
- **Khu vực System Alerts & Actions (Nhật ký hành động Realtime)**:
  - Bắn thông báo khẩn cấp màu đỏ/vàng lên giao diện Web ngay khi phát hiện hành động can thiệp qua Socket.io.
  - Lưu trữ đầy đủ lịch sử hành động kèm timestamp chi tiết, phân loại thẻ (Chặn Hacker / Cứu hộ RAM / Dọn ổ đĩa) và xem được log thực thi từng dòng lệnh.

### 4. 🔄 Tự Động Cập Nhật Trực Tuyến 1-Click (Web Auto-Update)
- **Không cần SSH thủ công vào máy chủ**: Nút **"Cập nhật"** (1-Click Update) tích hợp ngay trên thanh Header và Dashboard.
- **Tự động kiểm tra phiên bản mới từ GitHub**: So sánh mã commit cục bộ của máy chủ với commit mới nhất trên nhánh `main` của GitHub `aixuanvuong/ql_server`.
- **Hiển thị nhật ký thực thi trực tiếp (Realtime Logs)**: WebSocket stream truyền trực tiếp từng bước `git fetch`, `npm install`, `npm run build` và restart `nginx`/`pm2` lên cửa sổ web.
- **Tự động đếm ngược và reload giao diện**: Trang web tự động làm mới khi máy chủ biên dịch xong, giúp người dùng tận hưởng ngay tính năng mới mà không phải gõ bất kỳ câu lệnh nào.

### 4. 💻 Web-based SSH Terminal
- Chạy trực tiếp trên trình duyệt bằng thư viện **`xterm.js`**, hỗ trợ đầy đủ 256 màu ANSI, con trỏ nhấp nháy và phím tắt dòng lệnh.
- **Tối ưu hóa đặc biệt cho điện thoại Android**:
  - Tích hợp thanh phím ảo chuyên dụng (`ESC`, `TAB`, `Ctrl+C`, `Ctrl+D`, `Ctrl+Z`, `|`, `/`, `~`, `htop`, `clear`).
  - Cụm phím điều hướng mũi tên (↑ ↓ ← →) giúp duyệt lại lịch sử lệnh bash dễ dàng trên màn hình cảm ứng.
- Tự động co giãn kích thước PTY (`cols`, `rows`) khi xoay màn hình điện thoại hoặc thay đổi kích thước cửa sổ.
- Chế độ toàn màn hình (Fullscreen) và xóa nhanh màn hình (Clear buffer).

### 3. 🤖 Trợ Lý Quản Trị Hệ Thống AI (AI SysAdmin Assistant)
- Tích hợp mô hình ngôn ngữ lớn tốc độ cao **Gemini 3.8 Flash** của Google (hoặc OpenAI).
- **Terminal Context Awareness (AI đọc Terminal)**: Tự động trích xuất 50-100 dòng log gần nhất từ `xterm.js` và các thông số CPU/RAM hiện tại đính kèm vào câu hỏi của bạn.
- **Phân tích thông minh**: Phát hiện lỗi crash, phân tích service systemd bị failed, giải thích lỗi phân quyền (permission denied), nghẽn mạng hoặc tràn RAM (OOM).
- **Gợi ý lệnh có cấu trúc**: Bóc tách các câu lệnh bash vào từng ô riêng biệt kèm nút **"📋 Sao chép lệnh"** nhanh chóng.

### 4. ⚡ Tối Ưu Hóa & Xử Lý Giới Hạn Token (Token Limit Optimization)
- **Làm sạch mã ANSI**: Loại bỏ hoàn toàn các ký tự màu sắc, mã con trỏ rác trước khi gửi lên API AI.
- **Nén dòng lặp liên tiếp**: Tự động gom các dòng log lặp vô tận (vòng lặp ping, retry) thành `↳ [Dòng trên lặp lại N lần]`.
- **Thuật toán Head-Tail Sampling**: Giữ 15 dòng đầu (lệnh đã gõ) và 55 dòng cuối (vết lỗi gần nhất), lược bỏ đoạn giữa để tiết kiệm Token và tăng tốc độ phản hồi của AI.
- Giới hạn cứng an toàn (Hard ceiling: 8.000 ký tự ~ 2.000 tokens) ở cả 2 tầng Frontend và Backend.

### 5. 🔒 Bảo Mật Nghiêm Ngặt
- Đăng nhập bảo vệ bằng **JWT (JSON Web Token)** cho cả REST API và WebSocket Handshake.
- **Nguyên tắc "Human-in-the-loop"**: AI chỉ có quyền **ĐỌC DỮ LIỆU VÀ GỢI Ý CÂU LỆNH**. Tuyệt đối không cấp quyền cho AI tự ý chạy lệnh ngầm vào luồng SSH của máy chủ.

---

## 🛠️ Ngăn Xếp Công Nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons |
| **Terminal Emulator** | `@xterm/xterm`, `@xterm/addon-fit` |
| **Backend Agent** | Node.js, Express, `systeminformation` (đọc phần cứng), `ssh2` (kết nối PTY) |
| **Real-time Engine** | `Socket.io` (Server) & `socket.io-client` (Client) |
| **Trí tuệ nhân tạo (AI)** | `@google/genai` (Google Gemini 3.8 Flash) hoặc `openai` |
| **Bảo mật** | `jsonwebtoken` (JWT), `cors`, `dotenv` |
| **Quản lý tiến trình** | `pm2` |

---

## 📋 Yêu Cầu Hệ Thống (Prerequisites)

- **Máy chủ**: Ubuntu 20.04 LTS / 22.04 LTS / 24.04 LTS trở lên (hoặc bất kỳ bản phân phối Linux tương đương nào).
- **Môi trường chạy**: Node.js phiên bản **>= 18.x** hoặc **>= 20.x** (LTS khuyến nghị) và npm/yarn.
- **Dịch vụ SSH**: Máy chủ Ubuntu đã cài đặt và đang chạy OpenSSH Server (`sudo systemctl status ssh`).
- **Khóa API AI**: Google Gemini API Key (miễn phí hoặc trả phí từ Google AI Studio) hoặc OpenAI API Key.

---

## 📦 Hướng Dẫn Cài Đặt & Cấu Hình

### Bước 1: Tải mã nguồn về máy chủ Ubuntu
```bash
git clone https://github.com/your-username/ubuntu-server-monitor.git
cd ubuntu-server-monitor
```

---

### Bước 2: Cài đặt và Cấu hình Backend (Node.js Agent)

1. Chuyển vào thư mục backend và cài đặt thư viện:
```bash
cd backend
npm install
```

2. Tạo file cấu hình môi trường `.env`:
```bash
cp .env.example .env 2>/dev/null || cat << 'EOF' > .env
# Cổng chạy của Backend Agent
PORT=5000

# Khóa bí mật ký mã JWT (Hãy đổi sang chuỗi ngẫu nhiên dài và bảo mật)
JWT_SECRET=super_secret_jwt_key_ubuntu_2026_xyz
JWT_EXPIRES_IN=24h

# Tài khoản quản trị Dashboard
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_secure_password_123

# Cấu hình SSH mặc định
SSH_HOST=127.0.0.1
SSH_PORT=22

# API Key cho Trợ lý AI (Google Gemini 3.8)
GEMINI_API_KEY=your_actual_gemini_api_key_here
AI_MODEL=gemini-3.8-flash
EOF
```

---

### Bước 3: Cài đặt và Cấu hình Frontend (React + Vite)

1. Mở một tab terminal khác và chuyển vào thư mục frontend:
```bash
cd ../frontend
npm install
```

2. Tạo file cấu hình môi trường `.env`:
```bash
cat << 'EOF' > .env
# Địa chỉ URL của Backend Agent (Thay localhost bằng IP hoặc Domain nếu chạy từ xa)
VITE_API_URL=http://localhost:5000
EOF
```

---

## 🚀 Hướng Dẫn Khởi Chạy (Usage)

### 1. Chạy ở môi trường phát triển (Development)

- **Khởi động Backend:**
```bash
cd backend
npm run dev # hoặc node server.js
```
*Backend sẽ lắng nghe tại cổng `http://localhost:5000`*.

- **Khởi động Frontend:**
```bash
cd frontend
npm run dev
```
*Frontend sẽ chạy tại `http://localhost:3000` (hoặc cổng hiển thị trên Terminal)*.

---

### 2. Triển khai Production trên máy chủ Ubuntu chạy ngầm (PM2 & Nginx)

Để hệ thống hoạt động liên tục 24/7 và tự khởi động lại khi máy chủ reboot:

#### A. Cài đặt PM2 và Chạy ngầm Backend Agent:
```bash
# Cài đặt PM2 toàn cục
sudo npm install -g pm2

# Chuyển vào thư mục backend và khởi chạy
cd backend
mkdir -p logs
pm2 start ecosystem.config.js --name "ubuntu-monitor-backend"

# Thiết lập tự khởi động cùng hệ điều hành Ubuntu khi reboot
pm2 startup
pm2 save
```

#### B. Build Frontend và Cấu hình Nginx Reverse Proxy:
```bash
cd ../frontend
npm run build

# Copy thư mục dist vào thư mục webroot của Nginx
sudo mkdir -p /var/www/ubuntu-monitor
sudo cp -r dist/* /var/www/ubuntu-monitor/
```

Tạo file cấu hình Nginx `/etc/nginx/sites-available/ubuntu-monitor`:
```nginx
server {
    listen 80;
    server_name your_domain_or_server_ip;

    # Giao diện Frontend tĩnh
    location / {
        root /var/www/ubuntu-monitor;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Chuyển tiếp API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Chuyển tiếp luồng WebSocket (Socket.io)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Giữ phiên SSH không bị ngắt timeout bất ngờ
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Kích hoạt trang web và restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ubuntu-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📱 Trải Nghiệm Mượt Mà Trên Điện Thoại Android

1. Mở trình duyệt **Google Chrome** trên điện thoại Android và truy cập `http://IP_CỦA_SERVER`.
2. Đăng nhập với tài khoản Admin đã cấu hình.
3. Nhấn vào biểu tượng **3 dấu chấm (Menu)** ở góc trên bên phải trình duyệt.
4. Chọn **"Thêm vào Màn hình chính" (Add to Home screen)** hoặc **"Cài đặt ứng dụng"**.
5. Bây giờ bạn có thể mở ứng dụng độc lập toàn màn hình như một App Native, dùng bàn phím phụ để gõ lệnh `htop`, `tail -f`, `systemctl` cực kỳ mượt mà.

---

## 🛡️ Lưu Ý Quan Trọng Về An Ninh & Bảo Mật

1. **Bảo vệ file `.env`**: Tuyệt đối không commit file `.env` chứa `JWT_SECRET`, mật khẩu hoặc `GEMINI_API_KEY` lên các kho lưu trữ mã nguồn công khai (GitHub/GitLab).
2. **Cấu hình Tường lửa (UFW)**: 
   - Chỉ nên mở cổng `80` (HTTP) và `443` (HTTPS) ra Internet.
   - Cổng nội bộ `5000` của Backend nên được bảo vệ đằng sau Reverse Proxy của Nginx (hoặc chỉ cho phép kết nối qua VPN).
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```
3. **An toàn SSH**: Mật khẩu SSH chỉ được truyền qua kết nối Socket bảo mật và không bao giờ lưu trữ vĩnh viễn ở máy khách (Client-side).
4. **Giới hạn quyền của AI (Safe AI Boundary)**: AI chỉ có quyền **đọc log** và **đưa ra giải thích/gợi ý**. Người dùng luôn là người trực tiếp xem xét, sao chép và tự quyết định thực thi lệnh trên hệ thống.

---

## 📄 Giấy Phép & Đóng Góp (License)

Dự án được phát hành theo giấy phép **MIT License**. Mọi đóng góp, báo lỗi (issue) và yêu cầu tính năng mới (pull request) đều được hoan nghênh!
