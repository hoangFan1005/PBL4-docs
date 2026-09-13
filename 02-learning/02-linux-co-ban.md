# 02 — Linux cơ bản (đủ để vận hành server)

> **Chương này dành cho ai:** chủ yếu bạn **B (Linux/Web)**, nhưng cả A và C đều cần
> vì mọi máy trong đồ án đều là Linux. Mục tiêu: đủ Linux để **đăng nhập server,
> cài phần mềm, chỉnh cấu hình, đọc log, khởi động dịch vụ, và không tự khoá mình ra
> ngoài**. Không dạy Linux hàn lâm — chỉ những gì đồ án dùng.

## Mục tiêu chương
- Di chuyển trong hệ thống file, hiểu quyền (permissions) và vì sao `chmod 400` cho khoá SSH.
- Dùng `systemd` để bật/tắt/xem trạng thái dịch vụ (nginx, php-fpm, elasticsearch...).
- Cài phần mềm bằng `apt`; đọc log ở `/var/log`; hiểu `journalctl`.
- Cấu hình SSH an toàn và tường lửa host `ufw` (bổ trợ cho Security Group).

## Cần biết gì trước
- [Chương 01 — Nền tảng mạng](01-nen-tang-mang.md) (đặc biệt phần port, SSH, stateful firewall).

---

## 1. Vì sao Linux, vì sao Ubuntu 24.04 LTS

Server trên cloud gần như luôn là Linux (miễn phí, nhẹ, điều khiển từ xa tốt qua
dòng lệnh). Nhóm chọn **Ubuntu Server 24.04 LTS**:

- **`apt`** là trình quản lý gói dễ nhất cho người mới, và **kho tutorial tiếng Anh
  nhiều nhất** viết theo Ubuntu.
- **`ufw`** — tường lửa host đơn giản (một dòng lệnh mở/đóng port).
- Không có SELinux "enforcing" gây bẫy khó hiểu cho người mới (Ubuntu dùng AppArmor,
  mặc định không chặn các thao tác của đồ án).
- **LTS = Long Term Support**, hỗ trợ tới **2029** — thừa cho một đồ án.

> Lựa chọn thay thế: **Amazon Linux 2023** (tích hợp AWS sâu nhất, dùng `dnf`). Là
> runner-up hợp lý nếu nhóm quen RPM. Nhóm không chọn vì ít tutorial hợp người mới hơn.

---

## 2. Hệ thống file Linux — bản đồ những thư mục bạn sẽ đụng tới

Linux xếp mọi thứ dưới một gốc `/` (root). Bạn **không cần** thuộc hết; chỉ cần nhớ
vài chỗ hay dùng:

| Đường dẫn | Chứa gì | Bạn đụng tới khi |
|---|---|---|
| `/etc` | File **cấu hình** của hệ thống & phần mềm | Sửa config nginx, ssh, logstash |
| `/etc/nginx/` | Cấu hình nginx | [chương 04](04-web-server-va-app.md) |
| `/var/log/` | **Log** của hệ thống & dịch vụ | Đọc access log, debug |
| `/var/www/` | Mã nguồn website (theo quy ước) | Đặt app PHP |
| `/home/ubuntu/` | Thư mục cá nhân của user `ubuntu` | Nơi bạn "đứng" khi vừa SSH vào |
| `/etc/systemd/system/` | Định nghĩa dịch vụ tuỳ biến | Nếu tự viết service |

**Analogy:** `/etc` = tủ hồ sơ cấu hình; `/var/log` = nhật ký; `/var/www` = kho hàng
web; `/home` = bàn làm việc của bạn.

Vài lệnh di chuyển tối thiểu: `pwd` (đang ở đâu), `ls -la` (liệt kê, cả file ẩn),
`cd /etc/nginx` (đi tới), `cat file` (xem nội dung), `less file` (xem cuộn, thoát
bằng `q`), `sudo nano file` (sửa file bằng quyền admin).

---

## 3. Quyền (permissions) — và bí ẩn `chmod 400`

Mỗi file có quyền cho 3 nhóm: **user (chủ) – group (nhóm) – others (còn lại)**, mỗi
nhóm gồm **r (read=4) – w (write=2) – x (execute=1)**. Cộng số lại thành một chữ số:

