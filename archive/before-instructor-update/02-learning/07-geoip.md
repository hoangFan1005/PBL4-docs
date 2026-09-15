# 07 — GeoIP: định vị IP nguồn

> **Người đọc chính: C.** Đây là một trong hai đầu ra được chấm (R5). Mục tiêu: hiểu
> **cơ chế** IP → toạ độ, cấu hình được geoip, hiểu **vì sao `geo_point` bắt buộc**,
> và trung thực về **giới hạn độ chính xác** (phần này ăn điểm khi bảo vệ).

## Mục tiêu chương
- Hiểu GeoIP hoạt động thế nào (cơ sở dữ liệu ánh xạ IP → vị trí).
- Cấu hình geoip (Logstash filter hoặc ES ingest processor) + nguồn database.
- Hiểu `geo_point` và vì sao chuỗi IP không tự lên bản đồ.
- Xử lý IP private + biết vì sao bản đồ trống, và nêu đúng giới hạn độ chính xác.

## Cần biết gì trước
- [01 Mạng](01-nen-tang-mang.md) (public/private IP), [05](05-elk-kien-truc.md) (mapping/geo_point), [06](06-thu-thap-va-xu-ly-log.md) (pipeline).

---

## 1. GeoIP là gì — cơ chế

IP **tự nó không chứa toạ độ**; nó chỉ là một con số. GeoIP tra **một cơ sở dữ liệu**
ánh xạ *dải IP → quốc gia/thành phố/toạ độ*. Các nhà cung cấp (MaxMind, DB-IP...) xây
database này từ đăng ký IP, dữ liệu ISP, đo đạc mạng.

```
"203.0.113.45"  ──tra database (.mmdb)──►  { country: VN, city: Da Nang, lat: 16.05, lon: 108.2 }
```

**Analogy:** giống tra **danh bạ** biển số xe → tỉnh cấp. Bản thân biển số không "là"
tỉnh; phải có bảng tra.

Hai chỗ có thể chạy geoip trong đồ án:
- **Logstash `geoip` filter** (nhóm dùng — hợp với pipeline Logstash).
- **Elasticsearch `geoip` ingest processor** (dùng khi đi hướng Filebeat→ES).

---

## 2. Nguồn cơ sở dữ liệu (chọn 1)

| Cách | Cần gì | Ưu / Nhược |
|---|---|---|
| **Downloader của Elastic** (`geoip.elastic.co`) | Có Internet trên máy ELK | Không cần tài khoản MaxMind; DB re-license CC BY-SA; tự cập nhật mỗi 3 ngày. **Không mạng 30 ngày → ngừng enrich**, gắn tag `_geoip_expired_database` |
| **MaxMind GeoLite2 trực tiếp** | Tài khoản MaxMind (miễn phí) + **license key** | Tự chủ; cập nhật bằng `geoipupdate` (cron); phải tuân **EULA** (ghi công) |
| **IPinfo Lite** | ES 8.15+ hỗ trợ native provider | thay thế MaxMind, cấu hình qua API geoip database |

**GeoLite2 trực tiếp (nếu chọn):**
```bash
# [EC2-ELK]  cài geoipupdate, điền AccountID + LicenseKey vào /etc/GeoIP.conf
sudo apt install -y geoipupdate
# /etc/GeoIP.conf:
#   AccountID  <id>
#   LicenseKey <key>
#   EditionIDs GeoLite2-City GeoLite2-Country GeoLite2-ASN
sudo geoipupdate                       # tải .mmdb về /usr/share/GeoIP/ hoặc /var/lib/GeoIP/
```
Rồi trỏ Logstash filter tới file (khi tắt downloader):
```ruby
# trong logstash.yml:  xpack.geoip.downloader.enabled: false
geoip { source => "[source][ip]" database => "/var/lib/GeoIP/GeoLite2-City.mmdb" }
```

> **EULA cần ghi trong báo cáo:** *"This product includes GeoLite2 data created by
> MaxMind, available from https://www.maxmind.com"*. Không commit license key lên repo
> công khai; không phát tán DB thô.

---

## 3. `geo_point` — vì sao chuỗi IP không tự lên bản đồ

- geoip sinh ra toạ độ và đặt vào **`source.geo.location`**. Nhưng để **Kibana Maps**
  vẽ được, field đó **phải có kiểu `geo_point`** trong mapping.
- Dynamic mapping **không bao giờ tự đoán `geo_point`** — nó sẽ coi là `object`/`float`
  → Maps không nhận ra. Vì vậy [chương 06](06-thu-thap-va-xu-ly-log.md) khai `geo_point`
  trong template **trước khi** ingest.
- `geo_point` nhận nhiều định dạng: `{"lat":16.05,"lon":108.2}`, `"16.05,108.2"`,
  `[108.2, 16.05]` (mảng đảo ngược lon,lat!), WKT, geohash.

**Analogy MySQL:** giống cột `POINT` + spatial index vs `VARCHAR`. Bạn có thể để
`"16.05,108.2"` trong VARCHAR, nhưng không hỏi "điểm nào trong bán kính 50km" hay vẽ
được — phải là kiểu toạ độ thật.

