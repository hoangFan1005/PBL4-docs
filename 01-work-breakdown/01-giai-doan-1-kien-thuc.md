# 01 — Giai đoạn 1: Khoanh vùng & học kiến thức

> Mục tiêu GĐ1: **trước khi bấm bất cứ nút nào trên AWS**, cả nhóm (1) biết mình cần
> học gì, (2) chốt công nghệ nào & vì sao, (3) có sẵn nguồn tài liệu tiếng Anh tin
> cậy. Đây là giai đoạn "đọc & dựng thử offline", tốn ít/không tốn tiền.

---

## 1. Bản đồ kiến thức: cần gì, học ở đâu

Nhóm chia kiến thức thành 6 khối. Mỗi khối trỏ tới chương học tập chi tiết và người
phụ trách chính. **Cả nhóm học khối 1**; các khối sau chia theo vai.

| Khối | Nội dung cốt lõi | Chương | Ai |
|---|---|---|---|
| **1. Mạng** | IP public/private, CIDR, port, NAT, DNS, HTTP, TLS, tường lửa stateful | [01](../02-learning/01-nen-tang-mang.md) | cả nhóm |
| **2. Linux** | shell, quyền, systemd, apt, SSH, log, ufw, debug dịch vụ | [02](../02-learning/02-linux-co-ban.md) | B |
| **3. Cloud & AWS** | IaaS, Region/AZ, VPC/subnet/route/IGW, SG vs NACL, EC2/AMI/EBS/key pair, IAM, **chi phí & Budget** | [03](../02-learning/03-cloud-va-aws.md) | A |
| **4. Web** | LEMP, thiết kế app PHP, trang login, **access log JSON**, HTTPS | [04](../02-learning/04-web-server-va-app.md) | B |
| **5. ELK** | kiến trúc ES/Kibana/Logstash, index/mapping/shard, Filebeat, pipeline, ILM, GeoIP, dashboard/Maps | [05](../02-learning/05-elk-kien-truc.md)–[08](../02-learning/08-kibana-dashboard.md) | C |
| **6. Giám sát & tấn công** | OWASP Top 10 (2025), mô hình mối đe doạ web, rule phát hiện, sinh traffic/tấn công | [09](../02-learning/09-phat-hien-bat-thuong.md)–[10](../02-learning/10-kiem-thu-va-demo.md) | B (rule) + cả nhóm |

**Cách học hiệu quả cho người mới** (xem thêm [index](../02-learning/00-index.md)):
đọc *Mục tiêu* + *Kiến thức nền* của một chương → **dựng thử offline** (Docker/máy
cá nhân) → khi vướng thì quay lại đọc kỹ. Đừng học thuộc lý thuyết trước khi thấy hệ
thống chạy.

---

## 2. Lựa chọn công nghệ & lý do {#lua-chon-cong-nghe}

Đây là mục **"tại sao thiết kế như vậy"** ở cấp toàn dự án — sẽ được hỏi khi bảo vệ.
Mỗi lựa chọn ghi: vấn đề → các phương án → chọn gì → vì sao → đánh đổi.

### 2.1 Nhà cung cấp cloud → **AWS**
- **Vì sao:** đúng trọng tâm đề tài; nhóm có credit $200; hệ sinh thái tài liệu tiếng
  Anh khổng lồ; EC2 là dịch vụ máy chủ ảo cơ bản, dễ hình dung cho người mới.
- **Đánh đổi:** mô hình giá phức tạp (dễ phát sinh phí IPv4/EBS/NAT) → phải kiểm soát
  chi phí chặt ([03](../02-learning/03-cloud-va-aws.md), [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md)).

### 2.2 Hệ điều hành → **Ubuntu Server 24.04 LTS**
- **Phương án:** Amazon Linux 2023 · Ubuntu 24.04 · Ubuntu mới hơn.
- **Chọn Ubuntu 24.04 LTS. Vì sao:** `apt`/`ufw` thân thiện người mới, **nhiều tutorial
  nhất**, không SELinux enforcing gây bẫy, LTS tới 2029.
