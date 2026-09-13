# 06 — Thu thập & xử lý log (Filebeat · Logstash · template · ILM)

> **Người đọc chính: C (parse/enrich) + A (transport).** Mục tiêu: đưa **một dòng log
> từ file trên EC2-WEB → thành một document ECS trong Elasticsearch**, qua Filebeat →
> Logstash. Chương này chứa các config **copy-paste được** đã kiểm theo phiên bản 9.5.3.

## Mục tiêu chương
- Cấu hình Filebeat (dùng `filestream`, gửi nguyên dòng — Logstash mới giải mã JSON).
- Viết Logstash pipeline: `json → date → mutate(rename/convert) → geoip → useragent → elasticsearch`.
- **Tạo index template có `geo_point` TRƯỚC khi ingest** (nếu không, mapping bị đoán sai → phải làm lại).
- Đặt **ILM** để không đầy đĩa. Route lỗi parse sang stream riêng (không bỏ đi).
- Nắm **thang 5 điểm** khi "Kibana không thấy dữ liệu".

## Cần biết gì trước
- [05 ELK kiến trúc](05-elk-kien-truc.md) (mapping/shard/data stream/security), [CONTRACT.md](../CONTRACT.md) (tên trường ECS), [04](04-web-server-va-app.md) (log JSON đã sinh).

---

## 0. Cài đặt Elastic Stack (kho APT) — làm đầu tiên

Elasticsearch/Kibana/Logstash/Filebeat **không có sẵn** trong kho Ubuntu; phải thêm
**kho APT của Elastic** (một lần).

```bash
# [EC2-ELK]  (và [EC2-WEB] cho riêng Filebeat)  — thêm GPG key + kho Elastic 9.x
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elastic-9.gpg
echo "deb [signed-by=/usr/share/keyrings/elastic-9.gpg] https://artifacts.elastic.co/packages/9.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-9.x.list
sudo apt update
```

Cài trên **EC2-ELK** (ES + Kibana + Logstash). **Lưu lại mật khẩu `elastic` in ra khi
cài ES** (chỉ hiện một lần — như MySQL 8 in mật khẩu root tạm):
```bash
# [EC2-ELK]
sudo apt install -y elasticsearch kibana logstash
sudo systemctl enable --now elasticsearch      # lần đầu: in ra mật khẩu 'elastic' + tự tạo TLS/CA
sudo systemctl enable --now kibana
# nếu lỡ mất mật khẩu 'elastic':
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic
# nối Kibana bằng enrollment token (hạn 30') rồi mở http://localhost:5601 (qua SSH port-forward):
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s kibana
```
Cài **Filebeat** trên **EC2-WEB** (chỉ Filebeat, không cài ES/Kibana ở đây):
```bash
# [EC2-WEB]  (đã thêm kho Elastic như trên)
sudo apt install -y filebeat
```
> **Pin version:** `sudo apt-mark hold elasticsearch kibana logstash filebeat` để cả
> stack ở cùng 9.5.3, tránh `apt upgrade` làm lệch version.

