# 08 — Kibana: Data view, Discover, Lens, Maps & Dashboard

> **Người đọc chính: C.** Mục tiêu: từ dữ liệu đã vào ES, dựng **dashboard giám sát
> luồng truy cập** (R6) và **bản đồ GeoIP** (R5). Đây là "phòng điều khiển" nhóm sẽ
> demo.

## Mục tiêu chương
- Tạo **Data view** (cửa sổ Kibana nhìn vào index).
- Dùng **Discover** để soi log thô, **Lens** để vẽ biểu đồ, **Maps** để vẽ bản đồ.
- Dựng **dashboard 6 panel bắt buộc + 1 panel sức khoẻ** (đếm parse-failure).
- Hiểu **timezone** để biểu đồ không lệch giờ.

## Cần biết gì trước
- [05](05-elk-kien-truc.md) (keyword vs text — vì sao aggregate cần keyword), [06](06-thu-thap-va-xu-ly-log.md) (log đã vào), [07](07-geoip.md) (geo_point).

---

## 1. Data view — cửa sổ nhìn vào dữ liệu

Kibana không đọc thẳng index; nó cần một **Data view** (trước gọi index pattern) khớp
tên index + chỉ ra field thời gian.

```
[Kibana UI] → Stack Management → Data Views → Create
  Name/pattern: logs-nginx.access-lab-*   (khớp index của pipeline)
  Timestamp field: @timestamp             ← bắt buộc để dùng bộ lọc thời gian
```
> Không có field thời gian → dashboard không lọc theo thời gian được. Đảm bảo
> `@timestamp` đã map kiểu `date` ([06](06-thu-thap-va-xu-ly-log.md)).

---

## 2. Discover — soi log thô (kiểm tra dữ liệu đúng)

`[Kibana UI] → Discover`, chọn data view + khoảng thời gian. Đây là nơi **xác nhận
log chảy đúng** (sinh **E4**): mỗi document là một request, có `source.ip`,
`http.response.status_code`, `source.geo.country_name`, `user_agent.name`...

Lọc nhanh bằng **KQL** (thanh tìm kiếm):
```
http.response.status_code >= 400
url.path : "/login.php" and http.request.method : "POST"
source.geo.country_iso_code : "VN"
```

---

## 3. Lens — vẽ biểu đồ (kéo-thả)

`[Kibana UI] → Visualize → Lens`. Kéo field vào trục. Nhớ: field nhóm phải là
`keyword` (xem [05](05-elk-kien-truc.md)).

| Biểu đồ cần | Kiểu Lens | Trục / phép tính |
|---|---|---|
| Request theo thời gian | Line/Bar | X = `@timestamp` (bucket 1m), Y = Count |
| Phân bố status code | Bar/Donut | tách theo `http.response.status_code` |
| Top 10 URL | Data table | `terms` trên `url.path`, Y = Count |
| Top source IP | Data table | `terms` trên `source.ip` |
| Top user-agent | Bar | `terms` trên `user_agent.name` |
| Top quốc gia | Data table | `terms` trên `source.geo.country_name` |

---

## 4. Maps — bản đồ GeoIP (R5)

`[Kibana UI] → Maps → Create map`. Hai layer nên có:

**Layer 1 — điểm truy cập (clusters/heat):**
```
Add layer → "Clusters and grids" (hoặc "Heat map") → chọn Data view logs-nginx.access-*
→ Geospatial field = source.geo.location → Add layer.
```

**Layer 2 — tô màu theo quốc gia (choropleth), từng bước:**
```
1) Add layer → chọn "Choropleth".
2) Boundaries source = "EMS Boundaries" → chọn "World Countries".
3) Statistics source = Data view logs-nginx.access-*.
4) Join field:  EMS field = "ISO 3166-1 alpha-2 code"  ↔  data field = source.geo.country_iso_code.
5) Metric = Count (số request mỗi nước).
6) Add layer → chỉnh thang màu (fill color by Count).
```
Kèm một bảng Lens "top country" (`terms` trên `source.geo.country_name`) bên cạnh →
thành **E6** (bản đồ ≥3 nước + bảng). Tutorial chính thức:
https://www.elastic.co/guide/en/kibana/current/maps-getting-started.html

