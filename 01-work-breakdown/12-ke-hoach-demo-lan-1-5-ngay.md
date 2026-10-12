# Demo lần 1 — Kế hoạch 5 ngày đạt mốc 50–60% PBL4

**Ngày lập và duyệt:** 12/10/2026.
**Trạng thái:** kế hoạch đã được Hoàng duyệt trong cuộc trò chuyện; chưa xác nhận các nhiệm vụ triển khai đã hoàn thành.
**Nhánh tài liệu:** `1st_demo`.
**Lịch dự kiến:** 13–17/10/2026, ngày 18/10 làm đệm trước tuần demo. Nếu ngày bắt đầu thay đổi, giữ thứ tự Ngày 1–5.
**Nguồn lực giả định:** 3 người, mỗi người 4–6 giờ/ngày; tận dụng mã hiện có.

## 1. Mục tiêu và căn cứ

Sau 5 ngày, nhóm có một luồng giám sát chạy thực từ website đến Kibana, dashboard cơ bản, GeoIP cấp quốc gia và hai rule cảnh báo hoạt động. Hai rule còn lại cùng đánh giá chuyên sâu để sau buổi demo.

50–60% là ước lượng phạm vi của nhóm, không phải thang điểm của giảng viên. Chỉ tính phần chạy được và có bằng chứng; có mã hoặc cấu hình chưa đồng nghĩa hoàn thành.

Căn cứ:
- [Phản hồi giảng viên và kế hoạch cập nhật](09-ke-hoach-sua-doi-theo-phan-hoi-giang-vien.md).
- [Ma trận phân công](04-ma-tran-phan-cong-va-rui-ro.md).
- [Hợp đồng bàn giao](05-hop-dong-ban-giao.md).
- [CONTRACT](../CONTRACT.md).
- [Rule phát hiện](../02-learning/09-phat-hien-bat-thuong.md).
- [Kiểm thử và demo](../02-learning/10-kiem-thu-va-demo.md).
- [Kế hoạch tuần 2 — tham khảo lịch sử](11-ke-hoach-tuan-2.md).
- Định hướng giảng viên do Hoàng cung cấp lại ngày 12/10/2026 và lộ trình được Hoàng duyệt cùng ngày.

### Hiện trạng dùng để lập kế hoạch

Bản local `output/pbl4-core-reset` có website PHP, pipeline, dashboard và định nghĩa R1–R4. README/WORK_DONE của snapshot ghi chưa nghiệm thu runtime trên máy Windows của Hoàng. Vì vậy, nhiệm vụ là tận dụng, điều chỉnh và kiểm chứng mã hiện có, không làm lại từ đầu và không nhận mã có sẵn là kết quả demo đã đạt.

Khi lập kế hoạch, đọc được repo PBL4-docs nhưng connector chưa truy cập được PBL4-demo; hiện trạng mã lấy từ snapshot local, chưa xác nhận những thay đổi mới nhất trên repo demo. Ngày 1 phải chốt lại bản mã và môi trường thực tế.

### Quyết định ưu tiên trong nhánh này

1. Website là nguồn sinh access/error/auth log; không thanh toán hoặc nạp tiền.
2. Demo lần 1 chỉ bắt buộc R1 và R2 chạy thực. R3/R4 vẫn thuộc phạm vi final, không bị loại khỏi đề tài.
3. Theo định hướng Hoàng cung cấp lại: quản trị bằng SSH ProxyJump qua WEB và tunnel đến Kibana; ELK private. Các đoạn tài liệu cũ chọn SSM làm mặc định không phải hướng thực hiện của đợt demo này.
4. Giữ ECS `source.geo.*` đang có, giải thích tương đương với `geoip.*` trong góp ý; không đổi schema riêng lẻ.
5. Lịch 5 ngày trong tài liệu cập nhật giảng viên trước đây là lịch sửa Markdown. Tài liệu này là lịch triển khai và kiểm chứng hệ thống.
6. Các ví dụ bàn giao cũ về SSH trực tiếp tới public IP ELK hoặc WEB gọi Elasticsearch:9200 không áp dụng. WEB gửi Beats:5044; Elasticsearch và Kibana chỉ truy cập qua đường quản trị phù hợp.
7. Phiên bản, license và chi phí cũ phải đối chiếu môi trường/nguồn chính thức lúc triển khai, không coi các số lịch sử là cam kết hiện hành.

