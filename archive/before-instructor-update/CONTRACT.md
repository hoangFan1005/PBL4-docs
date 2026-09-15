# CONTRACT — Hợp đồng dữ liệu & quy ước chung

> **File này là NGUỒN SỰ THẬT DUY NHẤT** về: tên trường log, kiểu dữ liệu, quy ước
> đặt tên, phiên bản phần mềm, và danh mục bằng chứng (E-ID). Mọi chương khác **trích
> dẫn** file này chứ không tự định nghĩa lại. Nếu cần đổi một tên trường, đổi ở đây
> trước, rồi mới sửa nơi dùng. Viết file này **trước** khi ai đó bắt đầu viết pipeline
> hay dashboard — nếu không, mỗi người sẽ đặt tên trường một kiểu.

---

## 1. Quy ước đặt tên trường: theo ECS (Elastic Common Schema)

Nhóm dùng **ECS** — bộ tên trường chuẩn của Elastic — thay vì tự đặt tên tuỳ hứng.
Lý do: Kibana Maps, các tích hợp sẵn, và tài liệu Elastic đều nói "ngôn ngữ" ECS;
đặt đúng tên ECS thì mọi thứ khớp sẵn, ít phải cấu hình tay.

> Tham chiếu ECS: https://www.elastic.co/guide/en/ecs/current/index.html

### Bảng schema chuẩn của access log (nguồn dữ liệu chính)

| Trường ECS | Kiểu ES | Nguồn (biến nginx / app) | Ví dụ | Ai dùng |
|---|---|---|---|---|
| `@timestamp` | `date` | từ `$time_iso8601` qua `date` filter | `2026-09-08T10:33:01+07:00` | tất cả |
| `source.ip` | `ip` | `$remote_addr` (hoặc XFF, xem §4) | `203.0.113.45` | GeoIP, detection |
| `source.geo.country_iso_code` | `keyword` | geoip enrich | `VN` | Maps, rule geo |
| `source.geo.country_name` | `keyword` | geoip enrich | `Vietnam` | Maps |
| `source.geo.city_name` | `keyword` | geoip enrich | `Da Nang` | Maps |
| `source.geo.location` | **`geo_point`** | geoip enrich (lat/lon) | `{"lat":16.05,"lon":108.2}` | **Kibana Maps** |
| `http.request.method` | `keyword` | `$request_method` | `POST` | detection |
| `url.original` | `keyword` | `$request_uri` (path+query đầy đủ) | `/product.php?id=1` | rule SQLi (Rule 4) |
| `url.path` | `keyword` | tách từ `url.original` (Logstash grok) | `/login.php` | detection |
| `url.query` | `keyword` | tách từ `url.original` (Logstash grok) | `id=1' OR 1=1--` | rule SQLi |
| `http.response.status_code` | `long` | `$status` (KHÔNG để ngoặc kép) | `401` | detection, dashboard |
| `http.response.body.bytes` | `long` | `$body_bytes_sent` | `2048` | rule exfil |
| `http.request.bytes` | `long` | `$request_length` | `812` | — |
| `http.request.duration_sec` | `float` | `$request_time` (giây) | `0.012` | hiệu năng |
| `user_agent.original` | `keyword` | `$http_user_agent` | `curl/8.5.0` | rule scanner |
| `user_agent.name` | `keyword` | useragent enrich | `Chrome` | dashboard |
| `http.request.referrer` | `keyword` | `$http_referer` | `https://shop/...` | — |
| `url.domain` | `keyword` | `$host` | `shop.duckdns.org` | — |
| `network.forwarded_ip` / `x_forwarded_for` | `keyword` | `$http_x_forwarded_for` | `203.0.113.45` | GeoIP (demo) |
| `event.dataset` | `keyword` | đặt cố định | `nginx.access` | phân loại |

### Bảng schema của app auth log (log tầng ứng dụng — tín hiệu brute-force)