- **Đánh đổi:** tích hợp AWS không sâu bằng Amazon Linux (không đáng kể ở quy mô này).

### 2.3 Website → **App PHP + MySQL tự viết trên LEMP**
- **Phương án:** WordPress+WooCommerce · **app PHP tự viết** · OpenCart/PrestaShop.
- **Chọn app tự viết. Vì sao:** nhóm đã biết PHP/MySQL; **kiểm soát hoàn toàn log**
  (thêm được sự kiện `login_success`/`login_failed` → phát hiện brute-force chính xác);
  thể hiện năng lực lập trình; nhẹ RAM. nginx sinh access log sạch, dễ đổi sang JSON.
- **Đánh đổi:** tốn thời gian code hơn dùng WordPress; **giảm rủi ro bằng cách dựng
  local trước** (offline-first) và giữ phạm vi tối thiểu (sản phẩm + giỏ + login).
- **Runner-up nếu thiếu thời gian:** WordPress+WooCommerce (trang `/wp-login.php` là
  mẫu brute-force kinh điển) — ghi chú trong [04](../02-learning/04-web-server-va-app.md).

### 2.4 Web server & định dạng log → **nginx + access log JSON**
- **Vì sao nginx:** `log_format ... escape=json` cho JSON hợp lệ chắc chắn chỉ bằng
  một khai báo; Apache không escape JSON.
- **Vì sao JSON (không phải `combined`):** JSON tự mô tả, có kiểu → Logstash chỉ cần
  filter `json`, khỏi viết **grok** (regex dễ vỡ). Một request chứa ký tự `"` (đúng
  thứ mà tấn công SQLi hay dùng) đủ làm grok vỡ và **mất log** → đây là **quyết định
  bảo mật**, không phải thẩm mỹ.

### 2.5 Hệ giám sát → **self-hosted ELK (Filebeat → Logstash → Elasticsearch → Kibana)**
- **Phương án:** self-hosted ELK trên EC2 · AWS OpenSearch Service (managed).
- **Chọn self-hosted ELK. Vì sao:** đề bài chỉ đích danh "ELK"; pipeline Logstash
  (input→filter→output) là nơi **dạy rõ nhất** khái niệm parse/enrich/geoip; chủ động
  học được cả stack.
- **Vì sao qua Logstash (không Filebeat→ES trực tiếp):** để **thấy được** bước xử lý;
  Filebeat→ES + ingest pipeline là **phương án dự phòng** khi ELK thiếu RAM (quy tắc
  chuyển: nếu máy ELK <4GB hoặc Logstash OOM → chuyển plan B).
- **Đánh đổi:** tốn RAM & công vận hành hơn managed; bù bằng chọn instance đủ RAM và
  offline-first.

### 2.6 Phát hiện bất thường → **rule-based trên license Basic (miễn phí)**
- **Vì sao không ML:** ML anomaly detection của Elastic là tính năng **trả phí**
  (xác nhận ở [05](../02-learning/05-elk-kien-truc.md)/[09](../02-learning/09-phat-hien-bat-thuong.md)).
- **Chọn:** rule/threshold trên aggregation + Kibana Alerting (rule types thuộc Basic)
  + tuỳ chọn ElastAlert2. Đủ để phát hiện brute-force, quét, flood, scanner, geo-anomaly.

### 2.7 GeoIP → **MaxMind GeoLite2** (qua geoip filter/processor)
- **Vì sao:** miễn phí (cần license key), là chuẩn de-facto, tích hợp sẵn Elastic.
- **Đánh đổi:** độ chính xác cấp thành phố có sai số; IP private không có kết quả →
  nêu rõ giới hạn trong báo cáo ([07](../02-learning/07-geoip.md)).

---

## 3. Nguồn tài liệu (ưu tiên tiếng Anh, tài liệu chính thức)

