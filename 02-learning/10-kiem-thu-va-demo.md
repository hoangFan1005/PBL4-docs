# 10 — Kiểm thử & Demo (how-to)

> **Người đọc chính: cả nhóm (C dẫn về đo, B dẫn về sinh tấn công).** Chương này là
> *cách làm cụ thể*: đo baseline, sinh traffic thường & tấn công, giả lập đa dạng IP
> cho GeoIP, và đo độ trễ phát hiện. Kế hoạch & bằng chứng (E-ID) nằm ở
> [GĐ3](../01-work-breakdown/03-giai-doan-3-kiem-thu-demo-baocao.md); chương này cung
> cấp lệnh chạy.

## Mục tiêu chương
- Đo **baseline** đúng phương pháp để suy ra ngưỡng rule.
- Sinh traffic thường (k6/curl) và traffic tấn công (hydra/ffuf/sqlmap) **hợp pháp,
  chỉ nhắm hạ tầng của nhóm**.
- Giả lập **đa dạng quốc gia** cho demo GeoIP một cách trung thực.
- Chạy **negative control** và đo **độ trễ phát hiện**.

## Cần biết gì trước
- [09 Phát hiện bất thường](09-phat-hien-bat-thuong.md) (biết mỗi rule tìm tín hiệu gì).
- Hệ thống đã chạy: log chảy vào Kibana ([06](06-thu-thap-va-xu-ly-log.md)), dashboard có ([08](08-kibana-dashboard.md)).