## 2. Phạm vi demo và phần để sau

| Hạng mục | Phải có ở demo lần 1 | Sau demo |
|---|---|---|
| Website | Sản phẩm, login/logout, giỏ hàng, search đơn giản; 404 thật | Trau chuốt giao diện, chức năng phụ |
| Log | Nginx access/error, PHP login success/fail; đối chiếu log gốc | Rotation, mất kết nối và phục hồi dài hạn |
| AWS | 1 VPC, public/private subnet, NAT, 2 EC2; WEB public, ELK private; tunnel Kibana | Tự động hóa, phục hồi và vận hành đầy đủ |
| Pipeline | Filebeat → Logstash → Elasticsearch → Kibana thực; ưu tiên hoàn tất TLS | Kiểm thử độ bền và tải lớn |
| Dashboard | Request theo thời gian, top IP/URI, login success/fail, map và top country | Tối ưu bố cục, phân tích sâu |
| Detection | R1 request cao và R2 login fail chạy thực | R3 quét 404 và R4 spike toàn website |
| Đánh giá | Log + ảnh alert; ca âm/dương/biên cơ bản; độ trễ bước đầu | Baseline đầy đủ, đánh giá cả 4 rule, báo cáo final |

Không đưa vào 5 ngày: thanh toán, nạp tiền, ML, RDS, Load Balancer, nhiều AZ, bắt buộc email/chat hoặc EC2 tester riêng. Tester laptop/VM của nhóm là đủ.

TLS Filebeat–Logstash là mục tiêu triển khai ngày 2. Nếu chưa hoàn tất, ghi rõ thiếu TLS và chưa đạt thiết kế 5044 + TLS; không tắt xác minh chứng chỉ rồi báo đạt.

## 3. Phân công

| Người | Trách nhiệm chính | Sản phẩm bàn giao |
|---|---|---|
| Hoàng — A | AWS, mạng, SSH/tunnel, Filebeat transport, CA/TLS, chi phí, điều phối tích hợp | Sơ đồ thực; inventory EC2; SG/routes; hướng dẫn tunnel; bằng chứng đường truyền và chi phí |
| Trí — B | PHP, MariaDB, ba nguồn log; đặc tả rule; traffic và test | Website; log mẫu; catalog R1–R4; script bình thường/R1/R2; kết quả kiểm thử |
| Bảo — C | ELK single-node, parser/mapping, GeoIP, dashboard, cấu hình alert | Document đúng; dashboard/map; R1/R2 hoạt động; export cấu hình |

Trí chịu trách nhiệm ý nghĩa rule và kịch bản; Bảo chịu trách nhiệm query/alert thực thi đúng. Hoàng phụ trách đường truyền để Bảo không phải gánh cả mạng và toàn bộ ELK.

Mỗi ngày: 15 phút đầu buổi chốt việc, 30 phút cuối buổi kiểm đầu ra chung. Vướng mắc làm chặn người khác phải báo ngay, không đợi ngày 5 mới tích hợp.

## 4. Lịch 5 ngày

### Ngày 1 — 13/10: Chạy lại mã nền và chốt dữ liệu

**Hoàng**
- [ ] Kiểm kê tài khoản, tài nguyên AWS, quyền truy cập và ngân sách.
- [ ] Kiểm tra Docker/WSL2 hoặc chọn máy Linux phù hợp để demo.
- [ ] Chốt bản mã dùng chung và ghi commit/nhánh, môi trường thực tế.
- [ ] Vẽ public/private, routes và SG theo ProxyJump.
- [ ] Lập bảng hiện trạng: chạy được / chưa chạy / bị chặn.

**Trí**
- [ ] Chạy website hiện có; kiểm tra sản phẩm, login/logout, giỏ hàng.
- [ ] Kiểm access JSON, error và auth log.
- [ ] Tạo ít nhất 20 dòng access thật, gồm 200/404, user-agent và URL cần escape; thêm mẫu auth success/fail và error riêng.
- [ ] Bàn giao log không chứa mật khẩu, cookie phiên hoặc token cho Bảo.

**Bảo**
- [ ] Khởi động ELK trên môi trường được chọn.
- [ ] Đối chiếu CONTRACT với mẫu Trí bàn giao.
- [ ] Tạo template/mapping trước ingest.
- [ ] Thử parser; kiểm timestamp, IP, status và dataset; lưu lỗi parse để xử lý.