> Quy tắc: **ưu tiên docs chính thức** (AWS, Elastic, nginx, MaxMind, OWASP) hơn blog.
> Mỗi chương học tập có mục *References* riêng; đây là danh mục gốc để bắt đầu.

### Mạng & Linux
- Cloudflare Learning Center — https://www.cloudflare.com/learning/
- MDN HTTP — https://developer.mozilla.org/en-US/docs/Web/HTTP
- *The Linux Command Line* (Shotts, miễn phí) — https://linuxcommand.org/tlcl.php
- Linux Journey — https://linuxjourney.com/ · Linux Foundation LFS101 — https://training.linuxfoundation.org/training/introduction-to-linux/

### AWS
- AWS Documentation (EC2, VPC) — https://docs.aws.amazon.com/
- AWS Free Tier — https://aws.amazon.com/free
- Tutorial "Host a website on EC2" — https://aws.amazon.com/getting-started/hands-on/
- AWS Skill Builder (khoá miễn phí) — https://skillbuilder.aws/
- AWS Well-Architected — https://aws.amazon.com/architecture/well-architected/
- AWS Budgets — https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html

### Web / PHP
- nginx docs — https://nginx.org/en/docs/ · log module — https://nginx.org/en/docs/http/ngx_http_log_module.html
- PHP manual (password_hash, PDO) — https://www.php.net/manual/
- Let's Encrypt / Certbot — https://certbot.eff.org/ · DuckDNS — https://www.duckdns.org/

### ELK / GeoIP
- Elastic docs — https://www.elastic.co/guide/ · Subscriptions (license) — https://www.elastic.co/subscriptions
- Elastic Common Schema (ECS) — https://www.elastic.co/guide/en/ecs/current/index.html
- Kibana Maps — https://www.elastic.co/guide/en/kibana/current/maps.html
- Logstash geoip filter — https://www.elastic.co/guide/en/logstash/current/plugins-filters-geoip.html
- MaxMind GeoLite2 — https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
- ElastAlert2 — https://github.com/jertel/elastalert2

### Bảo mật & giám sát
- OWASP Top 10 (2025) — https://owasp.org/Top10/2025/
- OWASP Logging Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP WSTG (brute force testing) — https://owasp.org/www-project-web-security-testing-guide/
- fail2ban — https://www.fail2ban.org/

### Công cụ (diagram, load test, pentest — dùng hợp pháp trên hạ tầng của nhóm)
- diagrams.net (draw.io) + AWS icons — https://www.drawio.com/ · https://aws.amazon.com/architecture/icons/
- k6 — https://grafana.com/docs/k6/ · Locust — https://docs.locust.io/ · ApacheBench — https://httpd.apache.org/docs/current/programs/ab.html
- hydra — https://github.com/vanhauser-thc/thc-hydra · nikto — https://github.com/sullo/nikto · ffuf — https://github.com/ffuf/ffuf · sqlmap — https://github.com/sqlmapproject/sqlmap

---

## 4. Sản phẩm cuối GĐ1 (Definition of Done)
- [ ] Cả nhóm đọc xong khối 1 (Mạng) + [phân tích đề](00-tong-quan-va-phan-tich-de-bai.md).
- [ ] Mỗi người dựng thử **offline** phần của mình: B có app shop chạy local; C có ELK
      chạy Docker local + pipeline parse được file log mẫu; A phác ma trận SG + mô hình chi phí.
- [ ] Chốt [`CONTRACT.md`](../CONTRACT.md): tên trường, phiên bản, quy ước.
- [ ] Hoàn tất **Bàn giao #3** (file log mẫu B→C) — xem [hợp đồng bàn giao](05-hop-dong-ban-giao.md).
- [ ] Sổ nguồn tài liệu (bookmark) chia theo vai.

→ Đạt các mục trên là qua **cổng G2**, sẵn sàng vào [Giai đoạn 2 — Triển khai](02-giai-doan-2-trien-khai.md).
