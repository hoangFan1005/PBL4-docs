# 04 — Web server & App thương mại điện tử (PHP)

> **Người đọc chính: B (Linux/Web).** Mục tiêu: dựng LEMP (nginx + PHP-FPM +
> MariaDB), viết một shop PHP **có trang đăng nhập thật**, và — quan trọng nhất cho
> đồ án — cấu hình nginx **ghi access log JSON** + app **ghi log sự kiện đăng nhập**
> để hệ thống giám sát có dữ liệu tốt.

## Mục tiêu chương
- Hiểu vai trò nginx ↔ PHP-FPM ↔ MariaDB và luồng xử lý một request PHP.
- Thiết kế một shop tối thiểu: sản phẩm, giỏ hàng, **đăng nhập/đăng ký**.
- Cấu hình nginx ghi **log JSON** (dễ đưa vào ELK, không cần grok).
- Ghi **application log** phân biệt `login_success` / `login_failed` — tín hiệu vàng
  để phát hiện brute-force ([chương 09](09-phat-hien-bat-thuong.md)).
- Bật HTTPS cho trang login.

## Cần biết gì trước
- [01 Mạng](01-nen-tang-mang.md) (HTTP, port, TLS), [02 Linux](02-linux-co-ban.md) (systemd, quyền, /var/log).
- Máy `[EC2-WEB]` đã tạo xong ([chương 03](03-cloud-va-aws.md)).

---

## 1. LEMP là gì và mỗi mảnh làm gì

LEMP = **L**inux + **E**nginx ("engine-x") + **M**ariaDB/MySQL + **P**HP.

```
Trình duyệt ──HTTP──► nginx ──(FastCGI)──► PHP-FPM ──(SQL)──► MariaDB
                        │  (nginx trả file tĩnh: ảnh, css, js)
                        │  (nginx GHI access log ← nguồn dữ liệu giám sát)
```

- **nginx**: web server. Nhận HTTP, trả file tĩnh trực tiếp, còn request PHP thì
  chuyển cho PHP-FPM. **Đây là nơi sinh access log.**
- **PHP-FPM** (FastCGI Process Manager): tiến trình chạy code PHP. nginx tự nó không
  chạy PHP; nó "nhờ" PHP-FPM qua socket.
- **MariaDB**: cơ sở dữ liệu (bản mã nguồn mở tương thích MySQL). Lưu user, sản phẩm.

**Vì sao nginx (không phải Apache):** nginx có `log_format ... escape=json` sinh
**JSON hợp lệ chắc chắn** chỉ bằng một khai báo; Apache không escape JSON nên ký tự
`"`/`\` trong User-Agent có thể làm hỏng dòng JSON. Log JSON giúp ELK khỏi phải
"grok" (regex dễ vỡ) — xem mục 4.

---

## 2. Cài LEMP

```bash
# [EC2-WEB]
sudo apt update
sudo apt install -y nginx php-fpm php-mysql mariadb-server
sudo systemctl enable --now nginx php8.3-fpm mariadb   # tên gói php-fpm tuỳ phiên bản; kiểm tra bằng: systemctl list-units | grep fpm
sudo mysql_secure_installation                          # đặt mật khẩu root DB, gỡ tài khoản ẩn danh
```

Tạo database & user cho shop:
```bash
# [EC2-WEB]
sudo mariadb <<'SQL'
CREATE DATABASE shop CHARACTER SET utf8mb4;
CREATE USER 'shopuser'@'localhost' IDENTIFIED BY 'DOI_MAT_KHAU_NAY';
GRANT ALL PRIVILEGES ON shop.* TO 'shopuser'@'localhost';
FLUSH PRIVILEGES;
SQL
```

> **Bảo mật:** MariaDB chỉ nghe `localhost` (mặc định), **không mở port 3306 ra
> Internet**. App PHP nói chuyện DB qua `localhost`. Đây cũng là lý do không cần luật
> Security Group cho 3306.

---

## 3. Thiết kế App shop tối thiểu (nhóm B tự hoàn thiện code)

> Tài liệu đưa **thiết kế + các đoạn quan trọng**; phần code còn lại nhóm B tự viết —
> đây là phần "thể hiện năng lực" nên không làm hộ hoàn toàn.

**Yêu cầu chức năng tối thiểu (đủ để có luồng truy cập + login thật):**
- Trang chủ liệt kê sản phẩm (`GET /`), chi tiết sản phẩm (`GET /product.php?id=..`).
- Đăng ký (`GET/POST /register.php`) và **đăng nhập** (`GET/POST /login.php`).
- Giỏ hàng đơn giản trong session (`POST /cart.php`).
- Trang tài khoản chỉ vào được sau khi đăng nhập (`GET /account.php`).
- Một endpoint health cho giám sát: `GET /health` → trả `200 OK`.

**Schema DB tối thiểu:**
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- LUÔN dùng password_hash(), không lưu plaintext
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255), price INT, description TEXT
);
```

