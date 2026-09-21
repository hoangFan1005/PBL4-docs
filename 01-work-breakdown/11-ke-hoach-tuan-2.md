# Tuần 2 — 21–27/09/2026 — Dựng offline và chốt hợp đồng dữ liệu

## Mục tiêu tuần

Đạt cổng G2: app PHP chạy local; ELK chạy local; mẫu access/error/auth log được bàn giao; ít nhất 20 dòng access/auth parse sạch; thiết kế VPC, subnet, route, Security Group và chi phí được review trên giấy. Chưa triển khai hạ tầng AWS chính thức trong tuần này.

## Điều kiện đầu tuần

Hoàng hoàn tất W1-A3: bằng chứng ba người SSH, Cost Explorer, dọn tài nguyên thử và biên bản G1 PASS/BLOCKED. Nếu G1 chưa PASS, chỉ tiếp tục các việc offline; không tạo hạ tầng AWS chính thức.

## Phân công

| ID | Người | Công việc | Hạn 21:00 |
|---|---|---|---|
| W2-A1 | Hoàng | Hoàn tất G1 và kiểm kê chi phí/tài nguyên AWS | 22/09 |
| W2-A2 | Hoàng | Thiết kế VPC, public/private subnet, routes, NAT và SG | 24/09 |
| W2-A3 | Hoàng | Review CONTRACT, dự toán và chủ trì nghiệm thu G2 | 27/09 |
| W2-B1 | Trí | Dựng shop PHP local: sản phẩm, login/logout, giỏ hàng, health | 23/09 |
| W2-B2 | Trí | Cấu hình access JSON, error log và PHP auth log | 25/09 |
| W2-B3 | Trí | Tạo bộ log mẫu, test ca 200/404/login và bàn giao cho Bảo | 27/09 |
| W2-C1 | Bảo | Dựng Elasticsearch, Logstash và Kibana local | 23/09 |
| W2-C2 | Bảo | Viết pipeline theo ba dataset, mapping ECS và xử lý parse failure | 25/09 |
| W2-C3 | Bảo | Parse bộ log của Trí, kiểm tra Discover và lập biên bản G2 | 27/09 |

## Đầu ra bắt buộc

- Hoàng: sơ đồ VPC/CIDR, bảng route/SG, dự toán chi phí và biên bản G1.
- Trí: source web chạy local, hướng dẫn chạy, ba mẫu log không chứa mật khẩu/token và bộ dữ liệu tối thiểu 20 dòng.
- Bảo: stack ELK local, Logstash config test PASS, raw log đối chiếu với document và thống kê parse failure.
- Cả nhóm: CONTRACT được review; quyết định chưa thống nhất phải được ghi lại, không tự đổi schema riêng lẻ.

## Cổng G2

G2 chỉ PASS khi: app chạy local; ELK chạy local; Bảo parse sạch bộ log do Trí bàn giao; Hoàng hoàn tất review thiết kế VPC; cả ba xác nhận CONTRACT. Không xem ảnh chụp hoặc tài liệu lý thuyết là bằng chứng hệ thống đã chạy.

## Lịch phối hợp

- 23/09: Trí demo app; Bảo demo ELK; Hoàng kiểm tra G1.
- 25/09: bàn giao log lần 1, sửa schema/parser.
- 27/09: chạy nghiệm thu G2 và ghi PASS/BLOCKED cho từng điều kiện.

## Tài liệu

- [CONTRACT](../CONTRACT.md)
- [Giai đoạn 2](02-giai-doan-2-trien-khai.md)
- [Web server và PHP](../02-learning/04-web-server-va-app.md)
- [Kiến trúc ELK](../02-learning/05-elk-kien-truc.md)
- [Thu thập và xử lý log](../02-learning/06-thu-thap-va-xu-ly-log.md)
- [Hợp đồng bàn giao](05-hop-dong-ban-giao.md)
