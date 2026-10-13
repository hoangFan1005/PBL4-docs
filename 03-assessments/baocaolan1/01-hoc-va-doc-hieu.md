# Học và đọc hiểu hệ thống để báo cáo

> Bản tài liệu public trên nhánh `baocaolan1` của PBL4-docs. Link đọc code/bằng chứng chi tiết trỏ đến repo **PBL4-demo private**, cần quyền truy cập; clone repo tài liệu không có app/scripts để chạy các lệnh. Bộ tài liệu này không công bố credentials, log thô hay runtime riêng. Các ví dụ và số liệu lab không phải cam kết production.

Mục tiêu: mỗi người giải thích được toàn bộ luồng trong 2 phút, đọc sâu phần mình phụ trách, thao tác được và dùng bằng chứng để trả lời. Đây là tài liệu học từ source hiện tại, không thay thế runbook triển khai.

## 1. Phần chung cả ba người phải nắm

### 1.1 Hệ thống giải quyết việc gì?

Website phát sinh nhiều sự kiện rời rạc. Nhóm gom chúng vào hệ thống tập trung để xem lượng truy cập, lỗi, kết quả đăng nhập, nguồn IP/quốc gia và các mẫu vượt ngưỡng. Website là nguồn dữ liệu của bài toán giám sát; không phải trọng tâm xây dựng một sàn thương mại đầy đủ.

Một request mở sản phẩm đi qua Nginx; nếu là PHP thì Nginx chuyển qua PHP-FPM, app đọc MariaDB và trả kết quả. Nginx ghi access log. Filebeat đọc file, gửi Logstash qua mTLS; Logstash parse/chuẩn hóa/enrich; Elasticsearch lưu document; Kibana query để hiển thị. Rule định kỳ kiểm dữ liệu và tạo lifecycle notification nếu thỏa điều kiện.

Đọc [CONTRACT](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/CONTRACT.md) trước code. Hãy tự vẽ đường đi của một request, ghi tên máy, dịch vụ, file log, index và dashboard.

### 1.2 Vai trò từng thành phần

| Thành phần | Vai trò | Nếu thiếu/hỏng thì quan sát gì? |
|---|---|---|
| Nginx | Nhận HTTP, phục vụ static/chuyển PHP, tạo request ID, ghi access/error | Website không truy cập được hoặc 502 khi upstream PHP lỗi |
| PHP-FPM/app | Logic shop, session/CSRF, login, giỏ hàng, ghi auth outcome | Website lỗi nghiệp vụ hoặc auth log không phản ánh kết quả |
| MariaDB | Lưu dữ liệu ứng dụng | App không truy vấn/xác thực được; không dùng DB làm nơi lưu ELK log |
| Filebeat | Theo dõi file/offset, gửi log và gắn dataset/nhãn tin cậy | Web vẫn chạy nhưng log mới không đến pipeline |
| Logstash | Parse, chuẩn hóa ECS, enrichment và route | Log sai schema/failed index, hoặc ingest gián đoạn |
| Elasticsearch | Index/mapping/tìm kiếm/aggregation | Kibana thiếu dữ liệu hoặc query/type lỗi |
| Kibana | Discover, dashboard/map, chạy rule/action | Backend có dữ liệu nhưng không hiển thị hoặc không chạy rule đúng |

Docker image là gói môi trường; container là tiến trình từ image; Compose mô tả dịch vụ/network/volume; volume giữ dữ liệu qua việc tạo lại container. `healthy` là health check của dịch vụ, không tự chứng minh cả luồng đúng.

### 1.3 Ba nguồn log không được đếm lẫn

| Nguồn | File trong container | Dataset | Ý nghĩa |
|---|---|---|---|
| Access | `/var/log/nginx/access.json` | `nginx.access` | Một dòng cho một HTTP request |
| Error | `/var/log/nginx/error.log` | `nginx.error` | Lỗi Nginx/upstream; không phải mọi request |
| Auth | `/var/log/shop/auth.json` | `shop.auth` | Kết quả `login_success`/`login_failed` của app |

Đếm request từ access; đếm login fail từ auth. Một lần đăng nhập sai có thể tạo access và auth document, nhưng vẫn chỉ là một sự kiện auth. HTTP 401 không tự thay thế được outcome login. Script login-fail còn GET form trước POST, nên số HTTP request khác số lần login fail.

### 1.4 Trường dữ liệu cần đọc được

