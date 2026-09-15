# 09 — Phát hiện hành vi bất thường

> **Người đọc chính: B (viết rule) + C (hỗ trợ query/alert).** Đây là đầu ra được chấm
> nặng nhất (R7). Mục tiêu: từ log đã vào ES, xây **các rule phát hiện tấn công web**,
> đặt **ngưỡng dựa trên baseline**, và **cảnh báo** trên license Basic (không ML).

## Mục tiêu chương
- Hiểu "bất thường" nghĩa là gì bằng ngôn ngữ SQL/aggregation.
- Xây **8 rule** cụ thể, mỗi rule có tín hiệu + query + ánh xạ **OWASP 2025**.
- Đặt **ngưỡng từ baseline** (không bịa số).
- Cảnh báo theo **3 tầng** (đảm bảo có bằng chứng dù license hạn chế).
- Nối **GeoIP với phát hiện** (rule geo-anomaly).

## Cần biết gì trước
- [05](05-elk-kien-truc.md) (aggregation, license Basic), [08](08-kibana-dashboard.md) (dashboard/KQL), [04](04-web-server-va-app.md) (app auth log), [CONTRACT](../CONTRACT.md) (tên trường).

---

## 1. "Bất thường" = một câu GROUP BY có HAVING

Với người biết MySQL, một rule phát hiện chính là:
```sql
SELECT source_ip, COUNT(*) FROM log
WHERE ts > NOW() - INTERVAL 1 MINUTE
GROUP BY source_ip HAVING COUNT(*) > 100;
```
Trong ES ta viết bằng **aggregation / ES|QL / KQL**. Bốn "họ" rule:
1. **Volume/rate** — đếm vượt ngưỡng (flood, brute-force).
2. **Error-ratio** — tỉ lệ lỗi cao (login thất bại nhiều, 404 nhiều).
3. **Rare-value** — giá trị hiếm (nước lạ, user-agent lạ).
4. **Pattern** — chuỗi khớp mẫu độc hại (SQLi/XSS trong URL).

> **Nguyên tắc "200 OK không có nghĩa an toàn":** một SQLi thành công vẫn trả `200`.
> Vì thế app tự ghi `login_failed`/`login_success` ([04](04-web-server-va-app.md)) —
> tín hiệu sạch hơn suy từ status code. Đây là lý do thiết kế đáng nêu khi bảo vệ.

---

## 2. Đặt ngưỡng từ BASELINE (không bịa)

Mỗi ngưỡng phải trỏ về **baseline** đo ở [chương 10](10-kiem-thu-va-demo.md) (bằng
chứng **E9**). Ví dụ: nếu baseline đỉnh 120 req/phút/toàn site và ~10 IP, thì "flood
1 IP" đặt ở *đỉnh baseline × k* cho một IP đơn (vd >300 req/phút/IP). Khi bảo vệ hỏi
"vì sao 300?", trả lời "gấp ~2.5 lần đỉnh baseline đo được", không phải "con số đẹp".

---

## 2b. Mồi nhanh: ES|QL & cách tạo rule trong Kibana