| Trường | Kiểu | Nguồn | Ví dụ |
|---|---|---|---|
| `@timestamp` | `date` | `date('c')` trong PHP | `2026-09-08T10:33:01+07:00` |
| `event.dataset` | `keyword` | cố định | `shop.auth` |
| `event.action` | `keyword` | `login_success` \| `login_failed` | `login_failed` |
| `source.ip` | `ip` | XFF hoặc `REMOTE_ADDR` | `203.0.113.45` |
| `user.name` / `email` | `keyword` | email nhập vào | `a@b.com` |
| `url.path` | `keyword` | `REQUEST_URI` | `/login.php` |
| `user_agent.original` | `keyword` | `HTTP_USER_AGENT` | `python-requests/2.31` |

> **Vì sao có app auth log riêng:** access log không phân biệt được "đăng nhập sai
> mật khẩu" với "mở trang login" (đều là `POST /login.php`). App thì biết. Trường
> `event.action=login_failed` là tín hiệu sạch nhất cho rule brute-force
> ([09](02-learning/09-phat-hien-bat-thuong.md)). Chi tiết lý do ở [04](02-learning/04-web-server-va-app.md).

---

## 2. Quy ước đặt tên tài nguyên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Data stream / index log web | `logs-nginx.access-<env>` | `logs-nginx.access-lab` |
| Data stream app auth | `logs-shop.auth-lab` | |
| Index lỗi parse (KHÔNG bỏ đi) | `logs-failed-lab-<ngày>` | `logs-failed-lab-2026.09.08` |
| Data stream giả lập (không trộn dữ liệu thật) | hậu tố `-synthetic` | `logs-nginx.access-synthetic` |
| EC2 | `pbl4-<vai>` | `pbl4-web`, `pbl4-elk`, `pbl4-tester` |
| Security Group | `sg-pbl4-<vai>` | `sg-pbl4-web` |
| Index template | `pbl4-logs` | |
| ILM policy | `pbl4-logs-ilm` | |

> **Quy tắc quan trọng:** dữ liệu **giả lập** (log replay / XFF bịa) phải nằm ở data
> stream đuôi `-synthetic`, **không bao giờ trộn** với dữ liệu thật — nếu không mọi
> con số trong báo cáo mất tính trung thực. Xem [10](02-learning/10-kiem-thu-va-demo.md).

---

## 3. Phiên bản đã chốt (pin versions)

> Toàn stack Elastic phải **cùng một minor version**. Điền số chính xác sau khi tra
> cứu (đang cập nhật từ agent nghiên cứu). Dùng `apt-mark hold` để khoá.

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Ubuntu | **24.04 LTS** | hỗ trợ tới 2029 |
| Elasticsearch | **9.5.3** | bản GA mới, docs "current" trỏ 9.x |
| Kibana | **9.5.3** | cùng version cả stack |
| Logstash | **9.5.3** | `pipeline.ecs_compatibility` mặc định **`v8`** (từ LS 8.0) → geoip ghi ra `source.geo.*` (xem [06](02-learning/06-thu-thap-va-xu-ly-log.md)) |
| Filebeat | **9.5.3** | không mới hơn cluster; **dùng `type: filestream`** (9.x đã bỏ `type: log`) |
| PHP | 8.3 (mặc định Ubuntu 24.04) | khớp tên socket php-fpm |
| MariaDB | mặc định kho Ubuntu 24.04 | |
| GeoLite2 | City + Country (`.mmdb`) | cần license key MaxMind miễn phí; hoặc dùng downloader `geoip.elastic.co` (không cần tài khoản) |