| Trường | Vì sao cần? |
|---|---|
| `@timestamp` | Thời điểm sự kiện, dùng cửa sổ rule |
| `event.ingested` | Thời điểm ingest tại Elasticsearch, phục vụ đo độ trễ |
| `event.dataset` | Tách access/error/auth và tránh đếm lẫn |
| `source.ip` | IP nguồn để group R1–R3; không lấy XFF tùy ý do client gửi |
| `request.id` | Nối access/auth và đối chiếu log nguồn với document |
| `http.response.status_code` | Status số, dùng thống kê và R3 |
| `url.path` | Đường dẫn, dùng đếm distinct của R3 |
| `event.action` | Kết quả auth |
| `source.geo.country_iso_code` / `source.geo.location` | Quốc gia/map; location phải là `geo_point` |
| `labels.synthetic` | Tách dữ liệu mô phỏng khỏi baseline/rules thật |
| `pbl4.observed_count` / `pbl4.threshold` | Đối chiếu vì sao alert phát sinh |

Template quy định kiểu trước document đầu tiên để tránh dynamic mapping sai. ECS giúp thống nhất tên trường; không phải cứ dùng tên ECS là dữ liệu tự đúng. GeoIP là suy luận từ database theo IP, không chứng minh vị trí chính xác của người dùng. IP private/loopback không được gán tọa độ giả; map nhiều nước bằng synthetic phải ghi nhãn rõ.

### 1.5 Hiểu bốn rule bằng ví dụ

| Rule | Điều kiện hiện tại | Ví dụ để giải thích |
|---|---|---|
| R1 | Một IP `>50` access/1 phút | 50 chưa đạt; 51 đạt nếu đủ document trong cửa sổ |
| R2 | Một IP `>=5` login_failed/5 phút | 4 chưa đạt; 5 đạt |
| R3 | Một IP `>=20` access 404 và `>=10` path khác nhau/5 phút | 20 lần cùng một path chưa đạt điều kiện distinct |
| R4 | Toàn website `>max(100,3B)` access/1 phút | B=6,233 thì ngưỡng 100; 100 chưa đạt, 101 đạt |

Rule chạy mỗi 30 giây trên cửa sổ `(now-window, now]`, loại synthetic và parse failures. Số đã gửi từ script chưa chắc là số được engine đếm: cần nhìn thời điểm ingest, source IP, cửa sổ và snapshot thực.

Baseline B là trung bình request/phút trên 30–60 phút, gồm cả bucket bằng 0. Với 187 request/30 phút, B≈6,233; 3B≈18,7 nên sàn 100 quyết định R4. Không chạy burst rồi gọi đó là baseline bình thường, không hạ ngưỡng tùy ý để tạo PASS.

R1/R4 là tín hiệu traffic cao, R2 là lỗi đăng nhập lặp, R3 là kiểu dò đường dẫn. Các rule **không tự kết luận DDoS, brute force thành công hay xâm nhập**. NAT dùng chung, crawler, gõ sai mật khẩu, link hỏng và chiến dịch quảng bá có thể tạo cảnh báo hợp lệ về ngưỡng nhưng không phải hoạt động ác ý.

### 1.6 Alert lifecycle và độ trễ

Activation: rule vượt ngưỡng. Suppression: hạn chế notification lặp trong episode đang active, throttle 5 phút. Recovery: điều kiện hết thỏa. Retrigger: sau recovery, episode mới lại vượt ngưỡng. Không gọi throttle này là cooldown toàn cục qua mọi episode.

Phân biệt ingest latency (event → ingest), display latency (event → thấy trên giao diện, chịu refresh) và alert latency (đủ điều kiện → action). Đọc `method`, `n`, median, p95, max và `small_sample` trong evidence; không so p95 của 8 alert samples với bộ ingest lớn mà bỏ qua cỡ mẫu. Log đầy đủ request IDs phục vụ đối soát demo có chi phí bộ nhớ; payload này chưa phù hợp scale production.

## 2. Hoàng — học hạ tầng, mạng và vận hành

### Thứ tự đọc code

1. [AWS deployment](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/docs/aws-deployment.md): kiến trúc thực tế, chi phí, giới hạn.
2. [Generator CloudFormation](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/build_template.py) và [template](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/template.json): VPC/subnet/routes, SG, EC2, IAM, S3, audit, alarms, autostop.
3. [NAT](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/web-nat.sh): forwarding, MASQUERADE, MSS và systemd.
4. [Host setup](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/host-setup.sh), [ELK startup](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/elk-start.sh), [WEB startup](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/web-start.sh): phụ thuộc, chứng chỉ, bootstrap.
5. [Helper vận hành](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/demo.py), [autostop](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/aws/autostop.py), [test AWS](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/tests/tooling/test_aws_demo.py).