**Đoạn xử lý đăng nhập — QUAN TRỌNG cho giám sát.** Điểm mấu chốt: khi login thất
bại/thành công, app **ghi một dòng log JSON riêng** (application log). Access log
của nginx không phân biệt được "mật khẩu sai" với "vào trang login bình thường"
(đều là `POST /login.php` → thường trả `200`); còn app thì biết. Log này giúp
[chương 09](09-phat-hien-bat-thuong.md) phát hiện brute-force chính xác hơn nhiều.

```php
<?php // login.php (rút gọn phần cốt lõi)
session_start();
require 'db.php'; // cung cấp $pdo (PDO tới MariaDB qua localhost)

function log_auth(string $event, string $email): void {
    $line = json_encode([
        'time'        => date('c'),                         // ISO8601
        'log_type'    => 'app_auth',
        'event'       => $event,                            // login_success | login_failed
        'email'       => $email,
        // Mặc định dùng REMOTE_ADDR (IP thật khi khách vào thẳng). CHỈ ưu tiên XFF khi
        // có proxy tin cậy đứng trước — tin XFF vô điều kiện là để kẻ tấn công tự bịa IP
        // (xem CONTRACT §4). Demo GeoIP dùng XFF thì bật có kiểm soát ở nginx (set_real_ip_from).
        'client_ip'   => $_SERVER['REMOTE_ADDR'],
        'user_agent'  => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'path'        => $_SERVER['REQUEST_URI'] ?? '',
    ], JSON_UNESCAPED_SLASHES);
    file_put_contents('/var/log/shop/auth.json.log', $line."\n", FILE_APPEND);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $pass  = $_POST['password'] ?? '';
    $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password_hash'])) {
        $_SESSION['uid'] = $user['id'];
        log_auth('login_success', $email);
        header('Location: /account.php', true, 302);   // thành công → 302 chuyển hướng
        exit;
    } else {
        log_auth('login_failed', $email);
        http_response_code(401);                        // thất bại → 401 (dễ nhận diện trong log)
        // hiển thị lại form với thông báo lỗi
    }
}
```

> **Hai mẹo thiết kế "thân thiện giám sát":**
> 1. Trả **`401`** khi đăng nhập sai (thay vì `200` như WordPress). Khi đó chỉ cần
>    đếm `POST /login.php` với `status=401` theo IP là ra brute-force ngay trong
>    access log, chưa cần app log.
> 2. Chuẩn bị sẵn thư mục log cho app: `sudo mkdir -p /var/log/shop && sudo chown www-data:www-data /var/log/shop`.

Nạp dữ liệu mẫu vài chục sản phẩm để trang có nội dung khi demo.

---

## 4. Cấu hình nginx: server block + ACCESS LOG JSON

Đây là cấu hình **trung tâm của đồ án** — nguồn dữ liệu cho toàn bộ hệ thống giám sát.

Trong `/etc/nginx/nginx.conf`, bên trong khối `http { ... }`, khai báo format JSON:

```nginx
# [EC2-WEB]  /etc/nginx/nginx.conf  (trong http {})
log_format json_analytics escape=json
  '{'
    '"time":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"x_forwarded_for":"$http_x_forwarded_for",'
    '"host":"$host",'
    '"method":"$request_method",'
    '"uri":"$request_uri",'
    '"protocol":"$server_protocol",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_length":$request_length,'
    '"request_time":$request_time,'
    '"referer":"$http_referer",'
    '"user_agent":"$http_user_agent"'
  '}';
```

Server block cho shop (`/etc/nginx/sites-available/shop`, rồi symlink sang `sites-enabled`):

```nginx
# [EC2-WEB]  /etc/nginx/sites-available/shop
server {
    listen 80;
    server_name _;                       # tạm chấp mọi tên; đổi thành domain nếu có
    root /var/www/shop;
    index index.php;

    access_log /var/log/nginx/access.json.log json_analytics;   # ← ghi JSON
    error_log  /var/log/nginx/error.log;

    location / { try_files $uri $uri/ /index.php?$query_string; }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;   # khớp phiên bản php-fpm
    }
    location = /health { return 200 "ok\n"; }
    location ~ /\.ht { deny all; }
}
```

Kích hoạt & kiểm tra cú pháp:
```bash
# [EC2-WEB]
sudo ln -s /etc/nginx/sites-available/shop /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t          # LUÔN test cú pháp trước khi reload
sudo systemctl reload nginx
```

**Vì sao các trường số để không có dấu ngoặc kép** (`"status":$status` chứ không
`"$status"`): để Elasticsearch nhận đúng **kiểu số**, cho phép lọc theo khoảng
(`status >= 400`) và tính toán. Trường chuỗi thì có ngoặc kép.

**Vì sao log JSON thay vì `combined` mặc định:** JSON là cặp khoá–giá trị tự mô tả,
có kiểu rõ ràng → Logstash chỉ cần một filter `json` (mục [chương 06](06-thu-thap-va-xu-ly-log.md)).
Log `combined` là văn bản thô → phải viết **grok** (regex) khớp đúng từng khoảng
trắng; chỉ cần thêm một trường hay giá trị có dấu cách/ngoặc là **vỡ** (`_grokparsefailure`),
dashboard trống. Đây là lỗi kinh điển khiến "cấu hình xong mà không thấy gì".