> **Cảnh báo tương thích (tại sao pin & tại sao tutorial cũ sai):**
> (1) Từ Logstash 8.0, `ecs_compatibility=v8` là **mặc định** → filter `geoip` với
> `source => "[source][ip]"` tự suy target = `source`, ghi vào **`source.geo.location`**
> (đúng schema §1). Blog cũ (LS 6/7) dùng `geoip{source=>"clientip"}` kỳ vọng
> `geoip.location` phẳng → **hỏng** trên bản hiện tại.
> (2) Filebeat 9.x **vô hiệu hoá `type: log` mặc định** (chỉ chạy lại nếu thêm
> `allow_deprecated_use: true`) → nên dùng `type: filestream`. Config `filebeat.yml`
> cũ chép nguyên si dễ **không khởi động**.
> (3) Elastic bật **security mặc định từ 8.0** (TLS + mật khẩu `elastic` + enrollment
> token). Blog kiểu "curl localhost:9200" không auth đều sai — xem [05](02-learning/05-elk-kien-truc.md).

---

## 4. Quy tắc IP nguồn (quan trọng cho GeoIP)

- **Mặc định** (khách vào thẳng EC2, không proxy): `source.ip = $remote_addr` — đây
  đã là IP thật của khách. **Không** áp dụng logic X-Forwarded-For một cách mù quáng.
- **Chỉ khi** có proxy tin cậy đứng trước (hoặc trong bài demo GeoIP dùng XFF giả lập):
  lấy IP từ `x_forwarded_for`, và nginx phải khai báo `set_real_ip_from` **giới hạn
  đúng nguồn tin cậy** (không mở cho mọi IP — nếu không, kẻ tấn công tự bịa IP được).
- **Luôn** bỏ qua tra GeoIP với IP private/loopback (`10.*`, `172.16–31.*`,
  `192.168.*`, `127.*`) — chúng không có toạ độ, sẽ gắn tag `_geoip_lookup_failure`.
  Xem [07](02-learning/07-geoip.md).

---

## 5. Quy ước nhãn máy (dùng trong mọi khối lệnh)

`[máy cá nhân]` · `[EC2-WEB]` · `[EC2-ELK]` · `[EC2-TESTER]` · `[Kibana UI]`

Mọi khối lệnh trong tài liệu **phải** có nhãn máy; mọi đường dẫn file là **tuyệt đối**.

---

## 6. Danh mục bằng chứng (E-ID) — tóm tắt

Chi tiết tiêu chí nghiệm thu ở [GĐ3](01-work-breakdown/03-giai-doan-3-kiem-thu-demo-baocao.md).
Mỗi chương học tập, ở mục "Bàn giao & bằng chứng", nói rõ nó sinh ra E-ID nào vào
`docs/assets/evidence/`.

E1 sơ đồ kiến trúc · E2 bảng SG · E3 log schema · E4 log thô ↔ `_source` · E5 template
`geo_point` · E6 bản đồ ≥3 nước + top country · E7 IP không lên bản đồ · E8 dashboard
giám sát · E9 baseline · E10 danh mục rule · E11 bảng thực thi test · E12 negative
control · E13 độ trễ phát hiện · E14 báo cáo chi phí · E15 bằng chứng teardown ·
E16 ma trận truy vết.

---

## 7. Mẫu một dòng access log JSON hợp lệ (đối chiếu nhanh)

```json
{"time":"2026-09-08T10:33:01+07:00","remote_addr":"203.0.113.45","x_forwarded_for":"","host":"shop.duckdns.org","method":"POST","uri":"/login.php","protocol":"HTTP/1.1","status":401,"body_bytes_sent":512,"request_length":812,"request_time":0.012,"referer":"https://shop.duckdns.org/login.php","user_agent":"python-requests/2.31.0"}
```

> Tên biến nginx (`remote_addr`, `status`…) là **tên thô trong log**; Logstash sẽ
> **ánh xạ** chúng sang tên ECS ở §1 (vd `remote_addr → source.ip`,
> `status → http.response.status_code`). Bảng ánh xạ đầy đủ nằm trong pipeline ở
> [chương 06](02-learning/06-thu-thap-va-xu-ly-log.md).