- `7 = rwx` (đọc+ghi+chạy) · `6 = rw-` · `5 = r-x` · `4 = r--` · `0 = ---`

Ví dụ `chmod 640 file` → chủ `rw-`, nhóm `r--`, others `---`.

**Vì sao khoá SSH cần `chmod 400`:** khi bạn tải file khoá riêng `.pem` từ AWS,
SSH **từ chối dùng nếu file quá "mở"** (người khác trên máy đọc được khoá riêng là
mất an toàn). `chmod 400 key.pem` = "chỉ mình chủ được đọc, không ai khác". Nếu
không, bạn sẽ gặp lỗi kinh điển:

```
WARNING: UNPROTECTED PRIVATE KEY FILE!  Permissions 0644 for 'key.pem' are too open.
```
→ Sửa: `chmod 400 key.pem`.

`chown user:group file` đổi chủ sở hữu; bạn sẽ dùng để giao thư mục web cho user của
nginx (thường `www-data`): `sudo chown -R www-data:www-data /var/www/shop`.

`sudo` = chạy lệnh với quyền quản trị (root). Trên Ubuntu EC2, user `ubuntu` được
phép `sudo` không cần mật khẩu.

---

## 4. systemd — bật/tắt/giám sát dịch vụ

Mọi dịch vụ lớn (nginx, php-fpm, mariadb, elasticsearch, kibana, logstash,
filebeat) chạy dưới **systemd**. Bạn điều khiển bằng `systemctl`:

```bash
sudo systemctl status nginx      # xem đang chạy không, log lỗi gần nhất
sudo systemctl start nginx       # khởi động
sudo systemctl stop nginx        # dừng
sudo systemctl restart nginx     # khởi động lại (sau khi sửa config)
sudo systemctl reload nginx      # nạp lại config, không ngắt kết nối (nếu dịch vụ hỗ trợ)
sudo systemctl enable nginx      # bật tự chạy khi máy khởi động lại  ← RẤT QUAN TRỌNG
```

> **Bẫy hay gặp:** cấu hình xong nhưng **quên `enable`** → sau khi *stop* EC2 để
> tiết kiệm tiền rồi *start* lại, dịch vụ không tự lên, "web chết" mà không hiểu vì
> sao. Luôn `enable` mọi dịch vụ.

Xem log của một dịch vụ (systemd tự thu log qua **journald**):
```bash
sudo journalctl -u nginx -n 100 --no-pager   # 100 dòng log cuối của nginx
sudo journalctl -u elasticsearch -f          # theo dõi trực tiếp (thoát Ctrl+C)
```

**Analogy:** `systemctl` giống bảng điều khiển bật/tắt từng thiết bị điện trong nhà;
`journalctl` là camera ghi lại thiết bị đó đã kêu gì khi hỏng.

---

## 5. Cài phần mềm với `apt`

```bash
sudo apt update                       # cập nhật danh sách gói (làm trước mỗi lần cài)
sudo apt install -y nginx             # cài nginx
sudo apt upgrade -y                   # nâng cấp các gói đã cài (tuỳ chọn)
apt list --installed | grep nginx     # kiểm tra đã cài chưa
```