**ES|QL trong 5 dòng** (ngôn ngữ "ống" `|`, đọc từ trên xuống):
```esql
FROM logs-nginx.access-*          -- chọn nguồn (như FROM bảng)
| WHERE http.response.status_code >= 400   -- lọc (như WHERE)
| STATS hits = COUNT(*) BY source.ip       -- tổng hợp (như COUNT ... GROUP BY)
| WHERE hits > 100                          -- lọc sau tổng hợp (như HAVING)
| SORT hits DESC                            -- sắp xếp
```
`BUCKET(@timestamp, 5 minute)` = gom theo cửa sổ 5 phút; `COUNT_DISTINCT` = đếm giá
trị khác nhau (cardinality). Đối chiếu SQL ở [mục 1](#1-bất-thường--một-câu-group-by-có-having).

**Tạo một rule cảnh báo (Kibana Alerting) — click-path:**
```
[Kibana UI] → Stack Management → Alerts → Rules → Create rule
1) Đặt tên rule (vd "Brute-force login").
2) Chọn rule type: "Elasticsearch query" (hỗ trợ KQL/ES|QL, thuộc Basic).
3) Nhập query KQL/ES|QL (lấy từ §3), đặt "group by" = source.ip nếu cần.
4) Threshold + cửa sổ: vd "khi count > 20 trong 5 phút".
5) Check every: 1 phút (chu kỳ chạy rule).
6) Action = "Index" → ghi cảnh báo thành document (vào index vd `alerts-pbl4`),
   rồi dựng "dashboard cảnh báo"; hoặc "Server log". (Email/Slack cần trả phí → xem §4.)
7) Save. Chạy tấn công thử (chương 10) để xác nhận rule kích hoạt (bằng chứng E11).
```
> Rule type "Index threshold" cũng thuộc Basic, đơn giản hơn (đếm theo nhóm + ngưỡng)
> — hợp cho Rule 1/3/6. "Elasticsearch query" linh hoạt hơn (viết KQL/ES|QL tự do).

---

## 3. Danh mục 8 rule (E10)

Field theo [CONTRACT](../CONTRACT.md): `source.ip`, `http.response.status_code`,
`url.path`, `url.original`, `user_agent.original`, `http.response.body.bytes`,
`source.geo.country_iso_code`, `event.action`.

### Rule 1 — Brute-force login  ·  OWASP A07 (Authentication Failures)
Tín hiệu: nhiều POST tới login từ **một IP**, tỉ lệ thất bại cao, cửa sổ ngắn.
KQL (nền cho rule "Index threshold", group by `source.ip`, ngưỡng >20 trong 5m):
```
url.path : "/login.php" and http.request.method : "POST" and http.response.status_code >= 400
```
ES|QL (nhận biết tỉ lệ, chính xác hơn nhờ app auth log):
```esql
FROM logs-shop.auth-*
| WHERE event.action == "login_failed"
| STATS fails = COUNT(*) BY source.ip, BUCKET(@timestamp, 5 minute)
| WHERE fails > 20
```
> App auth log biến "đoán từ status" thành "đếm chính xác `login_failed`" → giảm báo động giả.

### Rule 2 — Credential stuffing  ·  OWASP A07
Tín hiệu: **nhiều IP khác nhau** cùng đập vào login.
```esql
FROM logs-nginx.access-*
| WHERE url.path == "/login.php" and http.request.method == "POST"
| STATS distinct_ips = COUNT_DISTINCT(source.ip) BY BUCKET(@timestamp, 5 minute)
| WHERE distinct_ips > 50
```
Tham chiếu: OWASP OAT-008 Credential Stuffing.

### Rule 3 — Quét thư mục / forced browsing  ·  OWASP A01 (Broken Access Control) / reconnaissance
Tín hiệu: nhiều 404 trên **nhiều URL khác nhau** từ một IP.
```esql
FROM logs-nginx.access-*
| WHERE http.response.status_code == 404
| STATS distinct_uris = COUNT_DISTINCT(url.path), hits = COUNT(*) BY source.ip
| WHERE distinct_uris > 30 AND hits > 30
```

### Rule 4 — Dò SQLi/XSS/path-traversal  ·  OWASP A05 (Injection)
Tín hiệu: URL/query chứa mẫu tấn công.
```
url.original : (*union*select* or *%27* or *' or 1=1* or *<script* or *../../* or *etc%2fpasswd*)
```
Tham chiếu mẫu thực tế: OWASP CRS (ModSecurity Core Rule Set) — nhóm dùng danh sách
rút gọn làm proxy, ghi rõ đây là bản đơn giản hoá.

### Rule 5 — Scanner user-agent  ·  reconnaissance
Tín hiệu: user-agent của công cụ.
```
user_agent.original : (*curl* or *python-requests* or *nikto* or *sqlmap* or *gobuster* or *ffuf* or *nmap*)
```
> Tín hiệu **độ tin cậy thấp** (scanner giỏi giả UA) → kết hợp Rule 3/4.

### Rule 6 — Đột biến request-rate mỗi IP  ·  availability / A06 (Insecure Design)
Rule "Index threshold": `count()` group by `source.ip`, ngưỡng theo baseline (vd >300/phút).
Hoặc ElastAlert2 `spike` so hiện tại vs nền.

### Rule 7 — Truy cập từ nước lạ (GeoIP × detection)  ·  A07/A01 (ngữ cảnh)
Tín hiệu: request (đặc biệt vào `/admin`, `/login`) từ quốc gia **ngoài** baseline.
```
not source.geo.country_iso_code : ("VN" "SG" "US") and url.path : ("/login.php" or "/admin*")
```
> **Đây là rule nối GeoIP với phát hiện** — làm GeoIP "có tải trọng", không chỉ trang
> trí. Trả lời trực tiếp câu hỏi "làm GeoIP để làm gì?".

### Rule 8 — Giám sát chính hệ giám sát  ·  **OWASP A09 (Logging & Alerting Failures)**
Tín hiệu: 0 document nạp trong 10 phút, **hoặc** parse-failure > 0.
Rule "Index threshold" trên đếm document (ngưỡng dưới) + trên `logs-*-failed-lab`.
> Rule rẻ nhất mà "đắt điểm" nhất: chứng minh nhóm hiểu đúng A09 — không chỉ ghi log
> mà còn **phát hiện khi việc ghi/cảnh báo hỏng**.

---

## 4. Cảnh báo 3 tầng (đảm bảo có bằng chứng dù license Basic)

| Tầng | Cách | License |
|---|---|---|
| **1. Trực quan** | panel dashboard + ngưỡng + ảnh chụp đúng lúc phát hiện | luôn có |
| **2. Rule trong Kibana** | Alerting rule "Index threshold" / "Elasticsearch query", **action = Index** (ghi cảnh báo thành document → dựng "dashboard cảnh báo") hoặc **Server log** | Basic ✅ |
| **3. Thông báo ngoài** | email/Slack/webhook | **trả phí** → thay bằng **ElastAlert2** (mã nguồn mở) hoặc **cron + curl** gọi API ES |

> **Không** phụ thuộc ML hay connector trả phí. Tầng 1 + 2 đã đủ làm bằng chứng chấm điểm.

Ví dụ tầng 3 bằng cron+curl (license-proof):
```bash
# [EC2-ELK]  chạy mỗi phút qua cron: đếm login_failed 5 phút gần nhất theo IP
curl -s --cacert /etc/elasticsearch/certs/http_ca.crt -u alert_reader:$PASS \
  'https://localhost:9200/logs-shop.auth-*/_search' -H 'Content-Type: application/json' -d '{
   "size":0,"query":{"bool":{"filter":[{"term":{"event.action":"login_failed"}},
   {"range":{"@timestamp":{"gte":"now-5m"}}}]}},
   "aggs":{"by_ip":{"terms":{"field":"source.ip","min_doc_count":20}}}}'
# nếu bucket có IP → gửi cảnh báo (webhook/telegram/ghi file)
```

---

## 5. fail2ban — phản ứng, không thay giám sát
fail2ban chặn IP tại host (near-real-time, không dashboard). ELK là giám sát/điều tra
tập trung (không tự chặn). Bổ trợ nhau: fail2ban = **respond**, ELK = **detect/visibility**.
> **Cẩn thận thứ tự demo (RK9):** thu bằng chứng phát hiện **trước**, rồi mới demo
> fail2ban ban IP có chủ đích như phần "phản ứng". Đừng để nó chặn tester quá sớm.
> Chi tiết ở [10](10-kiem-thu-va-demo.md), [11](11-bao-mat-van-hanh-chi-phi.md).

---

## Bàn giao & bằng chứng
- Sinh **E10** (danh mục rule đầy đủ, ngưỡng trỏ E9, ánh xạ OWASP 2025).
- Mỗi rule có ≥1 test case trong **E11** ([10](10-kiem-thu-va-demo.md)).

## Câu hỏi bảo vệ
1. Diễn đạt một rule phát hiện bằng câu SQL.
2. Ngưỡng của bạn lấy từ đâu? Vì sao không phải số tuỳ chọn?
3. App auth log giúp rule brute-force chính xác hơn thế nào so với chỉ dùng access log?
4. Vì sao dùng rule chứ không ML? License nào?
5. Rule 7 nối GeoIP với phát hiện ra sao? Rule 8 liên quan OWASP A09 thế nào?
6. Làm sao cảnh báo khi không có connector trả phí?

## Lỗi thường gặp
| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Rule không kích hoạt | sai tên field / ngưỡng quá cao / sai cửa sổ | đối chiếu [CONTRACT](../CONTRACT.md); hạ ngưỡng theo baseline |
| Báo động giả nhiều | ngưỡng quá nhạy / khách toàn cầu hợp lệ (Rule 7) | nới ngưỡng; giới hạn Rule 7 vào `/admin`,`/login` |
| Không gửi được email/Slack | connector trả phí | dùng ElastAlert2 / cron+curl (tầng 3) |

## References (ưu tiên tiếng Anh)
- OWASP Top 10 (2025) — https://owasp.org/Top10/2025/ · A09 Logging & Alerting — https://owasp.org/Top10/2025/
- OWASP Credential Stuffing Prevention — https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html
- OWASP CRS — https://owasp.org/www-project-modsecurity-core-rule-set/
- Kibana Alerting — https://www.elastic.co/guide/en/kibana/current/alerting-getting-started.html · ES|QL — https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html
- ElastAlert2 — https://github.com/jertel/elastalert2

> **Đối chiếu thuật ngữ:** detection rule = luật phát hiện · threshold = ngưỡng · false
> positive = báo động giả · alerting = cảnh báo · brute force = dò mật khẩu vét cạn.
> Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
