# Thiết kế hệ thống AWS đề xuất cho PBL4

Cập nhật: 14/09/2026. Đây là thiết kế dự kiến, chưa phải kết quả triển khai.

## 1. Cấu hình đã chốt

**2 EC2 + 1 VPC + 1 AZ + 1 public subnet + 1 private subnet + 1 Internet Gateway + 1 NAT Gateway.**

- Sơ đồ chỉnh sửa: [pbl4-system-design.drawio](assets/pbl4-system-design.drawio)
- Ảnh xem nhanh: [PNG](assets/pbl4-system-design.png) · [SVG](assets/pbl4-system-design.svg)
- Máy cá nhân hoặc VM của nhóm làm tester, không tính vào số EC2.

| Tài nguyên | Số lượng | Cấu hình / vai trò |
|---|---:|---|
| Region | 1 | Singapore, `ap-southeast-1` |
| VPC | 1 | `pbl4-vpc`, `10.0.0.0/16` |
| AZ | 1 | Ví dụ `ap-southeast-1a` |
| Public subnet | 1 | `10.0.1.0/24`: EC2-WEB và NAT Gateway |
| Private subnet | 1 | `10.0.2.0/24`: EC2-ELK |
| EC2 | 2 | WEB `10.0.1.10`; ELK `10.0.2.20` |
| Internet Gateway | 1 | Kết nối public subnet với Internet |
| NAT Gateway | 1 | Nằm trong public subnet, gắn Elastic IP |
| Route table tùy chỉnh | 2 | Một public, một private |
| Security Group | 2 | `pbl4-web-sg`, `pbl4-elk-sg` |
| Public IPv4 | 1 cho WEB + 1 EIP cho NAT | ELK không có public IPv4 |

## 2. Vị trí các thành phần

### Public subnet

EC2-WEB chạy Ubuntu, Nginx, PHP-FPM, MariaDB và Filebeat. Máy có public IPv4 để người dùng truy cập website. MariaDB chỉ phục vụ ứng dụng tại máy WEB và không mở cổng 3306 ra Internet.

NAT Gateway cũng nằm trong public subnet và phải gắn Elastic IP. NAT cho phép EC2-ELK chủ động tải package, cập nhật hệ điều hành và tải database GeoIP; NAT không nhận kết nối chủ động từ Internet vào ELK.

### Private subnet

EC2-ELK chạy Logstash, Elasticsearch, Kibana và GeoLite2. Máy chỉ có private IP, không có public IPv4. Log từ WEB đi thẳng tới ELK qua route `local` của VPC, không đi qua NAT.

Quản trị ELK bằng SSH qua EC2-WEB như jump host:

```text
Máy quản trị → SSH EC2-WEB → ProxyJump SSH EC2-ELK → tunnel Kibana
```

## 3. Route table

Public route table, gắn với public subnet:

| Destination | Target |
|---|---|
| `10.0.0.0/16` | `local` |
| `0.0.0.0/0` | Internet Gateway |

Private route table, gắn với private subnet:

| Destination | Target |
|---|---|
| `10.0.0.0/16` | `local` |
| `0.0.0.0/0` | NAT Gateway |

## 4. Luồng xử lý

1. Người dùng hoặc tester truy cập public IP/domain của EC2-WEB bằng HTTPS 443.
2. Nginx chuyển request PHP cho PHP-FPM; PHP đọc/ghi MariaDB local.
3. Nginx ghi access log JSON, ứng dụng PHP ghi auth log.
4. Filebeat gửi phần log mới tới `10.0.2.20:5044` bằng private IP và TLS.
5. Logstash parse, chuẩn hóa ECS, phân tích user-agent và bổ sung GeoIP.
6. Logstash ghi document vào Elasticsearch qua HTTPS 9200 tại EC2-ELK.
7. Kibana truy vấn Elasticsearch để tạo Discover, Dashboard, Maps và cảnh báo.
8. EC2-ELK đi Internet theo chiều outbound qua NAT Gateway khi cần cập nhật.

## 5. Security Group

| Đích | Port | Nguồn |
|---|---:|---|
| EC2-WEB | 80, 443 | `0.0.0.0/0` |
| EC2-WEB | 22 | Public IP quản trị `/32` |
| EC2-ELK | 5044 | `pbl4-web-sg` |
| EC2-ELK | 22 | `pbl4-web-sg` để quản trị qua jump host |

Không mở 3306, 5601, 9200 hoặc 9300 ra Internet. Kibana được truy cập bằng SSH tunnel. Elasticsearch và Kibana nên bind loopback nếu chỉ các tiến trình cùng máy sử dụng.

## 6. Đánh đổi chi phí

Private subnet không thu phí riêng, nhưng NAT Gateway tính phí theo giờ và dữ liệu xử lý. Nếu để NAT chạy liên tục, nó có thể tiêu thụ phần đáng kể credit $200. Nhóm cần:

- tạo AWS Budget và cảnh báo;
- chỉ tạo NAT khi bắt đầu giai đoạn triển khai;
- xóa NAT Gateway và giải phóng Elastic IP khi không còn cần;
- không chỉ stop EC2 rồi cho rằng NAT cũng dừng tính phí;
- cân nhắc NAT instance hoặc VPC endpoints nếu giảng viên cho phép tối ưu lại.

## 7. Giới hạn

Thiết kế dùng một AZ và mỗi vai trò chỉ có một EC2, nên chưa có High Availability. NAT Gateway trong một AZ cũng là một điểm phụ thuộc. Phạm vi hiện tại không có ALB, Auto Scaling, RDS hoặc Elasticsearch cluster nhiều node.

## 8. Câu hỏi xác nhận với giảng viên

> Nhóm dự kiến dùng một VPC trong một AZ, tách public subnet cho EC2-WEB và NAT Gateway, private subnet cho EC2-ELK. WEB gửi log sang ELK bằng private IP; ELK không có public IPv4, đi Internet outbound qua NAT và được quản trị qua WEB làm jump host. Kiến trúc này đã đáp ứng yêu cầu phân tầng mạng của đề tài chưa, hay cần thêm AZ, bastion riêng hoặc thay đổi vị trí database?
