# Phân công ba người và chuẩn bị báo cáo lần 1

> Bản tài liệu public trên nhánh `baocaolan1` của PBL4-docs. Link đọc code/bằng chứng chi tiết trỏ đến repo **PBL4-demo private**, cần quyền truy cập; clone repo tài liệu không có app/scripts để chạy các lệnh. Bộ tài liệu này không công bố credentials, log thô hay runtime riêng. Các ví dụ và số liệu lab không phải cam kết production.

Phân công này là kế hoạch chuẩn bị từ 13/10/2026, không phải xác nhận Trí/Bảo đã hoàn thành mọi đầu việc. Giữ vai trò: **Hoàng — hạ tầng/vận hành; Trí — website/log/kịch bản; Bảo — ELK/dashboard/alert**. Cả ba phải hiểu luồng chung.

## 1. Trách nhiệm và đầu ra nhận được

| Người | Phần học sâu | Việc trước báo cáo | Đầu ra bàn giao | Điều kiện nhận |
|---|---|---|---|---|
| Hoàng | AWS, network, SG/routes, SSM, NAT, TLS, cost/guard | Chốt môi trường/commit, đường truy cập, bật/tắt, sơ đồ và phần tiến độ | Sơ đồ đúng thực tế; inventory không credentials; checklist start/status/stop; 2–3 slide hạ tầng/chi phí/giới hạn | Trí và Bảo dùng được đường truy cập trên máy thuyết trình; IP hiện tại xác nhận; kết thúc có readback stopped |
| Trí | PHP/Nginx/MariaDB, 3 log, request ID, rule scenarios | Kiểm UI shop, chuẩn bị baseline/burst/login fail/404, giải thích ngưỡng | 3 mẫu log đã rà soát; bảng expected/actual; kịch bản traffic; 2–3 slide website/log/rules | Bảo đối chiếu được request.id và outcome; không chứa password/token; số HTTP và auth phân biệt |
| Bảo | Parser/ECS/mapping/GeoIP, Kibana queries và lifecycle | Kiểm render dashboard/map/Discover/alerts; thu ảnh cùng phiên; kiểm rule state | Dashboard/map/alert evidence, query đối chiếu, time range và 2–3 slide pipeline/kết quả | Panel có dữ liệu đúng nguồn; map có giải thích private/synthetic; alert count/window có nguồn đối soát |
| Cả nhóm | Luồng chung và giới hạn | Rehearsal hai lượt, đổi người thao tác, video dự phòng | Bộ slide chung, video, biên bản lỗi/câu hỏi và checklist chưa đạt | Demo 10–12 phút; mỗi người trả lời được câu hỏi ngoài phần mình; không gọi test chưa chạy là PASS |

Trí sở hữu ý nghĩa rule và input test; Bảo sở hữu query/action và output đối soát. Hoàng sở hữu đường truyền và vận hành, điều phối tích hợp. Khi một việc phụ thuộc người khác, bàn giao dữ liệu ngay thay vì chờ hoàn tất toàn bộ phần riêng.

## 2. Lịch chuẩn bị đề xuất

Giả định báo cáo trong tuần 19–25/10; chưa có giờ chính thức. Hạn dưới đây phục vụ chuẩn bị, điều chỉnh nếu lịch thực tế khác.

| Ngày | Hoàng | Trí | Bảo | Cổng cuối ngày |
|---|---|---|---|---|
| 13/10 | Đọc AWS/template, chốt sơ đồ hiện trạng | Đọc CONTRACT/app, lần theo login | Đọc parser/templates/queries | Cả ba vẽ lại được luồng và nhận checklist |
| 14/10 | Chốt máy thuyết trình và đường SSM/tunnel | Chuẩn bị thao tác web và mẫu log | Chuẩn bị dashboard/map tabs và query | Có bàn giao request.id và hướng dẫn truy cập |
| 15/10 | Bật phiên AWS hỗ trợ integration, giám sát health | Kiểm UI và tạo traffic có giới hạn | Kiểm browser acceptance, alert/map và chụp ảnh | Có bằng chứng cùng phiên hoặc ghi BLOCKED rõ ràng |
| 16/10 | Viết slide kiến trúc/cost/remaining work | Viết slide website/log/rule scenarios | Viết slide pipeline/dashboard/results | Slide có claim/evidence/giới hạn khớp nhau |
| 17/10 | Điều phối rehearsal, ghi lỗi môi trường | Chạy demo lượt 1 | Chạy demo lượt 2/đổi người | Hai lượt 10–12 phút, có danh sách lỗi và owner |
| 18/10 | Kiểm bundle/stop state và dự phòng | Quay video thao tác đã ổn định | Rà soát ảnh và time range | Đóng băng bản báo cáo, không mở thêm chức năng |

