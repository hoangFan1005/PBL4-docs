# Báo cáo tiến độ lần 1 — PBL4

> Bản tài liệu public trên nhánh `baocaolan1` của PBL4-docs. Link đọc code/bằng chứng chi tiết trỏ đến repo **PBL4-demo private**, cần quyền truy cập; clone repo tài liệu không có app/scripts để chạy các lệnh. Bộ tài liệu này không công bố credentials, log thô hay runtime riêng. Các ví dụ và số liệu lab không phải cam kết production.

Ngày chốt tài liệu: **13/10/2026**, Asia/Saigon. Kết quả runtime gần nhất thuộc phiên **12/10/2026**. Nhánh tài liệu public: `baocaolan1` trong `PBL4-docs`. Nhánh source private: `bao-cao-tien-do-lan-1` trong `PBL4-demo`. Đây là mốc báo cáo giữa kỳ, chưa phải nghiệm thu final.

## Đọc theo thứ tự

**Dành riêng cho Hoàng ở vai trò lead:** [Sổ tay học hiểu chi tiết](04-so-tay-hoc-hieu-danh-cho-lead.md) giải thích nền tảng, từng chặng request/log, code thực tế, AWS/ELK/rule, kiểm chứng, xử lý lỗi, chi phí và cách dẫn nhóm; có lộ trình sáu buổi cùng bài tập có đáp án.

1. Đọc tài liệu này để biết phần đã làm và giới hạn bằng chứng.
2. Đọc [hướng dẫn học và đọc code](01-hoc-va-doc-hieu.md): tất cả thành viên học phần chung, sau đó học sâu phần mình phụ trách.
3. Đọc [phân công, lịch chuẩn bị và kịch bản báo cáo](02-phan-cong-va-chuan-bi.md): nhận đầu ra, kiểm tra chéo và tập trình bày.
4. Đối chiếu [tóm tắt kiểm thử AWS](aws-acceptance-summary.json), [tiến độ ngày 2](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/docs/day-2-progress.md) và [hướng dẫn AWS](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/docs/aws-deployment.md).
5. Đọc [kiểm tra và quyết định review](03-kiem-tra-va-review.md) để biết phạm vi source đã kiểm, finding đã sửa/bác bỏ và giới hạn CI.

## Bài toán và phạm vi

Xây dựng website shop PHP làm nguồn phát sinh log; thu thập access/error/auth log, chuẩn hóa, lưu trữ, hiển thị trên Kibana và phát hiện mẫu bất thường bằng bốn luật. Website có sản phẩm, tìm kiếm, login/logout, giỏ hàng và health check; không triển khai thanh toán.

Luồng chính: **Người dùng → Nginx/PHP/MariaDB → log → Filebeat → Logstash → Elasticsearch → Kibana/dashboard/rule → alert**.

## Tiến độ có bằng chứng

| Hạng mục | Kết quả đã ghi nhận | Giới hạn cần nói rõ |
|---|---|---|
| Môi trường local | WSL2/Ubuntu/Docker; preflight đạt; stack có 7 dịch vụ healthy | Kết quả thuộc checkout Ubuntu và phiên kiểm tra đã ghi, không phải mọi máy thành viên |
| Website | AWS public HTTP và health check trả 200; giữ dữ liệu qua stop/start | Chưa có domain/HTTPS công khai hợp lệ; chưa nghiệm thu toàn bộ thao tác UI trên AWS |
| Pipeline | Local stack verifier 14/14 PASS: health, traffic thật, indexed events, mapping, TLS/mTLS, rotation/restart và outage/recovery | Không suy ra khả năng chịu tải production hoặc không bao giờ mất log |
| GeoIP | Local 9/9 ingest simulations PASS; 3 database sẵn sàng | IP private không có quốc gia; AWS map chưa nghiệm thu bằng browser |
| Kibana | Dashboard/map/rule definitions đã có; local API/query/export verifier PASS | API PASS không chứng minh render browser PASS; có dashboard API warning trong báo cáo local |
| AWS | WEB public, ELK private; SSM; WEB làm NAT; 7 dịch vụ healthy; stop/start/stop thử thành công | Single AZ, một WEB là điểm lỗi đơn; NAT instance là ngoại lệ demo cần trao đổi với thầy |
| R1–R4 | Live AWS acceptance **15/15 PASS**, `contract_acceptance=PASS`; baseline 30 phút và vòng đời alert được đo | Ngưỡng cho lab; phát hiện mẫu bất thường, không khẳng định tấn công hoặc xâm nhập thành công |
| Chi phí/vận hành | Budget, CloudWatch/SNS, CloudTrail và autostop được kiểm qua API; cuối phiên EC2 đã dừng | Không kiểm tra lại AWS ở task xuất bản tài liệu này; EBS/KMS/alarms vẫn có chi phí khi máy dừng |
| Source regression 13/10 | Tooling 281 tests OK (2 skipped); pipeline 14 OK; detection 18 OK | Test offline, không thay thế runtime/browser nghiệm thu trên AWS |
| Privacy audit L09 | Candidate CI ngày 11/10 từng FAIL tại Logstash; diagnostics đã có trong lịch sử source | Chưa có bằng chứng đủ để đóng gate này; AWS detection PASS không thay privacy acceptance |

## Số liệu để trình bày