### Kiến thức phải giải thích

- Public subnet có route Internet Gateway; private subnet không public IP. SG kiểm traffic được phép, route quyết định next hop; hai thứ không thay nhau.
- WEB nhận HTTP 80 từ Internet; ELK chỉ nhận Beats 5044 từ WEB-SG. Không mở 22/9200/5601/3306 công khai. Quản trị hiện dùng SSM, chưa triển khai SSH ProxyJump như một phương án đã nghiệm thu.
- ELK outbound qua WEB NAT để tải images/updates/GeoIP. `SourceDestCheck=false` trên WEB cho chuyển tiếp traffic. Khi WEB dừng, ELK mất đường outbound này.
- mTLS Filebeat→Logstash: server kiểm client cert; client kiểm CA và DNS SAN. `extra_hosts` nối tên `logstash` với private IP, không tắt verification để né lỗi.
- IAM instance role cung cấp quyền dịch vụ cho EC2; không sao chép root key lên host. Chi tiết quyền đã có trong template, không đưa credentials vào slide.
- Stop giữ EBS, IP public có thể đổi; terminate là thao tác khác. Chi phí lưu trữ/giám sát còn tồn tại khi stop.
- Budget là cảnh báo dữ liệu chi phí có độ trễ; autostop giảm rủi ro, không bảo đảm hard cap 100 USD.

### Bài tập và đầu ra

Vẽ sơ đồ hai subnet có routes/ports; tự chỉ file tạo từng tài nguyên. Giải thích đường Filebeat→ELK và ELK→Internet. Chạy status/start/stop chỉ trong phiên nhóm đã thống nhất; không deploy stack mới để học. Chuẩn bị checklist vận hành và giải thích lựa chọn WEB NAT/single AZ cùng rủi ro.

## 3. Trí — học website, log và kịch bản

### Thứ tự đọc code

1. [Shop](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/app/src/Shop.php), [bootstrap](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/app/src/bootstrap.php), [schema](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/app/database/schema.sql): dữ liệu và nghiệp vụ.
2. [Login](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/app/public/login.php), [cart](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/app/public/cart.php), [search](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/app/public/search.php), các trang product/logout/health.
3. [Nginx config](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/nginx/nginx.conf): document root, FastCGI, request ID và access JSON.
4. [CONTRACT](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/CONTRACT.md): auth outcome, mapping raw→ECS và dữ liệu không được ghi vào log.
5. [Traffic generator](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/scripts/traffic/run.py), [rule catalog](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/detection/catalog.md), `tests/detection/` và `tests/pipeline/`.

### Kiến thức phải giải thích

- Nginx khác PHP-FPM; MariaDB khác Elasticsearch. Session/CSRF phục vụ website, không thay thế pipeline bảo mật.
- Request ID từ Nginx sang PHP giúp nối log. App không tin header X-Request-ID/XFF tùy ý để quyết định ID/IP nguồn.
- Auth log chỉ ghi outcome sau xác thực; không ghi password/cookie/token. Error log là text và cần parser khác access JSON.
- Traffic generator có baseline/burst/login-fail/scan404, giới hạn 1–500 operations, tối đa 10 request/s; chỉ dùng lab nhóm kiểm soát.
- Ca âm, ca dương, ca biên và distinct paths chứng minh các mặt khác nhau của rule.

### Bài tập và đầu ra

Lần theo một login failed từ form→PHP→auth/access→request.id→ES. Ghi 3 log mẫu đã che thông tin riêng và bảng expected/actual. Tự giải thích vì sao 20 lỗi 404 cùng URI chưa đủ R3. Đưa kịch bản thao tác có số lượng, rate, timestamp, IP và outcome dự kiến cho Bảo trước rehearsal.

## 4. Bảo — học parser, Elasticsearch và Kibana

### Thứ tự đọc code

1. [Filebeat](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/filebeat/filebeat.yml): inputs/dataset/trusted label/mTLS.
2. [Normalizer](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/logstash/normalize.rb), [input](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/logstash/pipelines/00-input.conf), [filter](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/logstash/pipelines/10-normalize.conf), [output](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/infra/logstash/pipelines/90-output.conf).
3. `infra/elasticsearch/templates/`, `infra/elasticsearch/ingest/`, `infra/elasticsearch/ilm/`: mapping/routing/ingested/retention.
4. `infra/kibana/definitions/` và `scripts/bootstrap/install_kibana.py`: dashboard/map/data views/connector.
5. `detection/queries/R1.esql` đến `R4.esql`, `detection/rules.json`, `scripts/verify/live_detection.py`, `scripts/verify/live_boundaries.py`, `scripts/verify/browser.py`.