**Cổng cuối ngày:** website và ELK khởi động được; Trí/Bảo thống nhất schema và mẫu log parse đúng. Nếu máy chưa chạy nổi ELK, Hoàng/Bảo cùng xử lý ngay. Không sửa giao diện trừ lỗi chặn thao tác.

### Ngày 2 — 14/10: AWS và pipeline thực

**Hoàng**
- [ ] Sau khi tài khoản, quyền và ngân sách sẵn sàng, dựng hoặc hoàn thiện VPC, public/private subnet, IGW, NAT và 2 EC2.
- [ ] Cấu hình SG; kiểm ProxyJump và tunnel từ máy nhóm.
- [ ] Phối hợp cấu hình Filebeat, CA và TLS; SAN phải khớp đích Logstash.
- [ ] Bàn giao inventory và cách kết nối để người nhận tự kiểm tra.

**Trí**
- [ ] Đưa PHP + MariaDB local lên EC2-WEB.
- [ ] Seed tài khoản/sản phẩm demo.
- [ ] Xác nhận ba file log và quyền Filebeat đọc log.
- [ ] Kiểm 200, login success/fail và 404 trên website AWS.

**Bảo**
- [ ] Dựng ELK single-node trên EC2 private.
- [ ] Cài template/parser và Beats input.
- [ ] Cùng Hoàng kiểm chứng Filebeat → Logstash qua TLS.
- [ ] Kiểm một request AWS xuất hiện trong Kibana Discover.

**Cổng cuối ngày:** cùng một request.id có cả dòng log trên WEB và document trong Elasticsearch/Kibana.

**Mạng phải đúng:**
- WEB-SG: 80/443 từ Internet, SSH chỉ từ IP nhóm.
- ELK-SG: 5044 từ WEB-SG; SSH từ WEB-SG cho ProxyJump.
- ELK không có public IP; không expose 5601/9200/3306 ra Internet.
- WEB → ELK đi mạng nội bộ; NAT phục vụ outbound private subnet.
- CA của Beats input phải là CA ký certificate Logstash, không mặc định lấy CA Elasticsearch.
- Ghi chi phí NAT/EIP theo thời gian tồn tại; stop EC2 không đồng nghĩa ngừng mọi chi phí.

### Ngày 3 — 15/10: Dashboard và GeoIP

**Hoàng**
- [ ] Kiểm tunnel từ máy thuyết trình; hỗ trợ Filebeat/TLS.
- [ ] Ghi inventory, SG/routes và chi phí thực.
- [ ] Kiểm đồng bộ thời gian giữa các máy.

**Trí**
- [ ] Tạo traffic bình thường: sản phẩm, search, giỏ hàng, login đúng/sai, URL giả.
- [ ] Viết script R1/R2 có số lần rõ ràng.
- [ ] Bàn giao số lượng event dự kiến, IP và thời gian chạy.
- [ ] Giữ search không kết quả đúng ngữ nghĩa HTTP; tạo 404 bằng đường dẫn không tồn tại.

**Bảo**
- [ ] Dashboard v1: request theo thời gian, top IP/URI, status, số lượng/tỷ lệ login success/fail.
- [ ] Cấu hình GeoIP quốc gia, map, top country truy cập; chuẩn bị thống kê country có cảnh báo khi R1/R2 chạy.
- [ ] Thêm bảng lỗi parse và theo dõi IP thiếu GeoIP.
- [ ] Đối chiếu chỉ số panel với dữ liệu nguồn.

**Cổng cuối ngày:** dashboard có dữ liệu thực; map hoạt động với IP tra được; từng biểu đồ dùng đúng dataset.

| Góp ý giảng viên | Schema dự án |
|---|---|
| geoip.country_name | source.geo.country_name |
| geoip.country_iso_code | source.geo.country_iso_code |
| geoip.location | source.geo.location kiểu geo_point |

Request chỉ đếm nginx.access; login ratio chỉ dùng shop.auth. IP private/không tra được không tự gán quốc gia. Nếu cần minh họa nhiều quốc gia, dùng dữ liệu có nhãn synthetic và index/view riêng; không trộn baseline/rule thật, không tuyên bố đó là người dùng thật. Không tin X-Forwarded-For do khách tự gửi.

### Ngày 4 — 16/10: Hai cảnh báo thực và độ trễ