---

## 5. Ghi ĐÚNG IP khách khi có proxy/load balancer

Nếu sau này đặt web sau một proxy/CDN/ELB, `$remote_addr` sẽ là IP của proxy, không
phải khách → GeoIP định vị nhầm về nơi đặt proxy. Cách xử lý (module `realip`):

```nginx
# [EC2-WEB]  chỉ dùng khi có proxy tin cậy đứng trước
set_real_ip_from 10.0.0.0/16;     # dải VPC/proxy tin cậy
real_ip_header   X-Forwarded-For;
real_ip_recursive on;
```

Trong đồ án cơ bản (khách vào thẳng EC2), `$remote_addr` đã là IP thật của khách —
tốt. Nhưng ta **vẫn log `x_forwarded_for`** vì phần demo GeoIP sẽ **chèn
X-Forwarded-For giả lập** để giả nhiều quốc gia ([chương 10](10-kiem-thu-va-demo.md)).
Khi đó ELK sẽ ưu tiên lấy IP từ `x_forwarded_for` để tra GeoIP.

---

## 6. HTTPS cho trang đăng nhập

Trang login gửi mật khẩu → nên mã hoá. Ba mức, chọn theo điều kiện:

| Cách | Khi nào dùng | Nhược điểm |
|---|---|---|
| **Self-signed** (`openssl`) | Không có tên miền; demo nội bộ | Trình duyệt cảnh báo "not secure" (bấm qua được) |
| **Let's Encrypt + DuckDNS** (khuyến nghị nếu có thời gian) | Có subdomain miễn phí `ten.duckdns.org` trỏ về IP EC2 | Cần đăng ký DuckDNS; chứng chỉ 90 ngày (certbot tự gia hạn) |
| **Let's Encrypt + domain thật** | Nhóm có sẵn tên miền | Tốn tiền mua domain |

Ví dụ Let's Encrypt (khi đã có tên miền/subdomain trỏ đúng IP):
```bash
# [EC2-WEB]
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ten.duckdns.org      # tự sửa nginx sang 443 + gia hạn tự động
```

> **Nhớ:** Let's Encrypt **không cấp chứng chỉ cho IP trần** hay tên
> `*.amazonaws.com` (AWS sở hữu) — phải có tên miền bạn kiểm soát. HTTPS **không đổi
> nội dung access log**, chỉ bảo vệ đường truyền.

---

## Cách tự kiểm tra đã đúng
```bash
# [EC2-WEB]
curl -I http://localhost/health                 # kỳ vọng 200
curl -s http://localhost/ >/dev/null            # tạo 1 request
sudo tail -n 1 /var/log/nginx/access.json.log   # dòng cuối phải là JSON hợp lệ
sudo tail -n 1 /var/log/nginx/access.json.log | python3 -m json.tool   # parse thử, không lỗi = JSON đúng
```
- Thử đăng nhập sai → kiểm tra `/var/log/shop/auth.json.log` có dòng `login_failed`
  và access log có `POST /login.php` với `"status":401`.
- Từ `[máy cá nhân]`, mở `http://<PUBLIC_IP>/` xem web hiện (SG đã mở 80 chưa?).

## Lỗi thường gặp
- `502 Bad Gateway` → sai đường dẫn `fastcgi_pass` (tên socket php-fpm không khớp
  phiên bản). Kiểm tra: `ls /run/php/`.
- Access log **không phải JSON** → quên gán `json_analytics` ở `access_log`, hoặc
  chỉnh sai khối. Chạy `nginx -t` + `reload`.
- Trang trắng/500 → lỗi PHP; xem `sudo tail -f /var/log/php*-fpm.log` và bật hiển thị lỗi khi dev.
- Log ghi IP `127.0.0.1` hoặc IP proxy thay vì khách → xem mục 5 (realip / X-Forwarded-For).

## References (ưu tiên tiếng Anh)
- nginx `ngx_http_log_module` (log_format, escape=json) — https://nginx.org/en/docs/http/ngx_http_log_module.html
- nginx `ngx_http_realip_module` — https://nginx.org/en/docs/http/ngx_http_realip_module.html
- nginx configuring HTTPS servers — https://nginx.org/en/docs/http/configuring_https_servers.html
- PHP `password_hash` / `password_verify` — https://www.php.net/manual/en/function.password-hash.php
- PHP PDO (prepared statements chống SQLi) — https://www.php.net/manual/en/book.pdo.php
- MariaDB Knowledge Base — https://mariadb.com/kb/en/documentation/
- Let's Encrypt — https://letsencrypt.org/ · Certbot — https://certbot.eff.org/ · DuckDNS — https://www.duckdns.org/
- OWASP Top 10 (2025) — https://owasp.org/Top10/2025/ · OWASP Logging Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

> **Đối chiếu thuật ngữ:** web server · reverse proxy = proxy đảo chiều · access log
> = nhật ký truy cập · application log = log tầng ứng dụng · prepared statement =
> câu lệnh tham số hoá · certificate = chứng chỉ. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