### Kiến thức phải giải thích

- Filebeat chuyển log thô; Logstash parse một lần. Parse failure đi index riêng; GeoIP không tra được không mặc nhiên là parser hỏng.
- `source.ip` phải kiểu ip, status/count kiểu số, timestamp kiểu date, location kiểu geo_point; keyword giúp group chính xác.
- `@timestamp` khác `event.ingested`; chuẩn UTC và time picker ảnh hưởng biểu đồ/số đếm.
- Dashboard request chỉ dùng real access, auth chỉ dùng auth outcomes. Alert rows là notifications vòng đời, không phải tổng số cuộc tấn công.
- Map dùng tọa độ thật từ lookup; synthetic có view/nhãn riêng. IP private và lookup miss cần giải thích rõ.
- Rule query/action phải readback được: enabled state, grouping, schedule, threshold và count. Một saved object hoặc ảnh alert chưa đủ nghiệm thu.

### Bài tập và đầu ra

Chọn request.id do Trí bàn giao, tìm đúng document và chỉ schema. Đối chiếu một panel bằng query/count trong cùng time range. Giải thích cả hai điều kiện R3 và sự khác nhau R1/R4. Chuẩn bị dashboard/Discover/alert/map tabs và ảnh bằng chứng đã kiểm tra.

## 5. Câu hỏi có thể gặp khi báo cáo

| Câu hỏi | Hướng trả lời bằng hệ thống hiện có |
|---|---|
| Vì sao dùng ELK? | Thu gom/chuẩn hóa/tìm kiếm/hiển thị tập trung; nói rõ vai trò từng thành phần |
| Vì sao không đọc log trên server là đủ? | Đọc file được nhưng khó đối chiếu nhiều nguồn, tổng hợp theo thời gian/IP và vận hành rule |
| Vì sao chọn ngưỡng 50/5/20/100? | Ngưỡng khởi đầu của lab và baseline R4 đã đo; còn đánh giá false positives/negatives trước final |
| Có phát hiện được mọi cuộc tấn công không? | Chỉ phát hiện mẫu theo rule/dữ liệu hiện có; không bao phủ mọi kỹ thuật và không xác nhận xâm nhập |
| IP dùng chung NAT thì sao? | Group theo source IP có thể gộp nhiều người, dẫn đến cảnh báo nhầm về ác ý |
| Logstash dừng có mất log không? | Có test outage/recovery trong điều kiện lab; không cam kết mọi thời lượng/outage/tải đều không mất |
| GeoIP có chỉ đúng địa chỉ người dùng không? | Mức quốc gia từ IP/database; VPN/proxy/private IP làm giới hạn suy luận |
| Tại sao backend PASS mà chưa READY? | Browser, người vận hành và dry-run là cổng nghiệm thu khác |
| Tại sao chưa dùng HTTPS ngoài Internet? | Chưa hoàn tất domain/chứng chỉ công khai; pipeline nội bộ có TLS/mTLS, hai phạm vi khác nhau |
| Có gửi email khi R1 xảy ra không? | R1–R4 hiện ghi alert vào Kibana/ES; SNS email cho hạ tầng và budget, chưa email từng rule |
| NAT/SSM khác yêu cầu ProxyJump của thầy? | Trình bày đây là kiến trúc demo hiện có; cần thống nhất lại trước final, không nhận đã làm ProxyJump |
| Chi phí có chắc dưới 100 USD không? | Có dự toán theo giờ dùng và guard/budget; billing trễ, tài nguyên khác vẫn phát sinh nên phải theo dõi |

## 6. Tự kiểm tra mức hiểu

Mỗi người thực hiện không nhìn script thuyết trình: vẽ luồng; giải thích 3 log và 4 rule; lần theo 1 request; đọc 1 alert; nêu 3 giới hạn; xử lý một tình huống không có log trên Kibana bằng cách kiểm từng chặng. Người còn lại chọn câu hỏi từ bảng trên và yêu cầu chỉ tới code/evidence. Nếu chỉ đọc thuộc tên công nghệ mà không chỉ được dữ liệu đi đâu, cần học lại trước khi nhận hoàn thành.
