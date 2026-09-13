# 05 — ELK: Kiến trúc & khái niệm nền

> **Người đọc chính: C (ELK/Data).** Đây là chương "vỡ lòng" về ELK cho người mới —
> đặc biệt cho người **chỉ biết MySQL**. Nếu nắm chắc chương này, các chương 06–09
> chỉ là áp dụng. Bao gồm cả **cạm bẫy lớn nhất của ELK 2026**: bảo mật bật mặc định
> (TLS + auth) khiến mọi tutorial cũ "curl localhost:9200" đều sai.

## Mục tiêu chương
- Hiểu vai trò từng thành phần (Elasticsearch, Logstash, Kibana, Filebeat) và luồng dữ liệu.
- Dịch khái niệm ES sang MySQL (index/document/mapping/shard...).
- Hiểu **JVM heap**, **shard/replica** (vì sao single-node luôn "yellow"), **keyword vs text**, **data stream**.
- Biết **tính năng nào miễn phí (Basic)** → quyết định phát hiện bất thường bằng rule.
- Vượt qua **security-by-default** của Elastic 8/9 (enrollment token, CA, mật khẩu `elastic`).

## Cần biết gì trước
- [01 Mạng](01-nen-tang-mang.md), [02 Linux](02-linux-co-ban.md), [CONTRACT.md](../CONTRACT.md).
- Nên dựng thử ELK bằng Docker ở local trước (offline-first) — hướng dẫn ngay ở §0 dưới.

---

## 0. Dựng ELK local bằng Docker (offline-first — làm ở tuần 2)

Trước khi đụng AWS, **C nên dựng ELK trên máy cá nhân bằng Docker** để học
Discover/Lens/Maps và phát triển pipeline miễn phí (điều kiện cổng G2).

**Cài Docker + Docker Compose:** theo hướng dẫn chính thức https://docs.docker.com/engine/install/
(hoặc Docker Desktop cho Windows/macOS). Kiểm tra: `docker --version && docker compose version`.