**Hoàng**
- [ ] Theo dõi tài nguyên/kết nối khi test.
- [ ] Hỗ trợ thu bằng chứng và đo đường truyền.
- [ ] Tổng hợp lỗi còn chặn demo.

**Trí**
- [ ] Chạy test R1/R2 từng phiên; ghi IP, thời điểm và số lần.
- [ ] Chạy phiên bình thường để quan sát cảnh báo nhầm.
- [ ] Lập bảng expected/actual và giữ log gốc.

**Bảo**
- [ ] Kiểm cơ chế alert phù hợp phiên bản/license thực tế; ưu tiên cấu hình hiện có đáp ứng yêu cầu.
- [ ] Cấu hình/bật R1/R2; kiểm grouping IP, cửa sổ và hạn chế lặp.
- [ ] Đưa alert lên Kibana và đối soát count với Trí.
- [ ] Export cấu hình rule đã thực sự cài.

**Cổng cuối ngày:** R1 và R2 phát cảnh báo thật, có timestamp/IP/count/ngưỡng, đối chiếu được log; query trong Discover không thay bằng chứng alert.

| Rule | Điều kiện khởi đầu | Kiểm tra |
|---|---|---|
| R1 | >50 request/1 phút/IP từ nginx.access | 50 không; 51 có |
| R2 | ≥5 login_failed/5 phút/IP từ shop.auth | 4 không; 5 có |
| R3 — sau demo | ≥20 lần 404 và ≥10 url.path khác nhau/5 phút/IP | Ghi đặc tả, chưa nhận hoàn thành |
| R4 — sau demo | Tổng request/phút > max(100, 3 × baseline) | Chờ baseline đủ cơ sở |

Lịch kiểm tra đề xuất 30 giây, hạn chế cảnh báo lặp theo rule/IP trong 5 phút; ghi hành vi thực của engine. Các ca biên phải kiểm soát cửa sổ và log phiên trước. Ngưỡng là cấu hình khởi đầu, chưa tối ưu theo traffic thực. R3 đo trong cửa sổ, không gọi là “404 liên tiếp” nếu chưa kiểm thứ tự.

Alert lưu rule ID, timestamp, IP/country khi có, observed count, threshold và window start/end. Không bịa country cho IP không tra được.

**Đo sơ bộ 10–20 request có ID riêng:**
- Ingest: event.ingested − event time.
- Hiển thị: event time đến lần đầu thấy trên Kibana; ghi refresh và sai số.
- Alert: thời điểm đủ điều kiện rule đến khi alert tạo.
- Báo số mẫu, số đo thực và giới hạn; không hứa real-time dưới X giây khi chưa đo. Phiên bình thường phải ghi cả thời lượng lẫn số alert, kể cả false positive.

### Ngày 5 — 17/10: Đóng băng và tập demo

**Hoàng**
- [ ] Chốt sơ đồ đúng môi trường thực, bảng đã làm/chưa làm.
- [ ] Chuẩn bị chi phí, cách bật/tắt và checklist tunnel từ máy trình bày.
- [ ] Hoàn thiện phần trình bày hạ tầng.

**Trí**
- [ ] Chốt thao tác website, script traffic, tài khoản mẫu.
- [ ] Tập giải thích R1/R2 và giới hạn của luật/ngưỡng.
- [ ] Không phụ thuộc gõ lệnh tùy hứng khi trình bày.

**Bảo**
- [ ] Export dashboard/rule; đặt time range và bộ lọc.
- [ ] Chụp map, dashboard, alert; liên kết ảnh với log gốc.
- [ ] Kiểm top country truy cập/bất thường và các trường alert.

**Cả nhóm**
- [ ] Chạy demo 2 lượt; một lượt đổi người thao tác để hiểu chéo.
- [ ] Quay video dự phòng; ghi rõ thời điểm/môi trường của bằng chứng.
- [ ] Chỉ sửa lỗi chặn; không thêm chức năng.
- [ ] Chốt một bản mã, một môi trường và gói bằng chứng cùng phiên chạy.

**Cổng cuối ngày:** demo 10–12 phút liền mạch, có kết quả và giới hạn trình bày trung thực. Ngày 18/10 chỉ dành cho lỗi phát sinh và kiểm kết nối trước buổi thật.

## 5. Bàn giao và bằng chứng