Một số phần mềm (Elasticsearch, Logstash, Kibana, Filebeat) không có sẵn trong kho
Ubuntu; bạn phải **thêm kho APT của Elastic** rồi mới `apt install` — lệnh cụ thể
(GPG key + repo + cài) ở [chương 06 §0](06-thu-thap-va-xu-ly-log.md#0-cài-đặt-elastic-stack-kho-apt--làm-đầu-tiên).

**Analogy:** `apt` giống "App Store" dòng lệnh; `apt update` = làm mới danh mục;
`apt install` = tải & cài.

---

## 6. Log ở đâu — trái tim của đồ án giám sát

Toàn bộ đồ án xoay quanh **log**, nên nắm chỗ này:

| File/nguồn | Nội dung |
|---|---|
| `/var/log/nginx/access.log` | (mặc định) mỗi dòng = 1 request web |
| `/var/log/nginx/access.json.log` | (ta sẽ tạo) access log **định dạng JSON** — nguồn cho ELK |
| `/var/log/nginx/error.log` | lỗi của nginx |
| `/var/log/auth.log` | đăng nhập SSH (thành công/thất bại) — cũng là dữ liệu giám sát! |
| `journalctl -u <service>` | log của dịch vụ chạy dưới systemd |

Lệnh đọc log hữu ích:
```bash
sudo tail -f /var/log/nginx/access.json.log   # xem log chảy theo thời gian thực
sudo grep '"status":404' /var/log/nginx/access.json.log | wc -l   # đếm số 404
```

**logrotate**: log để lâu sẽ đầy đĩa. Ubuntu cài sẵn `logrotate` tự cắt/nén log
định kỳ (cấu hình ở `/etc/logrotate.d/`). Bạn thường không phải chỉnh, nhưng nên
biết nó tồn tại để giải thích "vì sao log cũ tự nén lại".

---

## 7. SSH — đăng nhập server và cấu hình an toàn

SSH (Secure Shell) là cách bạn điều khiển EC2 từ máy cá nhân. AWS cho bạn một cặp
**key pair**: phần **công khai** nằm trên server, phần **riêng** (`.pem`) nằm ở máy
bạn — giữ bí mật. (Cơ chế cặp khoá công khai/riêng: xem [chương 03](03-cloud-va-aws.md).)

Đăng nhập:
```bash
# [máy cá nhân]  (macOS/Linux)
chmod 400 my-key.pem
ssh -i my-key.pem ubuntu@<PUBLIC_IP_CUA_EC2>
```
(`ubuntu` là user mặc định của AMI Ubuntu; Amazon Linux là `ec2-user`.)

> **💻 Nếu máy cá nhân chạy Windows (RK13):** Windows **không có `chmod`**. Hai lựa chọn:
> - **WSL / Git Bash** (khuyến nghị): mở "Ubuntu on WSL" hoặc Git Bash rồi dùng đúng
>   các lệnh `chmod 400` + `ssh` như trên (giống Linux).
> - **PowerShell thuần:** dùng `icacls` để siết quyền khoá:
>   ```powershell
>   icacls my-key.pem /inheritance:r
>   icacls my-key.pem /grant:r "$($env:USERNAME):(R)"
>   ssh -i my-key.pem ubuntu@<PUBLIC_IP>
>   ```
> Cả nhóm nên thống nhất **một môi trường** (WSL là dễ đồng bộ nhất với tài liệu này).

**Làm cứng (harden) SSH** — sửa `/etc/ssh/sshd_config` (chi tiết hardening ở
[chương 11](11-bao-mat-van-hanh-chi-phi.md)):
```
PermitRootLogin no            # cấm đăng nhập thẳng bằng root
PasswordAuthentication no     # chỉ cho vào bằng khoá, cấm mật khẩu (chặn brute-force)
```
Sau khi sửa: `sudo systemctl restart ssh`.

> **⚠️ Bẫy tự khoá mình:** đừng đặt `PasswordAuthentication no` **trước khi** chắc
> chắn khoá SSH của bạn hoạt động, và **đừng đóng port 22 trong Security Group khi
> đang là đường vào duy nhất**. Luôn giữ **một phiên SSH đang mở** khi thử nghiệm
> cấu hình mạng, để còn đường sửa. AWS còn có **EC2 Instance Connect** làm đường vào
> dự phòng qua trình duyệt ([chương 03](03-cloud-va-aws.md)).

---

## 8. Tường lửa host `ufw` — lớp phòng thủ thứ hai

> **⚠️ Lưu ý:** đây là **bài tập tuỳ chọn để hiểu khái niệm**. Trong bản triển khai
> cuối, nhóm **KHÔNG bật `ufw`** trên các EC2 (chỉ dựa vào Security Group) — lý do
> phân tích ở [11 §2](11-bao-mat-van-hanh-chi-phi.md#2-quyết-định-ufw-và-fail2ban).
> Đọc mục này để hiểu, nhưng đừng bật trên máy thật trừ khi cả nhóm đã quyết.

AWS Security Group đã là một tường lửa (ở tầng mạng AWS, *trước* khi tới máy). `ufw`
là tường lửa **trên chính máy** — lớp phòng thủ theo chiều sâu (defense-in-depth).

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp            # SSH
sudo ufw allow 80,443/tcp        # web
sudo ufw enable
sudo ufw status verbose
```

> **⚠️ Bẫy:** bật `ufw` mà **quên `allow 22`** = tự khoá mình khỏi SSH. Luôn cho
> phép 22 **trước** khi `enable`. Nếu lỡ, dùng EC2 Instance Connect / Serial Console
> để vào sửa.

Quan hệ với Security Group: coi SG là "cổng ngoài khu phố" (chặn sớm, rẻ), `ufw` là
"khoá cửa từng nhà". Hai lớp độc lập; một port muốn thông thì **cả hai** phải mở.
Trong đồ án, để đơn giản có thể chỉ dựa vào SG, nhưng nêu được `ufw` cho thấy hiểu
defense-in-depth.

---

## 9. Vài lệnh chẩn đoán bạn sẽ cần khi "sao không chạy"

```bash
ip a                       # xem địa chỉ IP của các card mạng (thấy private IP 10.0.x)
ss -tlnp                   # xem dịch vụ nào đang lắng nghe port nào
curl -I http://localhost   # tự gọi web của chính mình, xem status trả về
curl http://localhost/health
dig shop.example.com       # tra DNS → IP
df -h                      # đĩa còn trống bao nhiêu (ES sẽ chết nếu đầy đĩa!)
free -h                    # RAM còn bao nhiêu (quan trọng với ELK)
top    /    htop           # tiến trình nào ngốn CPU/RAM
journalctl -xe             # log hệ thống gần nhất khi có sự cố
```

> **Quy trình debug 3 câu hỏi khi một dịch vụ "chết":** (1) Nó có chạy không?
> `systemctl status`. (2) Nó có nghe đúng port không? `ss -tlnp`. (3) Nó ghi lỗi
> gì? `journalctl -u <service>` hoặc file trong `/var/log`. Áp dụng đúng thứ tự
> này cho mọi dịch vụ trong đồ án.

---

## Cách tự kiểm tra đã hiểu
1. Sau khi sửa `/etc/nginx/nginx.conf`, dùng lệnh gì để áp dụng mà không rớt kết nối?
2. `chmod 400 key.pem` bảo vệ điều gì, và bỏ qua nó sẽ gặp lỗi gì?
3. EC2 vừa *start* lại nhưng nginx không tự lên — bạn quên bước nào?
4. Muốn xem 50 dòng access log mới nhất theo thời gian thực, gõ gì?
5. Bật `ufw` mà mất SSH — nguyên nhân nhiều khả năng nhất là gì?

## Lỗi thường gặp
- `Permission denied (publickey)` khi SSH → sai file khoá, sai user (`ubuntu` vs
  `ec2-user`), hoặc chưa `chmod 400`, hoặc SG chưa mở 22 cho IP của bạn.
- Sửa config nhưng **quên restart** dịch vụ → thay đổi không có tác dụng.
- Đĩa đầy (`df -h` = 100%) → Elasticsearch chuyển index sang chỉ-đọc, log ngừng vào.
  Dọn log cũ / tăng dung lượng ([chương 11](11-bao-mat-van-hanh-chi-phi.md)).

## References (ưu tiên tiếng Anh)
- *The Linux Command Line* — William Shotts (sách miễn phí) — https://linuxcommand.org/tlcl.php
- Linux Journey (học tương tác) — https://linuxjourney.com/
- Linux Foundation LFS101 *Introduction to Linux* (miễn phí trên edX) — https://training.linuxfoundation.org/training/introduction-to-linux/
- Ubuntu Server documentation — https://documentation.ubuntu.com/server/
- systemd `systemctl` / `journalctl` man pages — https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- OpenSSH `sshd_config` manual — https://man.openbsd.org/sshd_config · Mozilla OpenSSH guidelines — https://infosec.mozilla.org/guidelines/openssh
- Ubuntu UFW community help — https://help.ubuntu.com/community/UFW

> **Đối chiếu thuật ngữ:** permission = quyền · owner/group = chủ/nhóm · service =
> dịch vụ · package manager = trình quản lý gói · harden = làm cứng bảo mật · host
> firewall = tường lửa trên máy. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
