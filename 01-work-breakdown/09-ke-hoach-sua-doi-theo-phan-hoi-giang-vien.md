# Kế hoạch sửa đổi tài liệu PBL4 theo phản hồi giảng viên

## 1. Căn cứ và trạng thái

Căn cứ: phản hồi giảng viên do Hoàng cung cấp trong cuộc trò chuyện. Đây là kế hoạch sửa đổi bộ Markdown và nội dung báo cáo; không phải xác nhận hệ thống đã triển khai hoặc kiểm thử. Đã áp dụng đợt sửa Markdown và sơ đồ theo kế hoạch này. Bảng đánh giá hiện trạng bên dưới ghi nhận trước thay đổi. Chưa chạy triển khai AWS hoặc kiểm thử ELK thực.

Giảng viên xác nhận: website PHP cơ bản không thanh toán; phát hiện bằng luật/ngưỡng; đánh giá GeoIP cấp quốc gia; 1 VPC, 1 public subnet, 1 private subnet, NAT Gateway, 2 EC2; MariaDB local; ELK single-node; demo toàn tuyến. Không cần bổ sung ML, ALB, RDS hoặc nhiều AZ.

## 2. Đánh giá hiện trạng

| Nội dung | Đánh giá từ tài liệu | Sửa đổi cần làm |
|---|---|---|
| Kiến trúc | Bản 08 và sơ đồ hiện tại phù hợp phản hồi | Giữ kiến trúc; ghi trạng thái được giảng viên xác nhận về phạm vi, chưa triển khai |
| Website | PHP, sản phẩm, giỏ hàng, login phù hợp | Ghi rõ không thanh toán/nạp tiền; bổ sung error log và ca tạo lỗi |
| Detection | Chương 09 yêu cầu 8 rule, rộng hơn phần cốt lõi thầy xác nhận | 4 rule bắt buộc; các rule SQLi/scanner/khác chuyển thành mở rộng |
| GeoIP | CONTRACT đã có source.geo.*, nhưng tài liệu còn yêu cầu nhiều quốc gia và hướng mô phỏng XFF | Đánh giá cấp quốc gia; giữ ECS; tách dữ liệu thật/mô phỏng |
| TLS | Chương 06 còn beats input không TLS và CA bị comment | Đồng bộ cấu hình thật với sơ đồ 5044 + TLS; kiểm tra chứng chỉ |
| Tester | Một số chương vẫn bắt buộc EC2 khác Region | Laptop/VM là mặc định; EC2 tester tùy chọn, không tự xem là thầy đã xác nhận loại máy |
| Độ trễ | E13 hiện tập trung độ trễ phát hiện | Tách độ trễ ingest, hiển thị và cảnh báo |
| Chi phí | Dự toán cũ có cấu hình ELK 4 GiB, một số số tiền chưa gồm NAT | Lập lại dự toán theo cấu hình và giờ tồn tại NAT thực tế |

## 3. Phạm vi nghiệm thu đề xuất

### Website và log

- Chức năng: đăng nhập/đăng xuất, xem sản phẩm, giỏ hàng, tìm kiếm đơn giản. Không thanh toán, nạp tiền hoặc phát triển e-commerce hoàn chỉnh.
- Tìm kiếm không có kết quả vẫn có thể trả HTTP 200; tạo 404 bằng URL không tồn tại, không đổi sai ngữ nghĩa HTTP chỉ để có log.
- Nginx access log JSON; Nginx error log thu riêng; PHP auth log ghi login_success/login_failed và logout khi cần.
- Tách event.dataset cho access/error/auth để không đếm một lượt login thành hai request. Request count chỉ dùng access log; login ratio chỉ dùng auth log.
- Không ghi mật khẩu, cookie phiên hoặc token vào log. Có request ID để đối chiếu access/auth khi phù hợp.

### Bốn rule cốt lõi

Các ngưỡng dưới đây là cấu hình khởi đầu đề xuất, không phải số bắt buộc của giảng viên. Phải điều chỉnh theo baseline và ghi lý do.