Tạo `docker-compose.yml` (single-node ES + Kibana, đủ để học; tắt security cho môi
trường **local** để đơn giản — **KHÔNG** làm vậy trên máy AWS thật):
```yaml
# [máy cá nhân]  docker-compose.yml  — CHỈ dùng ở local để học
services:
  es:
    image: docker.elastic.co/elasticsearch/elasticsearch:9.5.3
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false          # chỉ local! máy thật thì để bật (§7)
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ports: ["9200:9200"]
    ulimits: { memlock: { soft: -1, hard: -1 } }
  kibana:
    image: docker.elastic.co/kibana/kibana:9.5.3
    environment:
      - ELASTICSEARCH_HOSTS=http://es:9200
    ports: ["5601:5601"]
    depends_on: [es]
```
```bash
# [máy cá nhân]
# Linux: đặt vm.max_map_count trước (xem §4)
sudo sysctl -w vm.max_map_count=262144
docker compose up -d
# mở http://localhost:5601  → Kibana; thử nạp "Sample web logs" để xem Maps/geoip ngay
```
> Tài liệu chính thức: *Run Elasticsearch locally with Docker* —
> https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html và
> *Install Kibana with Docker* — https://www.elastic.co/guide/en/kibana/current/docker.html
> Bản đầy đủ (có Logstash + security) tham khảo (cộng đồng): https://github.com/deviantony/docker-elk
>
> Trên AWS thật, nhóm cài bằng **kho APT** (bảo mật bật mặc định) — xem
> [06 §0](06-thu-thap-va-xu-ly-log.md#0-cài-đặt-elastic-stack-kho-apt--làm-đầu-tiên).

---

## 1. ELK là gì — bốn thành phần, một luồng

**ELK** = **E**lasticsearch + **L**ogstash + **K**ibana. Thêm **Filebeat** (một
"Beat") thành bộ thu log hoàn chỉnh. Luồng dữ liệu trong đồ án:

```
[EC2-WEB] access.json.log ──► Filebeat ──(5044)──► [EC2-ELK] Logstash ──(9200)──► Elasticsearch ──► Kibana (5601)
   (sinh log)                (đọc & gửi)          (parse/enrich/geoip)   (lưu & tìm kiếm)     (xem/vẽ/cảnh báo)
```

| Thành phần | Vai trò | Ví dụ đời thường |
|---|---|---|
| **Filebeat** | đọc file log, gửi từng dòng đi (nhẹ, chạy trên máy web) | người đưa thư đọc hòm thư, mang thư đi |
| **Logstash** | nhận log, **parse + làm giàu** (JSON→trường, geoip, useragent), gửi vào ES | nhà máy phân loại: mở thư, dán nhãn quốc gia, xếp vào đúng ngăn |
| **Elasticsearch** | lưu trữ + **tìm kiếm/tổng hợp** cực nhanh | kho lưu trữ có mục lục siêu nhanh |
| **Kibana** | giao diện web: tìm (Discover), vẽ (Lens), bản đồ (Maps), cảnh báo (Alerting) | phòng điều khiển có màn hình & biểu đồ |

> **Vì sao có Logstash mà không Filebeat→ES thẳng:** đề bài yêu cầu "ELK", và
> Logstash là nơi **thấy rõ** bước parse/enrich/geoip (input→filter→output). Nếu máy
> ELK thiếu RAM, phương án dự phòng là Filebeat→ES + ingest pipeline (geoip processor)
> — quy tắc chuyển ở [06](06-thu-thap-va-xu-ly-log.md).

---

## 2. Bảng dịch Elasticsearch ↔ MySQL (Rosetta) — đọc kỹ nhất chương

Đây là 500 chữ giá trị nhất cho người biết MySQL.

| Elasticsearch | ≈ MySQL | Khác biệt phải nhớ |
|---|---|---|
| **index** | ~ một **bảng chia theo thời gian** (partition) | Ta xoay vòng theo ngày (`nginx-access-2026.09.08`), không `ALTER` tại chỗ |
| **document** | một **hàng** (row), lưu dạng JSON | |
| **field** | một **cột** | |
| **mapping** | `CREATE TABLE` (định nghĩa kiểu cột) | **ES gần như KHÔNG đổi được kiểu field sau khi đã có dữ liệu** → phải reindex. Đây là gốc rễ vì sao phải khai báo `geo_point` TRƯỚC khi ingest |
| **dynamic mapping** | (MySQL không có) | Nếu ghi vào index chưa tồn tại, ES **tự tạo và ĐOÁN kiểu** từ hàng đầu. Nó **không bao giờ đoán ra `geo_point`**, và có thể đoán `status` là chuỗi |
| **shard** | ~ **phân mảnh** (partition/sharding) của index | Chia index thành N mảnh Lucene để trải trên nhiều node. Single-node → dùng **1 shard** |
| **replica** | bản sao dự phòng của shard | Single-node → **0 replica** (xem mục 4) |
| **`_search` / Query DSL / ES\|QL** | `SELECT ... WHERE ... GROUP BY` | Cú pháp khác; ES\|QL là ngôn ngữ "ống" (`|`) dễ đọc |
| **aggregation** | `GROUP BY ... HAVING` | Trái tim của phát hiện bất thường |
| **refresh (~1s)** | (MySQL đọc được ngay sau ghi) | ES **near-real-time**: document vừa ghi ~1s sau mới tìm thấy → hay gây "gửi rồi mà Discover trống" |

---

## 3. keyword vs text — vì sao "top 10 URL" báo lỗi "not aggregatable"

Một chuỗi trong ES có thể ánh xạ 2 kiểu, khác nhau hoàn toàn:

| Kiểu | Giống MySQL | Làm được | KHÔNG làm được |
|---|---|---|---|
| **`keyword`** | `VARCHAR` có index | lọc chính xác, **`GROUP BY` (aggregate)**, sort | tìm toàn văn |
| **`text`** | `FULLTEXT` index | tìm toàn văn (phân tích từ) | **không aggregate, không sort** |

→ Muốn vẽ "top 10 URL" (một aggregation), field phải là `keyword`. Nếu để `text`,
Kibana báo *"field is not aggregatable"* và đòi `.keyword`. Vì vậy trong
[CONTRACT](../CONTRACT.md) các field dùng để nhóm (`url.path`, `user_agent.original`,
`source.geo.country_name`...) đều khai `keyword`.

---

## 4. JVM heap & vì sao single-node luôn "yellow"

### JVM heap
Elasticsearch/Logstash chạy trên **Java (JVM)**. JVM **giữ trước một vùng RAM cố định**
gọi là **heap** cho cả tiến trình (khác PHP cấp `memory_limit` cho từng request).

- Quy tắc: heap ≈ **50% RAM**, và `-Xms == -Xmx` (đặt bằng nhau, tránh khựng khi resize).
- Nửa RAM còn lại để cho **OS page cache** — chính nó làm Lucene nhanh (giống buffer pool của InnoDB, nhưng do kernel quản).
- **Máy ELK 4GB chạy cả ES + Kibana + Logstash rất chật.** Ngân sách gợi ý:
  ES `-Xms1g -Xmx1g`, Logstash `-Xms512m -Xmx512m`, chừa ~1–1.5GB cho OS + Kibana.
  Đặt trong `/etc/elasticsearch/jvm.options.d/heap.options` và `/etc/logstash/jvm.options`.
- **Nếu máy không đủ heap → ES chết ngay khi khởi động** (không phải khi tải). Chẩn
  đoán thật nằm ở `dmesg -T | grep -i oom` (journalctl thường không nói rõ).

> Cân nhắc thực tế cho 4GB: **đưa Logstash sang chạy trên EC2-WEB** (gửi thẳng vào ES),
> hoặc bỏ Logstash, dùng **Filebeat→ES + ingest pipeline** (geoip processor). Nhẹ hơn hẳn.

### vm.max_map_count
Lucene mmap hàng nghìn file; Linux giới hạn số mapping/tiến trình. ES yêu cầu
**≥262144**:
```bash
# [EC2-ELK]
sudo sysctl -w vm.max_map_count=262144
echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-elasticsearch.conf   # giữ sau reboot
```
> Bẫy tinh vi: kiểm tra bootstrap chỉ bật khi ES **bind địa chỉ non-loopback**. Nên
> lỗi này thường xuất hiện **sau khi** "hôm qua vẫn chạy", đúng lúc bạn đổi
> `network.host: 0.0.0.0` để Filebeat gửi vào được.

### Single-node = "yellow" là BÌNH THƯỜNG
Cluster một node với mặc định `number_of_replicas: 1` **luôn vàng (yellow)**, vì ES
không đặt replica cùng node với primary. **Không phải lỗi.** Đặt `0 replica` trong
index template để xanh (green) — nghĩa là "tôi chấp nhận không có bản dự phòng"
(hợp lý khi chỉ có 1 node). Xem [06](06-thu-thap-va-xu-ly-log.md).

---

## 5. Data stream & near-real-time
- **Data stream**: một "bảng chỉ ghi thêm" (append-only). Bạn ghi vào một alias, ES tự
  nối vào index-partition hiện tại, tự tạo cái mới khi tới hạn. Cần template có
  `data_stream` + chính sách ILM.
- **Bẫy:** Filebeat 8+/9 **mặc định ghi vào data stream** → tên `index: "nginx-%{+...}"`
  kiểu blog cũ bị **bỏ qua âm thầm** ("index không đúng tên tôi đặt"). Đồ án có thể
  dùng index theo ngày + ILM cho đơn giản (xem [06](06-thu-thap-va-xu-ly-log.md)).

---

## 6. License Basic (miễn phí) gồm gì — quyết định "phát hiện bằng rule"

Nguồn: https://www.elastic.co/subscriptions. **Đây là căn cứ để KHÔNG dùng ML.**

| Tính năng | Basic (MIỄN PHÍ) | Trả phí |
|---|---|---|
| **Kibana Alerting: rule "Index threshold" & "Elasticsearch query"** | ✅ | — |
| Action **Index** & **Server log** (ghi cảnh báo thành document) | ✅ | Email/Slack/Webhook → Gold+ (trả phí) |
| **Kibana Maps** (geo_point, bản đồ) | ✅ | — |
| **Security/TLS/auth/RBAC** | ✅ | LDAP/SSO/mã hoá-at-rest → phí |
| **Elastic Security app + prebuilt detection rules** (không ML) | ✅ | rule ML, alert suppression → Platinum |
| **Transforms** (tổng hợp per-IP) | ✅ | — |
| **ES\|QL** | ✅ | cross-cluster → Enterprise |
| **ML anomaly detection jobs** | ❌ | Platinum+ |
| **Watcher** | ❌ | phí |

**Kết luận:** phát hiện bất thường của đồ án dùng **rule-based** (Index threshold +
ES query rule + transforms + ES|QL), action ghi vào **index cảnh báo** (rồi dựng
dashboard cảnh báo) hoặc **server log**; muốn gửi email/Slack thì dùng **ElastAlert2**
(mã nguồn mở, miễn phí) hoặc cron+curl. Chi tiết ở [09](09-phat-hien-bat-thuong.md).

---

## 7. ⚠️ Security-by-default (Elastic 8/9) — cạm bẫy lớn nhất 2026

Từ 8.0, cài ES là **tự bật bảo mật**: tạo TLS, đặt mật khẩu ngẫu nhiên cho user
`elastic`, in ra **enrollment token** (hạn 30 phút) để Kibana kết nối. **Mọi tutorial
cũ "curl localhost:9200" không auth đều sai.**

Các thao tác then chốt (giống MySQL 8 in mật khẩu root tạm vào log):
```bash
# [EC2-ELK]  sau khi apt install elasticsearch
# 1) Lấy/đặt lại mật khẩu 'elastic'
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic
# 2) Tạo enrollment token cho Kibana
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s kibana
# 3) CA tự sinh (bản .deb) nằm ở:
#    /etc/elasticsearch/certs/http_ca.crt
# 4) Kiểm tra kết nối (smoke test chuẩn):
curl --cacert /etc/elasticsearch/certs/http_ca.crt -u elastic https://localhost:9200
```
Các lỗi nguyên văn hay gặp: `missing authentication credentials for REST request`,
`certificate verify failed`, `unable to authenticate user [elastic]`,
`Kibana server is not ready yet`.

> **Quy tắc quyền tối thiểu:** đừng để Filebeat/Logstash dùng superuser `elastic`.
> Tạo user/API key chỉ có quyền ghi vào data stream log (giống `GRANT INSERT` cho app
> user thay vì `root`). Xem [06](06-thu-thap-va-xu-ly-log.md).
>
> **Chấp nhận được cho đồ án SV:** có thể đặt `ssl.verification_mode: none` cho
> Filebeat trong lab — nhưng **phải ghi rõ đây là đánh đổi** trong báo cáo, không giấu.

---

## Quyết định thiết kế (tóm tắt)
| Vấn đề | Phương án | Chọn | Vì sao / Đánh đổi |
|---|---|---|---|
| Thu thập log | Filebeat→ES · Filebeat→Logstash→ES · Elastic Agent | **Filebeat→Logstash→ES** | dạy rõ pipeline; dự phòng Filebeat→ES nếu RAM thiếu |
| Version | 8.19 (cầu nối) · **9.5.3** | **9.5.3** | docs current trỏ 9.x; 8.18 EOL sớm |
| Phát hiện | ML · **rule-based** | **rule-based** | ML là trả phí; Basic đủ Index-threshold + ES-query |
| Replica | 1 (mặc định) · **0** | **0** | single-node; chấp nhận không dự phòng để green |

## Cách tự kiểm tra đã hiểu / Câu hỏi bảo vệ
1. Dịch sang MySQL: index, document, mapping, shard, aggregation.
2. Vì sao phải khai `geo_point` **trước** khi ingest? (gợi ý: ES không đổi kiểu field sau khi có dữ liệu)
3. Cluster 1 node báo "yellow" — có phải lỗi không? Sửa thế nào và đánh đổi gì?
4. JVM heap nên đặt bao nhiêu trên máy 4GB và vì sao không đặt 100% RAM?
5. Vì sao phát hiện bất thường của nhóm dùng rule chứ không ML?
6. Cài ES xong `curl localhost:9200` báo "missing authentication credentials" — vì sao và xử lý thế nào?

## Lỗi thường gặp
| Triệu chứng (nguyên văn) | Nguyên nhân | Chẩn đoán | Cách sửa |
|---|---|---|---|
| ES chết lúc khởi động, `dmesg` có `Out of memory` | heap > RAM | `dmesg -T \| grep -i oom` | giảm `-Xmx`; tách Logstash sang máy khác |
| `max virtual memory areas vm.max_map_count [65530] is too low` | thiếu `vm.max_map_count` | log ES | `sysctl -w vm.max_map_count=262144` |
| cluster `yellow` | single-node + 1 replica | `GET /_cluster/health` | đặt `number_of_replicas: 0` |
| `missing authentication credentials` | security bật mặc định | — | dùng `-u elastic` + `--cacert http_ca.crt` |
| Discover trống dù vừa gửi | near-real-time ~1s / sai time range | `GET /_cat/indices` | chờ 1–2s; chỉnh time range |

## References (ưu tiên tiếng Anh)
- Elastic docs (get started) — https://www.elastic.co/docs/get-started
- Subscriptions (license) — https://www.elastic.co/subscriptions
- ECS — https://www.elastic.co/guide/en/ecs/current/index.html
- JVM heap settings — https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- vm.max_map_count — https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html
- Auto security setup (enrollment) — https://www.elastic.co/docs/deploy-manage/security/self-auto-setup
- Elastic free training — https://www.elastic.co/training

> **Đối chiếu thuật ngữ:** index/document/mapping/shard/replica · heap = vùng nhớ JVM ·
> aggregation = phép tổng hợp · data stream = luồng dữ liệu chỉ-ghi-thêm · enrollment
> token = mã ghi danh. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