> ⚖️ **Ghi chú đạo đức/pháp lý:** mọi công cụ tấn công dưới đây chỉ được chạy nhắm
> vào **chính EC2 của nhóm**, trong lab của nhóm, với mục đích kiểm thử phòng thủ.
> Không nhắm vào bất kỳ hệ thống nào khác.
>
> 🔒 **Nếu dùng chứng chỉ self-signed** (không phải Let's Encrypt — xem [04 §6](04-web-server-va-app.md#6-https-cho-trang-đăng-nhập)):
> thêm `-k`/`--insecure` cho `curl`, `-k` cho `hydra` (scheme `https-post-form`), và
> `--force-ssl`/bỏ verify tuỳ công cụ; nếu không sẽ gặp lỗi "certificate verify failed".
> Với Let's Encrypt (chứng chỉ tin cậy) thì không cần.

---

## 1. Máy Tester

| Máy | Vai trò | Ghi chú |
|---|---|---|
| `[EC2-TESTER]` | sinh traffic + tấn công; đặt **region khác** để có IP nước ngoài thật | `t3.micro` đủ; tắt khi không dùng |
| `[máy cá nhân]` | chạy k6/curl, điều khiển | |

Cài công cụ trên tester:
```bash
# [EC2-TESTER]  (Ubuntu)
sudo apt update
sudo apt install -y curl apache2-utils hydra nikto ffuf sqlmap   # ab nằm trong apache2-utils
# WORDLIST cho hydra/ffuf/gobuster (KHÔNG có sẵn trên Ubuntu Server):
sudo apt install -y wordlists dirb seclists 2>/dev/null || true
#   → cung cấp /usr/share/wordlists/rockyou.txt.gz (giải nén: gunzip -k /usr/share/wordlists/rockyou.txt.gz)
#     và /usr/share/wordlists/dirb/common.txt
# Nếu gói 'wordlists' không có trong kho: tải trực tiếp
#   curl -sLo common.txt https://raw.githubusercontent.com/v0re/dirb/master/wordlists/common.txt
# k6 (theo hướng dẫn chính thức): https://grafana.com/docs/k6/latest/set-up/install-k6/
```

---

## 2. Bước 1 — Đo BASELINE (làm TRƯỚC mọi tấn công)

Chạy traffic **giống người dùng thật** ≥30–60 phút rồi đo 5 chỉ số. Đây là căn cứ
đặt ngưỡng rule.

Script traffic thường bằng k6 (mô phỏng duyệt shop + đăng nhập đúng):
```javascript
// [máy cá nhân] normal.js  — chạy: k6 run --vus 10 --duration 30m normal.js
import http from 'k6/http';
import { sleep } from 'k6';
const BASE = 'https://shop.duckdns.org';
export default function () {
  http.get(`${BASE}/`);
  http.get(`${BASE}/product.php?id=${Math.floor(Math.random()*50)+1}`);
  // đăng nhập ĐÚNG (tài khoản test hợp lệ)
  http.post(`${BASE}/login.php`, { email: 'test@shop.local', password: 'CorrectHorse1' });
  sleep(Math.random() * 3 + 1);   // nghỉ 1–4s như người thật
}
```

Đo 5 chỉ số trong Kibana (khoảng thời gian baseline):
| Chỉ số | Cách đo (Kibana/Discover/Lens) | Ghi lại |
|---|---|---|
| Request/phút (trung bình & đỉnh) | Lens: count theo `@timestamp` (bucket 1m) | vd 40–120/phút |
| Tỉ lệ 4xx | count(status≥400)/count(all) | vd 2–5% |
| Số IP nguồn duy nhất | cardinality `source.ip` | vd 8–12 |
| Top-10 URL | terms `url.path` | danh sách |
| Phân bố user-agent | terms `user_agent.name` | chủ yếu trình duyệt |

→ Lưu thành bảng **E9**. Ngưỡng rule ở [09](09-phat-hien-bat-thuong.md) phải **trỏ về
các con số này** (vd "flood = req/phút/IP > đỉnh baseline × 5").

---

## 3. Bước 2 — Sinh traffic TẤN CÔNG (mỗi loại khớp 1 rule)

Ghi lại **giờ bắt đầu/kết thúc** mỗi lần chạy để đối chiếu với thời điểm rule kích hoạt (E11).

**Brute-force login (Rule 1):**
```bash
# [EC2-TESTER]  50 lần thử mật khẩu sai cho 1 user
hydra -l admin@shop.local -P /usr/share/wordlists/rockyou.txt \
  shop.duckdns.org https-post-form \
  "/login.php:email=^USER^&password=^PASS^:F=401" -t 4 -W 1
```
(hoặc k6 lặp `POST /login.php` với mật khẩu sai → sinh nhiều `status:401` + `event.action:login_failed`.)

**Quét thư mục 404 (Rule 3):**
```bash
# [EC2-TESTER]
ffuf -u https://shop.duckdns.org/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc all
# → hàng loạt url.path khác nhau, phần lớn status 404
```

**Dò SQLi/XSS (Rule 4 & 5):**
```bash
# [EC2-TESTER]  sqlmap tự sinh nhiều payload có ký tự ', ", --, UNION...
sqlmap -u "https://shop.duckdns.org/product.php?id=1" --batch --level=2
# và vài payload thủ công để chắc chắn có ký tự " trong url.query:
curl -s 'https://shop.duckdns.org/product.php?id=1%22%20OR%201=1--' -o /dev/null
curl -s 'https://shop.duckdns.org/search.php?q=<script>alert(1)</script>' -o /dev/null
curl -s 'https://shop.duckdns.org/../../etc/passwd' -o /dev/null
```
(User-agent `sqlmap/...`, `ffuf/...` cũng kích hoạt **Rule 5 scanner UA**.)

**Flood request (Rule 6):**
```bash
# [EC2-TESTER]
ab -n 5000 -c 50 https://shop.duckdns.org/
```

---

## 4. Bước 3 — Đa dạng IP cho GeoIP (trung thực)

Mục tiêu: bản đồ hiện **≥3 quốc gia** từ dữ liệu càng thật càng tốt. Ưu tiên thật, ghi nhãn giả lập.

**Cách thật (khuyến nghị):**
```bash
# Bật vài instance t3.micro ở region khác ~30 phút rồi curl vào site:
# [EC2-TESTER @ sa-east-1]  (Brazil)
for i in $(seq 1 50); do curl -s https://shop.duckdns.org/ -o /dev/null; sleep 2; done
# lặp tương tự ở eu-central-1 (Đức), ap-northeast-1 (Nhật)...
```

**Cách giả lập trung thực (nhãn `synthetic`)** — chỉ khi cần thêm nước, và nginx đã
`set_real_ip_from` **chỉ tin IP tester**:
```bash
# [EC2-TESTER]  gửi X-Forwarded-For = IP công cộng thật của nước X (tra trước bằng GeoIP)
for ip in 8.8.8.8 1.1.1.1 203.0.113.10; do
  curl -s -H "X-Forwarded-For: $ip" https://shop.duckdns.org/ -o /dev/null
done
```
> Log các request này phải vào data stream **`-synthetic`** và được ghi nhãn "giả lập"
> trên dashboard (xem [CONTRACT §2](../CONTRACT.md)). Đây vừa là cách demo rẻ, vừa là
> **bài học bảo mật**: đó chính là cách kẻ tấn công giả mạo XFF — nên `set_real_ip_from`
> phải giới hạn nguồn tin cậy. Ranh giới rõ ràng: "bật cho 1 nguồn tin cậy để test"
> khác hẳn "để mở cho cả Internet".
>
> Mẹo dạy học: IP anycast nổi tiếng (8.8.8.8, 1.1.1.1) có thể định vị lệch — đây là
> minh hoạ sống động cho **giới hạn độ chính xác GeoIP** ([07](07-geoip.md)).

---

## 5. Bước 4 — Negative control (đối chứng âm)

Chạy lại **đúng script traffic thường** ở mục 2 trong M phút, đếm số báo động do rule
sinh ra. **Kỳ vọng = 0** (hoặc rất thấp). Ghi thành **E12**.

> Đây là bằng chứng quan trọng nhất về **chất lượng** hệ giám sát: chứng minh nó
> **không báo động bừa**. Nếu negative control ra nhiều báo động → ngưỡng rule quá
> nhạy, phải nới (ghi lại số false-positive từng rule).

---

## 6. Bước 5 — Đo độ trễ phát hiện (E13)

Từ lúc gửi request tấn công đến lúc thấy báo động/panel phản ánh, đo khoảng cách và
**giải thích nguồn trễ**:
- `refresh_interval` của Elasticsearch (~1s): document mới ~1s sau mới tìm được.
- Chu kỳ chạy rule Kibana Alerting (vd mỗi 1 phút).
- Nhịp flush của Filebeat/Logstash.

Ghi một con số thật (vd "≈ 70 giây") + bảng phân rã nguồn trễ. Đây là câu trả lời tốt
cho câu hỏi "hệ thống phát hiện gần thời gian thực đến đâu?".

---

## 7. fail2ban trong demo — cẩn thận thứ tự (RK9)
**Không** để fail2ban chặn IP tester **trước khi** thu xong bằng chứng — nếu không
traffic tấn công tắt sau 30 giây, dashboard chẳng thấy gì. Cách đúng:
1. Thu bằng chứng phát hiện (E11) **trước**, với fail2ban tắt hoặc whitelist tester.
2. Sau đó **demo fail2ban ban IP có chủ đích** như phần "phản ứng" (detect → respond)
   — câu chuyện hay hơn nhiều. Chi tiết ở [09](09-phat-hien-bat-thuong.md)/[11](11-bao-mat-van-hanh-chi-phi.md).

---

## Cách tự kiểm tra đã đúng
- Bảng E11 phủ **100%** rule trong danh mục E10; mỗi dòng có Pass/Fail + ảnh.
- Có ≥2 negative control (E12) với số báo động ghi rõ.
- Bản đồ E6 có ≥3 nước từ traffic thật; dữ liệu giả lập tách `-synthetic`.
- Có con số độ trễ E13 kèm giải thích.

## Lỗi thường gặp
| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Bản đồ vẫn 1 nước | traffic vẫn từ 1 IP; XFF chưa được tin | kiểm `set_real_ip_from`, dùng TESTER region khác |
| Rule không kích hoạt | ngưỡng quá cao / sai tên trường / sai cửa sổ thời gian | đối chiếu [CONTRACT](../CONTRACT.md); hạ ngưỡng theo baseline |
| Tấn công không thấy trong log | fail2ban ban tester quá sớm | whitelist tester khi thu bằng chứng (RK9) |
| Demo hôm thật hỏng | wifi/SG/phiên | dùng video + ảnh dự phòng (G7); thêm IP phòng demo vào SG hôm trước |

## References (ưu tiên tiếng Anh)
- k6 — https://grafana.com/docs/k6/ · Locust — https://docs.locust.io/ · ab — https://httpd.apache.org/docs/current/programs/ab.html
- hydra — https://github.com/vanhauser-thc/thc-hydra · ffuf — https://github.com/ffuf/ffuf · nikto — https://github.com/sullo/nikto · sqlmap — https://github.com/sqlmapproject/sqlmap
- OWASP WSTG (brute force) — https://owasp.org/www-project-web-security-testing-guide/
- nginx realip module — https://nginx.org/en/docs/http/ngx_http_realip_module.html

> **Đối chiếu thuật ngữ:** baseline = mức nền · negative control = đối chứng âm · false
> positive = báo động giả · load test = kiểm thử tải · detection latency = độ trễ phát
> hiện. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