| Rule | Điều kiện ban đầu | Dữ liệu / nhóm | Lịch kiểm tra |
|---|---|---|---|
| R1 Request cao từ một IP | >50 request trong 1 phút | Access log, group source.ip | 30 giây |
| R2 Login fail nhiều lần | >=5 login_failed trong 5 phút | Auth log, group source.ip | 30 giây |
| R3 Quét 404 | >=20 request 404 với >=10 URL khác nhau trong 5 phút | Access log, group source.ip | 30 giây |
| R4 Tăng lưu lượng toàn website | >3 lần baseline request/phút và >100 request/phút | Tổng access log; baseline cố định từ phiên traffic bình thường | 30 giây |

R1 là ngưỡng theo IP; R4 là tổng lưu lượng website nên không trùng mục đích. R3 đo trong cửa sổ thời gian, không gọi là “liên tiếp” nếu chưa kiểm tra thứ tự sự kiện. R4 cần quy định xử lý baseline bằng 0 trước khi chạy.

Mỗi rule phải có: rule ID, nguồn log, bộ lọc, nhóm, cửa sổ, phép so sánh, ngưỡng, lịch chạy, cơ chế hạn chế cảnh báo lặp, ví dụ dương tính và âm tính. Alert có timestamp, rule ID, IP/country khi có, observed_count, threshold, window_start/end. Với R4 tổng hợp toàn website, IP/country có thể là danh sách top nguồn hoặc không áp dụng; không gán một IP giả đại diện.

Chọn một cơ chế alert chính sau khi kiểm tra phiên bản/license thực tế. Ưu tiên rule Kibana đáp ứng phép đếm/nhóm cần thiết; nếu thiếu khả năng thì đánh giá ElastAlert2. Watcher không tự động trở thành yêu cầu chỉ vì thầy liệt kê các lựa chọn. Tin nhắn là mở rộng; cảnh báo thực tế trên Kibana và log gốc là bắt buộc.

### GeoIP

Giữ schema ECS hiện có để không phá pipeline/dashboard. Trong báo cáo giải thích tương đương:

| Tên trong góp ý | Trường chuẩn dự án |
|---|---|
| geoip.country_name | source.geo.country_name |
| geoip.country_iso_code | source.geo.country_iso_code |
| geoip.location | source.geo.location, kiểu geo_point |

Dùng database có tọa độ nếu cần lat/lon; không suy ra phải dùng database Country chỉ vì đánh giá cấp quốc gia. Không bắt buộc city_name. Map theo quốc gia, top country truy cập và top country có sự kiện bất thường. Thống kê IP private/không tra được riêng, không tự điền quốc gia.

Nguồn IP thật của kết nối trực tiếp là remote_addr. Không tin X-Forwarded-For do khách tự gửi. Log mô phỏng đa quốc gia phải có nhãn và bộ dữ liệu riêng; không dùng để chứng minh độ chính xác GeoIP hoặc trộn vào baseline. Không giữ yêu cầu “>=3 nước thật” nếu đề gốc không yêu cầu.

### Hạ tầng và TLS

- WEB 10.0.1.10 trong public subnet 10.0.1.0/24; ELK 10.0.2.20 trong private subnet 10.0.2.0/24. Địa chỉ dự kiến phải đối chiếu khi tạo máy.
- WEB-SG: 80/443 từ Internet, 22 từ public IP /32 của nhóm.
- ELK-SG: 5044 và 22 từ WEB-SG; Kibana không mở trực tiếp qua SG.
- ProxyJump tới ELK qua WEB, port-forward tới Kibana loopback. Private key giữ tại máy quản trị, không chép lên WEB.
- Filebeat xác minh certificate của Logstash; SAN khớp IP/DNS đích. CA cho Beats input phải đúng CA ký certificate Logstash; không mặc định lấy CA của Elasticsearch rồi coi là dùng được.
- NAT chỉ phục vụ outbound cần thiết; WEB → ELK qua route local. Ghi phí NAT khi EC2 stopped và các bước xóa NAT/giải phóng EIP.

## 4. Danh sách sửa theo file

