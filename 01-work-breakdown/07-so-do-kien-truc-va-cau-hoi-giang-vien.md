# Sơ đồ kiến trúc và câu hỏi xác nhận với giảng viên

> **Bản hiện tại cập nhật ngày 14/09/2026:** 2 EC2, 1 VPC, 1 AZ, 1 public subnet, 1 private subnet, Internet Gateway và NAT Gateway. EC2-WEB ở public subnet; EC2-ELK ở private subnet. Xem [thiết kế chi tiết](08-thiet-ke-he-thong-aws-de-xuat.md) và [file draw.io](assets/pbl4-system-design.drawio).

## 1. Prompt tạo sơ đồ trên draw.io

> Vẽ sơ đồ kiến trúc AWS cho đồ án PBL4 giám sát truy cập website tại Region ap-southeast-1 Singapore. Tạo VPC pbl4-vpc CIDR 10.0.0.0/16 trong một Availability Zone. Trong AZ có public subnet 10.0.1.0/24 và private subnet 10.0.2.0/24. Public subnet chứa EC2-WEB 10.0.1.10 có public IPv4 và NAT Gateway gắn Elastic IP. EC2-WEB chạy Ubuntu, Nginx, PHP-FPM, MariaDB, access/auth log và Filebeat. Private subnet chứa EC2-ELK 10.0.2.20, không có public IPv4, chạy Logstash, Elasticsearch, Kibana và GeoLite2. Public route table có 0.0.0.0/0 tới Internet Gateway. Private route table có 0.0.0.0/0 tới NAT Gateway. Vẽ người dùng và máy tester truy cập WEB qua HTTPS 443. Filebeat gửi log bằng private IP tới Logstash TCP 5044 TLS; Logstash ghi Elasticsearch qua HTTPS 9200; Kibana truy vấn Elasticsearch. Vẽ EC2-ELK đi Internet outbound qua NAT để cập nhật. Nhóm quản trị SSH tới WEB từ IP /32, dùng WEB làm jump host để SSH tới ELK và tạo tunnel tới Kibana 127.0.0.1:5601. Ghi rõ không mở 3306, 5601 hoặc 9200 ra Internet.

## 2. Câu hỏi về website

1. Website PHP chạy Nginx và PHP-FPM, dùng MariaDB, chỉ gồm đăng nhập, đăng xuất, sản phẩm và giỏ hàng, không có thanh toán thật, đã đáp ứng phạm vi chưa?
2. Nhóm có cần dùng Laravel hay PHP thuần là đủ?
3. Có cần đăng ký tài khoản, phân quyền admin/user hoặc trang quản trị không?
4. Website có cần domain và HTTPS hợp lệ, hay public IP/self-signed certificate đủ cho demo?
5. Access log của Nginx và auth log của PHP đã đủ dữ liệu chưa; có cần thêm error log, system log hoặc database log?
6. Khi chấm, phần chức năng website và phần giám sát log được ưu tiên theo tỷ trọng nào?

## 3. Câu hỏi về ELK, GeoIP và phát hiện bất thường

7. Pipeline `Nginx/PHP → Filebeat → Logstash → Elasticsearch → Kibana` đã đúng yêu cầu chưa?
8. Logstash, Elasticsearch và Kibana chạy chung một EC2 single-node có được chấp nhận không?
9. Logstash parse JSON, chuẩn hóa ECS, phân tích user-agent và bổ sung GeoIP đã đủ mức xử lý dữ liệu chưa?
10. Có bắt buộc dùng Machine Learning cho “phát hiện hành vi bất thường”, hay rule-based detection dựa trên baseline và ngưỡng được chấp nhận?
11. Bốn ca brute-force đăng nhập, quét URL gây nhiều 404, traffic spike và scanner user-agent đã đủ chưa?
12. GeoIP có thể sai ở cấp thành phố; nhóm có thể đánh giá chính ở cấp quốc gia và dùng log mô phỏng được gắn nhãn riêng không?
13. Nhóm cần đo những chỉ số nào: độ trễ ingest, tỷ lệ phát hiện, false positive, CPU/RAM, dung lượng đĩa hay thời gian cảnh báo?
14. Luồng demo một request từ Nginx đến Kibana, sau đó tạo traffic bất thường để kích hoạt cảnh báo, đã đủ làm bằng chứng chưa?

## 4. Câu hỏi về kiến trúc AWS

15. Mô hình 1 VPC, 1 AZ, public subnet cho WEB/NAT và private subnet cho ELK đã đúng phạm vi chưa?
16. ELK không có public IP, quản trị qua WEB làm jump host, có được chấp nhận hay cần bastion host riêng?
17. NAT Gateway có bắt buộc, hay nhóm được phép đổi sang NAT instance/VPC endpoints để giảm chi phí?
18. Database đặt cùng EC2-WEB có phù hợp, hay cần đặt MariaDB/RDS trong private subnet?
19. Máy tester dùng laptop/VM bên ngoài AWS có được chấp nhận hay bắt buộc thêm EC2-TESTER?
20. Đề tài có yêu cầu High Availability, nhiều AZ, ALB, Auto Scaling hoặc backup tự động không?

## 5. Đoạn trình bày ngắn

> Nhóm em thiết kế website PHP tối giản trên EC2-WEB trong public subnet để tạo access log và auth log. Filebeat chuyển log qua private IP tới EC2-ELK trong private subnet. Logstash xử lý ECS, user-agent và GeoIP; Elasticsearch lưu trữ; Kibana trực quan hóa và phát hiện bất thường bằng rule. EC2-ELK không có public IP, đi Internet outbound qua NAT Gateway và được quản trị qua WEB làm jump host. Nhóm muốn thầy xác nhận phạm vi website, việc dùng rule thay cho Machine Learning và kiến trúc public/private một AZ này.


## Quyết định sau khi nhận phản hồi

Các câu hỏi ở dưới được lưu làm lịch sử trao đổi. Thầy đã xác nhận website cơ bản, rule/ngưỡng, GeoIP quốc gia, kiến trúc hiện tại và demo toàn tuyến. Không còn phải chờ phê duyệt các mục này. Nội dung chưa được trả lời riêng gồm framework, loại máy tester và ngân sách chi tiết; nhóm chọn PHP thuần, laptop/VM, lập dự toán riêng. Triển khai theo CONTRACT và kế hoạch 09.