- Baseline AWS 30 phút: 187 access requests, `B = 6,233 request/phút`; `R4 = max(100, 3B) = 100`. Đây là baseline kịch bản lab, chưa đại diện traffic production.
- Bốn luật: R1 request cao/IP; R2 login fail/IP; R3 404 nhiều và nhiều đường dẫn/IP; R4 spike toàn website. Chi tiết điều kiện tại [catalog](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/detection/catalog.md).
- Dùng số liệu latency từ JSON tóm tắt, ghi rõ loại độ trễ, đơn vị, số mẫu và phiên đo. Không gọi tất cả là “độ trễ realtime”.
- Dự toán tại 12/10: khoảng **66,76 USD trước credit** cho 150 giờ bật đến hết tháng 12, gồm lưu trữ/tài nguyên cũ và dự phòng. Đây là dự toán có điều kiện, không phải hóa đơn hiện tại hoặc giới hạn chi tiêu cứng. Chi tiết trong tài liệu AWS.
- Guard kiểm mỗi 5 phút, dừng phiên từ mốc 120 phút, nên thời gian thực có thể khoảng 125 phút; dữ liệu billing có độ trễ.

| Loại độ trễ AWS ngày 12/10 | Số mẫu | Median | p95 | Giới hạn |
|---|---:|---:|---:|---|
| Ingest: event → Elasticsearch ingest | 2.439 | 10,865 giây | 17,773 giây | Theo profile lab đã chạy |
| Alert: đủ điều kiện → action | 8 | 33,373 giây | 45,829 giây | Mẫu nhỏ, rule schedule 30 giây |
| Hiển thị browser E13b | Chưa đo | — | — | NOT RUN trên phiên AWS này |

Hai bộ độ trễ đầu không thay thế số đo hiển thị browser; không tuyên bố mọi sự kiện hiển thị trong các khoảng này.

## Phân biệt ba lớp kiểm chứng

1. **Source/offline:** unit tests, fixture, kiểm cấu hình. Chứng minh logic trong điều kiện test.
2. **Runtime/backend:** request thật, log thật, document thật, rule/action thật; kiểm counts và vòng đời. AWS đã có bằng chứng này.
3. **Browser và buổi báo cáo:** dashboard/map hiển thị đúng, người khác thao tác được và demo liên tục. Đây là việc còn phải chốt.

`aws-acceptance-summary.json` được trích chọn từ `.runtime/aws/aws-live-detection.json`. Bản gốc giữ riêng, ignored; bản công bố chỉ chứa trạng thái, tên pha kiểm tra, baseline, thống kê độ trễ và checksum SHA-256 của file gốc. Checksum hỗ trợ truy vết, **không thay thế việc kiểm tra bản gốc**. Không công bố credentials, log thô, request IDs hoặc nội dung người dùng.

## Các việc trước buổi báo cáo

- [ ] Kiểm tra browser trên môi trường AWS đang bật: web, Discover, dashboard, map, alert.
- [ ] Kiểm chứng đường truy cập Kibana qua SSM port forwarding từ đúng máy thuyết trình; chưa coi thao tác này đã nghiệm thu.
- [ ] Chụp ảnh cùng phiên, ghi giờ/time range/commit/môi trường; lưu bản đã rà soát dữ liệu riêng.
- [ ] Tập demo chéo hai lượt, 10–12 phút/lượt; ghi lỗi và người xử lý.
- [ ] Có video dự phòng và slide khớp hệ thống thực tế.
- [ ] Theo dõi audit privacy L09: đối chiếu finding và chạy lại trên candidate; không nhận đã xử lý hoàn toàn khi chưa có bằng chứng.
- [ ] Xác nhận EC2 đã dừng sau buổi tập; không dùng `terminate` để kết thúc phiên.

## Công việc còn lại đến final

| Khoảng thời gian còn lại | Đầu ra đề xuất |
|---|---|
| Tuần 1 | Báo cáo tiến độ, browser acceptance, ảnh/video và danh sách góp ý của thầy |
| Tuần 2–3 | Domain/HTTPS; thống nhất SSM hay SSH ProxyJump/NAT theo yêu cầu thầy; vận hành/phục hồi và sửa lỗi |
| Tuần 4–5 | Đánh giá tải và độ trễ; ca âm/dương; cảnh báo nhầm/bỏ sót; hiệu chỉnh ngưỡng có phiên bản/baseline |
| Tuần 6 | Báo cáo hoàn chỉnh, sơ đồ thực tế, bảng thực nghiệm, runbook và kiểm tra tái dựng |
| Tuần 7 | Đóng băng chức năng, kiểm thử hồi quy, tập bảo vệ và dự phòng |

Lịch này tính tương đối từ báo cáo tiến độ; điều chỉnh khi có lịch chính thức. Không nhận mọi cổng D1–D5 hoặc final đã hoàn thành chỉ vì AWS backend đạt.

## Câu báo cáo đề xuất

> Nhóm đã triển khai website và hệ thống thu thập, chuẩn hóa, giám sát log trên AWS; kiểm chứng cả bốn luật cảnh báo với dữ liệu phát sinh từ request thật. Nhóm đang hoàn thiện kiểm tra giao diện, kịch bản trình diễn và sẽ tiếp tục đánh giá ngưỡng, tải, vận hành cùng báo cáo final trong khoảng bảy tuần còn lại.

Các checkpoint trước 12/10 là lịch sử. Nếu tài liệu cũ nói “chưa có AWS/Docker”, đọc phần chốt AWS trong tài liệu ngày 2 và mốc này để biết hiện trạng mới hơn.
