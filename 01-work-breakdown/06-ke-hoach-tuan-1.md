# Tuần 1 — 14–20/09/2026

Kế hoạch bắt đầu từ số 0, bám cổng G1.

| Vai | Thành viên | Công việc tuần đầu | Giờ |
|---|---|---|---|
| A | Hoàng — Huy Hoàng Phan | Mạng/Cloud, dự toán, AWS/Budget, Hello EC2 | 11 |
| B | Trí — minhtridknj | Mạng/Linux, PHP local, SSH, phác thảo app/log | 10 |
| C | Bảo — Lê Bảo | Mạng/ELK, chuẩn bị lab local, schema, SSH | 10 |

Mỗi người có 3 thẻ với tài liệu đọc, đầu ra và phụ thuộc tại [ULTIMATE PBL4](https://trello.com/b/969Yhdb7/ultimate-pbl4).

## Lịch (giờ Việt Nam)

- 14–15/09: học nền tảng và chuẩn bị môi trường.
- 16–17/09: Hoàng thiết lập AWS/Budget; Trí/Bảo thực hành local.
- 17/09, 20:00–20:30: họp giữa tuần.
- 18/09: Hello EC2; cả ba tự SSH và lưu bằng chứng.
- 19–20/09: hoàn thiện đầu ra, kiểm tra chi phí và dọn tài nguyên lab.
- 20/09, 20:00–20:30: tổng kết G1. Hạn thẻ là 21:00 theo ngày trên Trello.

## Tiêu chí G1

Budget đã cấu hình và kiểm tra; cả ba có bằng chứng SSH; thấy chi phí trong Cost Explorer. Nếu billing chưa cập nhật thì ghi đang chờ, chưa đánh dấu G1 PASS.

Full shop, full ELK local và log mẫu >=20 dòng là mục tiêu tuần 2 (G2). Theo ma trận chính: B sở hữu detection, A phụ trách transport, C sở hữu ELK/data.


## Đồng bộ sau phản hồi giảng viên

Hoàng (A): AWS public/private, NAT, SG, SSM Session Manager (ProxyJump dự phòng), CA/SAN và chi phí. Trí (B): web PHP tối giản, access/error/auth, đặc tả R1–R4 và traffic/test. Bảo (C): parser/mapping, GeoIP quốc gia, query/alert và dashboard. Trí+Bảo đo E13a/b/c; cả nhóm đối chiếu bằng chứng.

Dependencies: CONTRACT/mẫu ba log → parser/TLS → dashboard → baseline → 4 rule → test dương/âm/biên → báo cáo. Kiến thức ưu tiên là mạng/SSH, log, TLS, ECS, aggregation và cửa sổ thời gian. Tester EC2, ML và nhiều quốc gia thật không là cổng bắt buộc. Giữ trạng thái công việc đã làm; phần chưa làm theo kế hoạch cập nhật, không đánh dấu hoàn thành thay nhóm.

Bàn giao mới: mẫu ba nguồn log, bảng SG/routes, CA công khai và hướng dẫn key (không gửi private key), schema alert, catalog 4 rule, bảng latency ba loại. Thuật ngữ: ingest latency khác dashboard visibility và detection latency. Xem CONTRACT và chương 09/10 để lấy tiêu chí hiện hành.