### 0.1 Tạo user quyền tối thiểu cho Logstash & cron alert (bắt buộc)
Đừng dùng superuser `elastic` cho pipeline/cron. Tạo role + 2 user (chạy trong Kibana
Dev Tools hoặc curl `--cacert ... -u elastic`):
```json
// [Kibana UI → Dev Tools]  role chỉ ghi log
PUT _security/role/pbl4_writer
{ "cluster": ["monitor","manage_index_templates","manage_ilm"],
  "indices": [ { "names": ["logs-*"], "privileges": ["create_index","create","write","view_index_metadata","manage"] } ] }

PUT _security/user/logstash_writer
{ "password": "DOI_MAT_KHAU", "roles": ["pbl4_writer"] }

// role chỉ ĐỌC log (cho cron alert ở chương 09)
PUT _security/role/pbl4_reader
{ "indices": [ { "names": ["logs-*"], "privileges": ["read","view_index_metadata"] } ] }

PUT _security/user/alert_reader
{ "password": "DOI_MAT_KHAU", "roles": ["pbl4_reader"] }
```
Đưa mật khẩu vào **Logstash keystore** (không ghi thẳng trong file config, không lộ khi restart):
```bash
# [EC2-ELK]
sudo /usr/share/logstash/bin/logstash-keystore --path.settings /etc/logstash create
sudo /usr/share/logstash/bin/logstash-keystore --path.settings /etc/logstash add LOGSTASH_ES_PASSWORD
# ↑ nhập mật khẩu của logstash_writer; pipeline tham chiếu ${LOGSTASH_ES_PASSWORD}
```
> Đây là các user mà [pipeline §4](#4-logstash-pipeline-etclogstashconfdnginxconf) và
> [cron alert ở chương 09](09-phat-hien-bat-thuong.md#4-cảnh-báo-3-tầng-đảm-bảo-có-bằng-chứng-dù-license-basic) dùng tới. Xem [Bàn giao #5](../01-work-breakdown/05-hop-dong-ban-giao.md).

> **Phương án nhẹ hơn cho máy 4GB** (nếu Logstash làm ELK hụt RAM): bỏ Logstash, dùng
> **Filebeat → Elasticsearch** + **ingest pipeline** (geoip processor). Xem [05 §4](05-elk-kien-truc.md).

---

## 1. Thứ tự làm ĐÚNG (quan trọng)
```
(1) Tạo index template có geo_point   ← LÀM TRƯỚC
(2) Tạo ILM policy
(3) Viết & test Logstash pipeline OFFLINE với file log mẫu
(4) Cấu hình Filebeat trên EC2-WEB
(5) Mở port 5044 (SG) + phân phối CA
(6) Bật Filebeat → xem document vào ES → Discover
```
> **Vì sao (1) trước:** ES **không đổi được kiểu field sau khi đã có document**. Nếu
> document vào trước khi có template, `source.geo.location` bị đoán là `object`/`float`
> → Kibana Maps không nhận ra field bản đồ → phải xoá index & ingest lại. Đây là lỗi
> chết người phổ biến nhất. (Bàn giao #6 trong [hợp đồng bàn giao](../01-work-breakdown/05-hop-dong-ban-giao.md).)

---

## 2. Index template có `geo_point` (làm trước tiên)

```json
// [Kibana UI → Dev Tools]  hoặc  curl --cacert ... -u elastic -X PUT
PUT _index_template/pbl4-logs
{
  "index_patterns": ["logs-nginx.access-*", "logs-shop.auth-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.lifecycle.name": "pbl4-logs-ilm"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "log_dataset": { "type": "keyword" },
        "source": {
          "properties": {
            "ip": { "type": "ip" },
            "geo": {
              "properties": {
                "location":         { "type": "geo_point" },
                "country_iso_code": { "type": "keyword" },
                "country_name":     { "type": "keyword" },
                "city_name":        { "type": "keyword" },
                "region_name":      { "type": "keyword" }
              }
            }
          }
        },
        "user":       { "properties": { "name": { "type": "keyword" } } },
        "network":    { "properties": { "forwarded_ip": { "type": "keyword" } } },
        "user_agent": {
          "properties": {
            "original": { "type": "keyword" },
            "name":     { "type": "keyword" },
            "os":       { "properties": { "name": { "type": "keyword" } } }
          }
        },
        "url":   { "properties": {
                     "original": { "type": "keyword" },
                     "path":     { "type": "keyword" },
                     "query":    { "type": "keyword" },
                     "domain":   { "type": "keyword" } } },
        "http":  { "properties": {
                     "request":  { "properties": {
                                     "method":       { "type": "keyword" },
                                     "referrer":     { "type": "keyword" },
                                     "bytes":        { "type": "long" },
                                     "duration_sec": { "type": "float" } } },
                     "response": { "properties": {
                                     "status_code": { "type": "long" },
                                     "body": { "properties": { "bytes": { "type": "long" } } } } } } },
        "event": { "properties": { "action": { "type": "keyword" }, "dataset": { "type": "keyword" } } }
      }
    }
  }
}
```
Kiểm tra (sinh bằng chứng **E5**, có dấu thời gian **trước** document đầu tiên):
```
GET /_index_template/pbl4-logs
```

---

## 3. ILM policy (chống đầy đĩa)

ES có "watermark" 85/90/95% — đầy 95% thì index **chuyển read-only**, log ngừng vào
(lỗi khó hiểu). Đặt ILM xoá log cũ + volume ELK ≥30GB.

```json
// [Kibana UI → Dev Tools]
PUT _ilm/policy/pbl4-logs-ilm
{
  "policy": { "phases": {
    "delete": { "min_age": "14d", "actions": { "delete": {} } }
  } }
}
```
> **Vì sao chỉ có phase `delete` (không `rollover`):** nhóm dùng **index theo ngày**
> (`logs-nginx.access-lab-2026.09.08`), mỗi ngày một index. Với index thường (không
> rollover), ILM tính tuổi từ **lúc index được tạo**, nên phase `delete min_age: 14d`
> tự xoá index cũ hơn 14 ngày — không cần rollover/alias. Policy này **đã được gắn**
> vào mọi index qua `index.lifecycle.name` trong template ở §2 (đó là bước "gắn" —
> tạo policy không thôi thì chưa có tác dụng). Muốn dùng **data stream** thật thì thêm
> `"data_stream": {}` vào template + `data_stream => true` ở output Logstash và giữ
> lại phase rollover; đồ án chọn index-theo-ngày cho đơn giản.

---

## 4. Logstash pipeline (`/etc/logstash/conf.d/nginx.conf`)

> Lưu ý phiên bản (đã xác nhận cho 9.5.3): `pipeline.ecs_compatibility` mặc định **`v8`**
> → filter `geoip` với `source => "[source][ip]"` **tự** ghi ra `source.geo.*`. Không
> cần set target. Đây là điểm khác blog cũ (xem [CONTRACT cảnh báo](../CONTRACT.md)).

```ruby
# [EC2-ELK]  /etc/logstash/conf.d/nginx.conf
input {
  beats { port => 5044 }
}

filter {
  # Giải mã JSON MỘT LẦN (Filebeat gửi nguyên dòng trong `message`, KHÔNG bật ndjson —
  # nếu decode 2 nơi sẽ vỡ). Kết quả vào [doc].
  json { source => "message" target => "doc" }

  date { match => ["[doc][time]", "ISO8601"] target => "@timestamp" }   # $time_iso8601 / date('c')

  # PHÂN NHÁNH theo trường phân loại do Filebeat gắn (log_dataset), xem §5.
  if [log_dataset] == "nginx.access" {
    mutate {
      rename => {
        "[doc][remote_addr]"      => "[source][ip]"
        "[doc][user_agent]"       => "[user_agent][original]"
        "[doc][uri]"              => "[url][original]"
        "[doc][method]"           => "[http][request][method]"
        "[doc][status]"           => "[http][response][status_code]"
        "[doc][body_bytes_sent]"  => "[http][response][body][bytes]"
        "[doc][request_time]"     => "[http][request][duration_sec]"
        "[doc][host]"             => "[url][domain]"
        "[doc][referer]"          => "[http][request][referrer]"
        "[doc][x_forwarded_for]"  => "[network][forwarded_ip]"
        "[doc][request_length]"   => "[http][request][bytes]"
      }
      add_field => { "[event][dataset]" => "nginx.access" }
    }
    # tách path & query từ url.original (giúp rule login/scan chính xác)
    grok { match => { "[url][original]" => "%{URIPATH:[url][path]}(?:\?%{GREEDYDATA:[url][query]})?" }
           tag_on_failure => ["_urlparsefailure"] }
  }
  else if [log_dataset] == "shop.auth" {
    mutate {
      rename => {
        "[doc][event]"      => "[event][action]"    # login_success | login_failed
        "[doc][client_ip]"  => "[source][ip]"
        "[doc][path]"       => "[url][path]"
        "[doc][user_agent]" => "[user_agent][original]"
        "[doc][email]"      => "[user][name]"
      }
      add_field => { "[event][dataset]" => "shop.auth" }
    }
  }

  # DÙNG CHUNG: bỏ qua geoip với IP private/loopback (không có toạ độ)
  cidr { address => ["%{[source][ip]}"]
         network => ["10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","127.0.0.0/8"]
         add_tag => ["private_ip"] }
  if "private_ip" not in [tags] {
    geoip { source => "[source][ip]" }              # ecs v8 → ghi [source][geo][*], location = geo_point
  }
  if [user_agent][original] {
    useragent { source => "[user_agent][original]" target => "user_agent" }
  }
  mutate {
    convert => {
      "[http][response][status_code]"   => "integer"
      "[http][response][body][bytes]"   => "integer"
      "[http][request][bytes]"          => "integer"
      "[http][request][duration_sec]"   => "float"
    }
  }
}

output {
  # Lỗi parse KHÔNG bỏ đi — route sang index riêng để còn debug
  if "_jsonparsefailure" in [tags] {
    elasticsearch {
      hosts => ["https://localhost:9200"]
      index => "logs-failed-lab-%{+yyyy.MM.dd}"
      user => "logstash_writer" password => "${LOGSTASH_ES_PASSWORD}"
      ssl_certificate_authorities => ["/etc/logstash/certs/http_ca.crt"]
    }
  } else if [event][dataset] == "shop.auth" {
    elasticsearch {
      hosts => ["https://localhost:9200"]
      index => "logs-shop.auth-lab-%{+yyyy.MM.dd}"
      user => "logstash_writer" password => "${LOGSTASH_ES_PASSWORD}"
      ssl_certificate_authorities => ["/etc/logstash/certs/http_ca.crt"]
    }
  } else {
    elasticsearch {
      hosts => ["https://localhost:9200"]
      index => "logs-nginx.access-lab-%{+yyyy.MM.dd}"
      user => "logstash_writer" password => "${LOGSTASH_ES_PASSWORD}"
      ssl_certificate_authorities => ["/etc/logstash/certs/http_ca.crt"]
    }
  }
}
```

> **Deprecated — đừng dùng:** `document_type` (bị bỏ), `index => "nginx-%{+...}"` với
> Filebeat data stream (bị bỏ qua). Xem [CONTRACT](../CONTRACT.md).

**Phát triển OFFLINE trước (Bàn giao #3):**
```bash
# [máy cá nhân / EC2-ELK]
logstash -f nginx.conf --config.test_and_exit          # chỉ kiểm cú pháp
# rồi tạm đổi input thành file mẫu + output rubydebug để xem kết quả parse:
#   input { file { path => "/tmp/sample-access.json.log" start_position => "beginning" sincedb_path => "/dev/null" } }
#   output { stdout { codec => rubydebug } }
```
Chỉ khi 20 dòng mẫu parse sạch (không `_jsonparsefailure`) mới nối Filebeat thật.

---

## 5. Filebeat trên EC2-WEB (`/etc/filebeat/filebeat.yml`)

> **Phiên bản 9.x vô hiệu hoá `type: log` mặc định** (chỉ chạy lại nếu thêm
> `allow_deprecated_use: true`) → nên dùng `type: filestream`. Config cũ chép nguyên
> si dễ **không khởi động**.

```yaml
# [EC2-WEB]  /etc/filebeat/filebeat.yml
# LƯU Ý: KHÔNG bật parser ndjson — Logstash sẽ giải mã JSON (decode MỘT chỗ, xem §4).
# Filebeat gửi nguyên dòng trong `message` + gắn nhãn log_dataset để Logstash phân nhánh.
filebeat.inputs:
  - type: filestream
    id: nginx-access-json
    enabled: true
    paths:
      - /var/log/nginx/access.json.log
    fields_under_root: true
    fields:
      log_dataset: "nginx.access"
  - type: filestream
    id: shop-auth-json
    enabled: true
    paths:
      - /var/log/shop/auth.json.log
    fields_under_root: true
    fields:
      log_dataset: "shop.auth"

output.logstash:
  hosts: ["<PRIVATE_IP_ELK>:5044"]        # dùng PRIVATE IP (miễn phí, ổn định khi stop/start)
  # ssl.certificate_authorities: ["/etc/filebeat/certs/http_ca.crt"]   # nếu bật TLS beats→logstash
```
Chạy nền:
```bash
# [EC2-WEB]
sudo systemctl enable --now filebeat
sudo filebeat test output          # kiểm tra kết nối tới Logstash
```

---

## 6. Đường truyền (A phụ trách): mở port + CA
- Mở **5044** trên SG của EC2-ELK, **nguồn = SG của EC2-WEB** (không hard-code IP — xem [03](03-cloud-va-aws.md)).
- **Không** mở 9200 ra ngoài. Filebeat dùng **private IP** của ELK.
- Nếu bật TLS: phân phối CA của ES cho Filebeat/Logstash (Bàn giao #5).

Kiểm tra thông tuyến:
```bash
# [EC2-WEB]
nc -vz <PRIVATE_IP_ELK> 5044        # phải "succeeded"
```

---

## 7. Thang 5 điểm khi "Kibana không thấy dữ liệu" (dùng đúng thứ tự)
1. **nginx có ghi không?** `tail -f /var/log/nginx/access.json.log` (tạo 1 request thử).
2. **Filebeat có đọc & gửi không?** `sudo filebeat -e` (chạy nổi, xem log) / `sudo filebeat test output`.
3. **Logstash có nhận không?** `curl localhost:9600/_node/stats` (xem `events.in`) hoặc tạm thêm `stdout`.
4. **ES có lưu không?** `GET /_cat/indices?v` và `GET /_cat/data_streams` (đếm doc tăng).
5. **Kibana có nhìn đúng data view + time range không?** ← **thủ phạm phổ biến nhất**:
   "Last 15 minutes" + hiểu nhầm **timezone** (ES lưu UTC, Kibana hiện theo giờ trình
   duyệt = ICT UTC+7). Lệch 7 tiếng gần như luôn là timezone, không phải pipeline hỏng.

> **Quy tắc thời gian:** đặt cả 2 server về UTC (`sudo timedatectl set-timezone UTC`),
> **luôn** dùng `date` filter với `$time_iso8601` — quên nó thì mọi event bị đóng dấu
> theo giờ ingest, biểu đồ dồn thành một cột.

---

## Bàn giao & bằng chứng
- Sinh **E4** (1 dòng JSON thô ↔ `_source` document, chú thích trường Logstash thêm),
  **E5** (template có `geo_point`, trước document đầu tiên).
- Đầu ra tiêu thụ bởi: [07 GeoIP](07-geoip.md), [08 Kibana](08-kibana-dashboard.md), [09 Detection](09-phat-hien-bat-thuong.md).

## Câu hỏi bảo vệ
1. Vì sao phải tạo index template **trước** khi ingest? Nếu không thì hỏng thế nào?
2. Vì sao Filebeat 9.x không dùng `type: log` được nữa?
3. `ecs_compatibility=v8` ảnh hưởng đường dẫn field geoip ra sao?
4. Log đi từ file trên EC2-WEB tới document trong ES qua những chặng nào?
5. Dashboard trống — bạn kiểm theo thứ tự nào?

## Lỗi thường gặp
| Triệu chứng (nguyên văn) | Nguyên nhân | Cách sửa |
|---|---|---|
| Filebeat không chạy, log nhắc `type: log` | dùng input đã bỏ | đổi sang `type: filestream` |
| `_jsonparsefailure` | dòng không phải JSON hợp lệ / decode 2 lần | decode JSON **một chỗ** (Logstash `json`), kiểm log mẫu |
| bản đồ trống, field `source.geo.location` là `object` | ingest trước khi có template | xoá index, tạo template, ingest lại |
| `index.blocks.read_only_allow_delete` | đĩa >95% | dọn/tăng đĩa: `PUT /_all/_settings {"index.blocks.read_only_allow_delete": null}` |
| biểu đồ dồn 1 cột | quên `date` filter | thêm `date { match => [...] }` |

## References (ưu tiên tiếng Anh)
- Filebeat (filestream) — https://www.elastic.co/docs/reference/beats/filebeat/filebeat-installation-configuration
- Logstash geoip filter — https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-geoip · ECS in Logstash — https://www.elastic.co/docs/reference/logstash/ecs-ls
- Elasticsearch output plugin — https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Index templates — https://www.elastic.co/docs/manage-data/data-store/templates · ILM — https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle
- geo_point mapping — https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/geo-point

> **Đối chiếu thuật ngữ:** ingest = nạp dữ liệu · pipeline = đường ống xử lý · filter =
> bộ lọc/biến đổi · enrich = làm giàu · rollover = xoay vòng index · ILM = quản lý vòng
> đời index. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