| File | Thay đổi | Chủ trì |
|---|---|---|
| README.md | Tóm tắt phạm vi đã xác nhận; link bản kế hoạch; bỏ các cam kết ngân sách không có dự toán mới | Hoàng |
| CONTRACT.md | Chốt access/error/auth, ECS GeoIP, timestamp UTC, request ID, trường alert và dữ liệu mô phỏng | Trí + Bảo |
| 01-work-breakdown/00-tong-quan-va-phan-tich-de-bai.md | Phân biệt yêu cầu đề, xác nhận thầy và đề xuất của nhóm | Hoàng |
| 01-work-breakdown/01-giai-doan-1-kien-thuc.md | Ưu tiên log, mạng public/private, TLS, rule và baseline | Hoàng |
| 01-work-breakdown/02-giai-doan-2-trien-khai.md | Đồng bộ 2 EC2, tester local, 4 rule, TLS bắt buộc trong thiết kế | Hoàng |
| 01-work-breakdown/03-giai-doan-3-kiem-thu-demo-baocao.md | Kịch bản demo và bộ bằng chứng mới | Cả nhóm |
| 01-work-breakdown/04-ma-tran-phan-cong-va-rui-ro.md | Sửa dependencies, bỏ đa quốc gia thật/8 rule khỏi cổng bắt buộc | Hoàng |
| 01-work-breakdown/05-hop-dong-ban-giao.md | Bổ sung mẫu error log, chứng chỉ, kết quả rule và độ trễ | Cả nhóm |
| 01-work-breakdown/06-ke-hoach-tuan-1.md | Cập nhật công việc chưa làm; giữ lịch sử phần đã hoàn thành | Hoàng |
| 01-work-breakdown/07-so-do-kien-truc-va-cau-hoi-giang-vien.md | Chuyển câu hỏi đã trả lời thành quyết định; giữ câu chưa được xác nhận riêng | Hoàng |
| 01-work-breakdown/08-thiet-ke-he-thong-aws-de-xuat.md và assets | Giữ topology; bổ sung error log, thông số máy và chú giải đường quản trị | Hoàng |
| 02-learning/03-cloud-va-aws.md | Đồng bộ thông số máy, NAT, ProxyJump, tester và dự toán | Hoàng |
| 02-learning/04-web-server-va-app.md | Thêm ca 404/search, error log, login success/fail; bỏ tin XFF trực tiếp | Trí |
| 02-learning/05-elk-kien-truc.md | Chốt pipeline đủ ELK; kiểm tra phiên bản/license; không mặc định bỏ Logstash khi chậm tiến độ | Bảo |
| 02-learning/06-thu-thap-va-xu-ly-log.md | Input/parser theo từng dataset; bật TLS đúng CA/SAN; kiểm chứng mapping | Bảo + Hoàng |
| 02-learning/07-geoip.md | Quốc gia là tiêu chí chính; dữ liệu mô phỏng riêng; schema ECS | Bảo |
| 02-learning/08-kibana-dashboard.md | Panel đúng chỉ số giảng viên; quốc gia truy cập/bất thường; lỗi parse | Bảo |
| 02-learning/09-phat-hien-bat-thuong.md | 4 rule cốt lõi có đặc tả; các rule khác là mở rộng | Trí + Bảo |
| 02-learning/10-kiem-thu-va-demo.md | Test biên/ngưỡng/âm tính; pipeline latency và detection latency riêng | Trí + Bảo |
| 02-learning/11-bao-mat-van-hanh-chi-phi.md | Runbook NAT/EIP, retention, backup và chi phí thực | Hoàng |
| 02-learning/12-phu-luc.md | Đồng bộ thuật ngữ và bảng tham chiếu | Cả nhóm |

Các chương mạng/Linux không cần viết lại toàn bộ. Báo cáo Word nếu có sẽ lấy nội dung từ bản Markdown đã chốt; chưa xác định file Word hiện hữu trong lần rà soát này.

## 5. Trình tự sửa và phân công

Lịch dưới đây tính theo ngày làm việc từ lúc nhóm bắt đầu, chưa gán ngày lịch và chưa khẳng định tiến độ triển khai hiện tại.

| Ngày | Hoàng (A – Cloud/điều phối) | Trí (B – Web/detection) | Bảo (C – ELK/data) | Đầu ra chung |
|---|---|---|---|---|
| 1 | Chốt scope và topology | Chốt chức năng/log/test request | Chốt schema và pipeline | CONTRACT mới, danh sách phạm vi |
| 2 | Sửa SG/route/ProxyJump/NAT | Viết mẫu access/error/auth | Sửa mapping và kế hoạch TLS | Hướng dẫn nhất quán, mẫu log |
| 3 | Dự toán theo giờ chạy thực | Đặc tả R1–R4 và baseline | Kiểm tra cơ chế rule phù hợp | Danh mục rule triển khai được |
| 4 | Kiểm tra đường quản trị/TLS trong tài liệu | Viết test dương/âm/biên | Thiết kế dashboard/GeoIP | Test matrix, dashboard spec |
| 5 | Rà soát liên kết/phân công/cổng nghiệm thu | Đối chiếu web → log → rule | Đối chiếu log → doc → panel | Bộ Markdown sửa xong, dàn ý báo cáo |