Đề xuất 2–3 giờ/người/ngày: 45–60 phút đọc và ghi lại bằng lời của mình; 60–90 phút thao tác/bằng chứng; 15–30 phút bàn giao. Nếu thiếu thời gian, giữ integration/browser/rehearsal, giảm công trang trí slide.

## 3. Bàn giao cụ thể

- **Hoàng → Trí/Bảo:** môi trường/commit, IP hiện tại, thời gian phiên, trạng thái SSM, cách truy cập shop/Kibana và cách dừng. Credentials chia sẻ riêng theo cơ chế nhóm; không nằm trong Markdown/Git/slide.
- **Trí → Bảo:** thời gian UTC hoặc có timezone, mode/count/rate, source IP quan sát được, request.id và expected outcomes. Bảo kiểm tra cửa sổ và ingested documents trước kết luận.
- **Bảo → Hoàng/Trí:** ảnh/query/readback tương ứng cùng phiên, nguồn dataset, observed count/threshold/window và tình trạng map. Nếu có lỗi render/API warning, ghi rõ và owner xử lý.
- **Cả nhóm → bộ báo cáo:** commit SHA, môi trường, số liệu đã chạy và checklist pending. Raw evidence giữ riêng; chỉ publish bản đã rà soát.

Mẫu biên bản mỗi buổi tập:

| Phiên/giờ/môi trường/commit | Bước | Expected | Actual/bằng chứng | PASS/FAIL/BLOCKED | Owner | Hạn sửa |
|---|---|---|---|---|---|---|
| Chưa thực hiện | Điền sau buổi tập |  |  | NOT RUN |  |  |

## 4. Kịch bản báo cáo 10–12 phút

| Phút | Người chính | Nội dung/thao tác | Bằng chứng cần có |
|---|---|---|---|
| 0–2 | Hoàng | Bài toán, phạm vi, sơ đồ AWS thực tế và tiến độ | Sơ đồ public/private, WEB NAT và SSM; không vẽ ProxyJump như đã triển khai |
| 2–4 | Trí | Search/product/cart; login đúng/sai; giải thích log | Website thao tác được, request.id nối access/auth |
| 4–7 | Bảo | Discover → dashboard → GeoIP/map | Document schema, time range, panel counts và giới hạn map |
| 7–10 | Trí + Bảo | Burst có giới hạn; xem alert; giới thiệu evidence R2/R3/lifecycle | Alert thật có rule/count/threshold/window; evidence 15/15 từ phiên đã đo |
| 10–12 | Hoàng + cả nhóm | Kết quả, độ trễ, giới hạn và kế hoạch 7 tuần | Số liệu có n/đơn vị/phiên; checklist pending và phân công final |

Baseline 30 phút chạy trước buổi trình diễn, không tính vào 12 phút. Không cố chạy toàn bộ acceptance dài khi thầy đang xem. Nếu không kịp alert trong thời gian trình diễn, dùng video/evidence đúng phiên và nói rõ, không gọi ảnh cũ là alert vừa tạo.

## 5. Chuẩn bị thao tác

Hoàng dùng helper PowerShell trong repo đã có Python, AWS CLI/profile và quyền thích hợp:

```powershell
python infra/aws/demo.py start
python infra/aws/demo.py status
# Chờ SSM Online và các dịch vụ sẵn sàng; lấy public IP mới từ status.
# Sau phiên, dừng và xác nhận lại:
python infra/aws/demo.py stop
python infra/aws/demo.py status
```