---

## 5. Dashboard: 6 panel bắt buộc + 1 panel sức khoẻ (E8)

`[Kibana UI] → Dashboard → Create`, thêm các visualization trên. Mỗi panel nêu **câu
hỏi vận hành nó trả lời**:

| Panel | Trả lời câu hỏi |
|---|---|
| 1. Request/phút (line) | Lưu lượng đang bao nhiêu? có đột biến không? |
| 2. Phân bố status (bar/donut) | Tỉ lệ lỗi 4xx/5xx có tăng bất thường? |
| 3. Top URL (table) | Đang bị gọi nhiều vào đâu? (login? trang lạ?) |
| 4. Top source IP (table) | IP nào tạo nhiều request nhất? |
| 5. Bản đồ (Maps) | Truy cập đến từ đâu? có nước lạ? |
| 6. Top user-agent (bar) | Có công cụ/scanner (curl, sqlmap)? |
| **7. Đếm parse-failure** (metric) | **Hệ thu log có đang HỎNG ÂM THẦM không?** |

> **Panel 7 là bắt buộc và ăn điểm:** đếm document trong `logs-*-failed-lab` hoặc có
> tag `_jsonparsefailure`/`_geoip_lookup_failure`. Nó biến "hỏng âm thầm" thành "hỏng
> nhìn thấy" — đúng tinh thần **OWASP A09 (Logging & Alerting Failures)**. Đây cũng là
> nền cho **Rule 8 "giám sát chính hệ giám sát"** ([09](09-phat-hien-bat-thuong.md)).

---

## 6. Timezone — vì sao biểu đồ lệch 7 tiếng

ES lưu thời gian theo **UTC**; Kibana hiển thị theo **giờ trình duyệt** (Việt Nam =
ICT = UTC+7). Nếu thấy dữ liệu "trong tương lai" hoặc lệch 7 tiếng, gần như luôn là
**timezone**, không phải pipeline hỏng. Có thể cố định trong
`Advanced Settings → dateFormat:tz`. Đảm bảo cả 2 server đặt UTC + có `date` filter
([06](06-thu-thap-va-xu-ly-log.md)).

---

## Bàn giao & bằng chứng
- Sinh **E8** (dashboard đủ 7 panel) + phối hợp **E6** (bản đồ) với [07](07-geoip.md).
- Dashboard là nền để [09](09-phat-hien-bat-thuong.md) đặt rule và [10](10-kiem-thu-va-demo.md) quan sát khi test.

## Câu hỏi bảo vệ
1. Data view là gì, vì sao cần field thời gian?
2. Vì sao "top 10 URL" cần field `keyword`?
3. Bản đồ dùng field nào, kiểu gì?
4. Panel parse-failure để làm gì, liên quan OWASP A09 ra sao?
5. Biểu đồ lệch 7 tiếng — nguyên nhân?

## Lỗi thường gặp
| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| "field is not aggregatable" | field là `text` | dùng `.keyword` / khai `keyword` trong template |
| Dashboard trống | sai time range / data view / timezone | thang 5 điểm ([06](06-thu-thap-va-xu-ly-log.md)) |
| Maps không có layer geo | `source.geo.location` không `geo_point` | sửa template, reindex |
| Bản đồ 1 điểm | traffic 1 IP | đa dạng IP ([10](10-kiem-thu-va-demo.md)) |

## References (ưu tiên tiếng Anh)
- Kibana Data views — https://www.elastic.co/docs/explore-analyze/find-and-organize/data-views
- Kibana Maps getting started — https://www.elastic.co/guide/en/kibana/current/maps-getting-started.html
- Kibana Lens — https://www.elastic.co/guide/en/kibana/current/lens.html
- KQL — https://www.elastic.co/guide/en/kibana/current/kuery-query.html

> **Đối chiếu thuật ngữ:** data view = cửa sổ dữ liệu · Discover = xem log · Lens = vẽ
> biểu đồ · choropleth = bản đồ tô màu theo vùng · panel = ô biểu đồ. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