Đây là lịch sửa tài liệu và chuẩn bị cấu hình; thời gian triển khai/đo kết quả chỉ chốt sau khi kiểm kê phần đã làm. Không điền số đo hoặc ảnh giả vào báo cáo để kịp lịch.

## 6. Đo lường và bằng chứng

- Request theo thời gian, top IP, top URI: chỉ access dataset.
- Login success/fail: số lượng và tỷ lệ; mẫu số chỉ gồm các lần login có kết quả.
- GeoIP: map quốc gia, bảng top country, tỷ lệ tra được; tách dữ liệu mô phỏng.
- Bốn rule: mỗi rule có test kích hoạt, test dưới ngưỡng và test sát biên. R2 ví dụ 4 fail không cảnh báo, 5 fail trong cửa sổ có cảnh báo. Kiểm tra nhiều IP không bị gộp nhầm.
- Alert: đối chiếu timestamp/IP/country/count với tập log gốc. Đếm false positive trong phiên bình thường và ghi rõ đơn vị mẫu; không kết luận chính xác tuyệt đối từ vài ca demo.
- Thời gian UTC và đồng bộ đồng hồ. Giữ @timestamp từ sự kiện; bổ sung event.ingested khi ingest ES nếu dùng. event.ingested - @timestamp đo tới ingest, chưa bao gồm refresh/search/Kibana.
- Độ trễ hiển thị end-to-end: dùng request ID, ghi lúc phát sinh và lần đầu quan sát được trên Kibana; ghi chu kỳ auto-refresh và sai số quan sát. Báo cáo số mẫu, median, p95 và max nếu đủ mẫu.
- Độ trễ cảnh báo: tính từ thời điểm đủ điều kiện rule tới lúc alert được tạo; tách khỏi độ trễ ingest. Ghi lịch chạy rule và cửa sổ truy vấn.

Giữ E-ID hiện hữu để giảm thay đổi: E1 sơ đồ; E2 SG/routes; E3 schema/mẫu log; E4 raw log ↔ document; E6 map quốc gia; E7 GeoIP thiếu/không tra được; E8 dashboard; E9 baseline; E10 rule catalog; E11 test; E12 negative control; E13a ingest, E13b hiển thị, E13c cảnh báo; E14 chi phí; E15 teardown. Đối chiếu danh mục E-ID gốc trước khi cập nhật đồng loạt.

## 7. Dàn ý nội dung báo cáo

1. Bài toán, phạm vi và phản hồi xác nhận của giảng viên.
2. Kiến trúc AWS, địa chỉ/route/SG và chi phí dự kiến.
3. Website sinh dữ liệu và schema ba nguồn log.
4. Pipeline Filebeat–Logstash–Elasticsearch, TLS và GeoIP.
5. Dashboard, đặc tả bốn rule và cách chọn ngưỡng.
6. Thực nghiệm: baseline, test matrix, ảnh/log gốc, độ trễ, false positive.
7. Giới hạn: một AZ/single-node, sai số GeoIP, giới hạn rule, dữ liệu mô phỏng.
8. Kết luận theo kết quả đo được và hướng mở rộng.

## 8. Điều kiện hoàn tất đợt sửa tài liệu

- Không còn mâu thuẫn giữa sơ đồ và lệnh triển khai về IP, subnet, SSH, TLS.
- Các yêu cầu 8 rule, 3 quốc gia thật, EC2 tester bắt buộc và thanh toán không còn nằm trong tiêu chí tối thiểu của nhóm nếu đề gốc không yêu cầu.
- Mỗi yêu cầu của giảng viên có file triển khai, người phụ trách và bằng chứng dự kiến.
- Các lệnh/phần mềm/license và giá AWS được kiểm tra từ nguồn chính thức khi sửa nội dung tương ứng, không sao chép các số cũ thành cam kết mới.
- Tài liệu nêu rõ phần đã kiểm thử và phần mới đề xuất. Kế hoạch này không tự thay thế việc triển khai và kiểm chứng.