| Hạn | Bàn giao | Điều kiện nhận |
|---|---|---|
| Ngày 1 | Trí → Bảo: ba mẫu log | Parse đúng, tên trường thống nhất |
| Ngày 2 | Hoàng → nhóm: kết nối/tunnel | Người nhận tự kết nối được |
| Ngày 2 | Bảo → nhóm: pipeline | Đối chiếu request.id log ↔ document |
| Ngày 3 | Trí → Bảo: R1/R2 traffic | Có số lần, IP, thời gian, expected |
| Ngày 4 | Trí + Bảo → Hoàng: cảnh báo | Có raw log, ảnh, observed count |
| Ngày 5 | Nhóm → bộ demo | Cùng bản mã/môi trường, có dry-run |

Dùng E-ID hiện hữu, lưu dưới docs/assets/evidence với mã phiên/thời điểm:
- E1/E2: kiến trúc, SG/routes thực.
- E3/E4: schema, raw log và document.
- E6/E7/E8: map, trường hợp thiếu GeoIP, dashboard.
- E10/E11/E12: catalog, kiểm thử R1/R2, phiên bình thường.
- E13a/b/c: ingest/hiển thị/cảnh báo, phân biệt rõ.
- E14: chi phí thực và giả định.
- E9 baseline đầy đủ, nghiệm thu R3/R4 và E15 teardown hoàn chỉnh để giai đoạn sau; không đánh dấu PASS trước khi thực hiện.

Mỗi mục ghi NOT_RUN / IN_PROGRESS / PASS / BLOCKED kèm liên kết bằng chứng khi có. Kế hoạch được duyệt không tự chuyển bất kỳ kiểm thử nào thành PASS.

## 6. Khi bị chậm

Ưu tiên giữ web sinh log → pipeline đầy đủ (có Logstash) → dashboard → R1/R2 → bằng chứng.

- AWS chưa sẵn sàng cuối ngày 2: Trí/Bảo tiếp tục luồng local, Hoàng xử lý hạ tầng song song. Báo AWS chưa hoàn thành; local không thay bằng chứng cloud và không mặc nhiên đạt mốc dự kiến.
- Dashboard chậm: giữ chỉ số giảng viên yêu cầu, giảm chăm chút bố cục.
- Alert chậm: làm R2 trước, rồi R1. Nếu chỉ đạt một rule, công bố phần còn thiếu.
- GeoIP chưa có nhiều quốc gia: dùng IP thật hiện có; synthetic riêng nếu cần minh họa.
- Máy không chạy nổi ELK: giải quyết ngay ngày 1 bằng môi trường phù hợp; không chờ sát demo.
- Không mở rộng shop hoặc bộ kiểm thử tự động trong đợt này.
- Chỉ sinh traffic kiểm thử vào hạ tầng của nhóm.

## 7. Kịch bản demo 10–12 phút

| Thời lượng | Nội dung | Người chính |
|---|---|---|
| 2 phút | Bài toán, kiến trúc, phạm vi thực hiện | Hoàng |
| 2 phút | Website và log phát sinh | Trí |
| 3 phút | Request đến Kibana; dashboard, login ratio, GeoIP | Bảo |
| 3 phút | Login fail/request cao; alert và raw log | Trí + Bảo |
| 1–2 phút | Độ trễ thực, giới hạn và phần tiếp theo | Hoàng |

Chỉ sau khi đầu ra đã kiểm chứng mới báo: “Nhóm đã hoàn thành luồng thu thập và hiển thị log cơ bản, GeoIP cấp quốc gia và kiểm chứng hai luật cảnh báo; đang tiếp tục hai luật còn lại, hiệu chỉnh ngưỡng và đánh giá vận hành.”

## 8. Phần tiếp theo sau demo

- Hoàn thiện R3/R4; baseline đại diện 30–60 phút, có phút không request.
- Test cả bốn rule với dương/âm/biên, grouping và vòng đời cảnh báo.
- Đánh giá restart, log rotation, mất kết nối/phục hồi, retention.
- Đo độ trễ với bộ mẫu đầy đủ hơn; phân tích false positive và giới hạn GeoIP.
- Hoàn thiện AWS nếu chưa đạt; kiểm chi phí, backup/export, teardown khi kết thúc.
- Hoàn thiện báo cáo và slide final.

Không tự mở rộng sang ML, thanh toán hoặc hạ tầng phức tạp khi phần cốt lõi chưa hoàn tất.