Hai chặng cần nhớ: **`source.ip` (kiểu `ip`) → tra database → `source.geo.location`
(kiểu `geo_point`)**.

---

## 4. IP private & vì sao bản đồ trống

IP private (`10.*`, `172.16–31.*`, `192.168.*`) và loopback **không có trong database**
GeoIP (chúng tồn tại ở mọi mạng nội bộ, không thuộc quốc gia nào — giống "số máy lẻ
nội bộ"). Tra sẽ thất bại.

Pipeline đã **bỏ qua** chúng bằng `cidr` guard ([06](06-thu-thap-va-xu-ly-log.md)),
gắn tag `private_ip`. Với IP public tra không ra, geoip gắn `_geoip_lookup_failure`.

> **Cây quyết định "vì sao bản đồ trống":**
> 1. `source.geo.location` có phải `geo_point` không? (`GET /_mapping`) — nếu không → template sai, ingest lại.
> 2. `source.ip` có phải IP **public** không? IP private không lên bản đồ (đúng như vậy).
> 3. Đếm `_geoip_lookup_failure` (trong **Kibana → Dev Tools**, JSON xuống dòng, không có `-d`) — sinh **E7**:
>    ```
>    GET logs-*/_count
>    { "query": { "term": { "tags": "_geoip_lookup_failure" } } }
>    ```
> 4. Data view + time range đúng chưa? (thang 5 điểm [06](06-thu-thap-va-xu-ly-log.md))
> 5. Traffic có đến từ nhiều nước không? Nếu mọi request từ 1 IP VN → bản đồ chỉ 1 điểm (xem [10](10-kiem-thu-va-demo.md) để đa dạng IP).

---

## 5. Giới hạn độ chính xác (nêu trong báo cáo — ăn điểm)

Trung thực về giới hạn cho thấy nhóm hiểu công cụ:
- Chính xác **cấp quốc gia ~99.8%** (số của MaxMind), nhưng **cấp thành phố thấp hơn
  nhiều** — MaxMind nêu ~66–80% nằm trong bán kính 50km, các nghiên cứu độc lập còn
  thấp hơn. Dùng field **accuracy radius**, đừng coi toạ độ là chính xác tới đường phố.
  Nguồn: https://support.maxmind.com/hc/en-us/articles/4414762983195
- Database cũ **giảm ~1.5%/tháng** độ chính xác → cần cập nhật định kỳ.
- **VPN/proxy/NAT/anycast** làm sai lệch: IP nổi tiếng như `8.8.8.8`, `1.1.1.1` có thể
  định vị lệch — chính là minh hoạ sống cho giới hạn này khi demo.
- Nhiều người sau **NAT** dùng chung 1 public IP → "1 IP ≠ 1 người".

---

## Bàn giao & bằng chứng
- Sinh **E6** (bản đồ Maps ≥3 nước + bảng top country từ traffic thật) — phối hợp [08](08-kibana-dashboard.md).
- Sinh **E7** (số đếm `_geoip_lookup_failure` + giải thích IP nào không lên bản đồ).
- Đầu ra tiêu thụ bởi [08 Kibana](08-kibana-dashboard.md) (bản đồ) và [09](09-phat-hien-bat-thuong.md) (rule geo-anomaly).

## Câu hỏi bảo vệ
1. IP có "chứa" vị trí không? GeoIP lấy toạ độ từ đâu?
2. Vì sao `source.geo.location` phải là `geo_point`, và điều gì xảy ra nếu để dynamic mapping đoán?
3. Vì sao IP `10.0.1.x` không lên bản đồ? Làm sao phân biệt "IP nội bộ" với "tra thất bại"?
4. Độ chính xác GeoIP có giới hạn gì? Vì sao `8.8.8.8` có thể định vị lệch?
5. Nghĩa vụ EULA khi dùng GeoLite2 trong báo cáo là gì?

## Lỗi thường gặp
| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Maps không thấy field để vẽ | `source.geo.location` không phải `geo_point` | tạo template đúng, reindex |
| Mọi điểm ở 1 chỗ | traffic từ 1 IP | đa dạng IP ([10](10-kiem-thu-va-demo.md)) |
| Nhiều `_geoip_lookup_failure` | IP private / DB hết hạn | cidr guard; cập nhật DB |
| `_geoip_expired_database` | máy ELK mất mạng >30 ngày | cho ES/Logstash ra Internet hoặc dùng DB local + geoipupdate |

## References (ưu tiên tiếng Anh)
- ES GeoIP processor — https://www.elastic.co/guide/en/elasticsearch/reference/current/geoip-processor.html
- Logstash geoip database management — https://www.elastic.co/docs/reference/logstash/configuring-geoip-database-management
- MaxMind GeoLite2 — https://dev.maxmind.com/geoip/geolite2-free-geolocation-data · geoipupdate — https://github.com/maxmind/geoipupdate
- MaxMind accuracy — https://support.maxmind.com/hc/en-us/articles/4414762983195
- geo_point mapping — https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/geo-point

> **Đối chiếu thuật ngữ:** GeoIP = định vị theo IP · geo_point = kiểu toạ độ · lookup
> failure = tra thất bại · accuracy radius = bán kính sai số. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