Helper chứa đường AWS CLI Windows và tên stack/profile của lab hiện tại; máy khác phải cấu hình phù hợp trước. `start` chưa đồng nghĩa website/ELK đã healthy. Muốn truy cập Kibana cần Hoàng kiểm SSM port forwarding và certificate trust; không mở 5601 công khai để giải quyết việc truy cập.

Ví dụ traffic **local** tại shop loopback đã dựng; không chạy những lệnh này khi chưa có môi trường:

```text
python scripts/traffic/run.py burst --target http://127.0.0.1:8080 --count 120 --rate 5
python scripts/traffic/run.py login-fail --target http://127.0.0.1:8080 --count 5 --rate 1
python scripts/traffic/run.py scan404 --target http://127.0.0.1:8080 --count 20 --distinct 10 --rate 2
```

Với AWS, đọc `validate_target` trong traffic script và runbook trước khi đổi target; chỉ dùng lab nhóm kiểm soát, không bỏ qua guard hoặc phát traffic sang website khác. 120 request minh họa R1/R4 chỉ khi ngưỡng R4 của phiên nhỏ hơn 120 và snapshot thật đếm đủ trong 1 phút. R2/R3 có cửa sổ 5 phút: log buổi trước còn trong window có thể làm sai expected count, cần để cửa sổ hết dữ liệu liên quan hoặc dùng acceptance có điều phối.

## 6. Checklist và phương án dự phòng

- [ ] Slide/source/evidence cùng mốc, đã ghi giới hạn và pending.
- [ ] Website HTTP 200, các thao tác demo hoạt động.
- [ ] Browser trust/SSM truy cập Kibana từ đúng máy đã thử.
- [ ] Dashboard/map render đúng, không đưa synthetic vào bằng chứng traffic thật.
- [ ] Rule state/baseline/ngưỡng của phiên đã kiểm; time range bao phủ demo.
- [ ] Có video và ảnh dự phòng; chưa quay thì ghi NOT RUN.
- [ ] Kiểm màn hình/lịch sử lệnh/ảnh không lộ credentials hoặc dữ liệu riêng.
- [ ] Đã tập hai lượt và giải quyết lỗi chặn demo.
- [ ] Sau phiên đã xác nhận EC2 stopped; billing/guard không được coi là hard cap.

Nếu AWS không lên kịp, trình bày video và số liệu từ phiên 12/10 với nhãn rõ “bằng chứng phiên trước”; có thể dùng local nếu đã kiểm, nhưng nói đúng môi trường. Nếu map không có nhiều nước, giải thích nguồn IP và GeoIP, không trộn synthetic để giả nhiều người dùng thật.

## 7. Phân công đến final khoảng 7 tuần

| Giai đoạn | Hoàng | Trí | Bảo | Đầu ra chung |
|---|---|---|---|---|
| Tuần 1 | Vận hành buổi tiến độ | Web/kịch bản | Browser/dashboard | Báo cáo và ghi góp ý thầy |
| Tuần 2–3 | Domain/HTTPS, quyết định NAT/SSM/ProxyJump, phục hồi/cost | Sửa lỗi web/log, bộ dữ liệu/kịch bản ổn định | Parser/mapping/GeoIP, dashboard/rule export | Môi trường ổn định, kiến trúc được thống nhất |
| Tuần 4–5 | Tài nguyên, tải và đường truyền | Ca âm/dương, false positive/negative, traffic profiles | Counts/latency/alerts, hiệu chỉnh ngưỡng có version | Bảng thực nghiệm tái lập được |
| Tuần 6 | Kiến trúc, vận hành, chi phí | Website/log/phương pháp thử | Pipeline/dashboard/kết quả | Báo cáo, runbook, source/evidence freeze candidate |
| Tuần 7 | Rehearsal và dự phòng | Giải thích rule/kịch bản | Giải thích dữ liệu/kết quả | Regression, tập bảo vệ, bản final |

Không coi lịch là tiến độ đã đạt. Mỗi tuần cập nhật bằng evidence: việc làm, kết quả, giới hạn, owner và việc tiếp theo.
