# 09 — Phát hiện bất thường: 4 rule cốt lõi

Trí đặc tả rule và test; Bảo triển khai query/alert. Giảng viên chấp nhận luật/ngưỡng, không yêu cầu ML. Ngưỡng sau là khởi đầu của nhóm, cần hiệu chỉnh theo E9 baseline.

| ID | Dataset / nhóm | Điều kiện | Cửa sổ |
|---|---|---|---|
| R1 | nginx.access / source.ip | count >50 | 1 phút |
| R2 | shop.auth, event.action=login_failed / source.ip | count >=5 | 5 phút |
| R3 | nginx.access, status_code=404 / source.ip | count >=20 AND số url.path khác nhau >=10 | 5 phút |
| R4 | nginx.access / toàn website | count >max(100,3×B) | 1 phút |

B là request/phút baseline trung bình của phiên bình thường 30–60 phút, có cả phút không request; lưu giá trị và thời gian đo. Nếu B=0 dùng ngưỡng 100 và ghi baseline chưa đại diện. R1 theo IP, R4 theo toàn website. R3 không được gọi là “liên tiếp” vì chỉ đếm trong cửa sổ.

## Đặc tả triển khai

Check mỗi 30 giây; cửa sổ (now-window, now]. Loại index synthetic và parse lỗi. Mỗi rule lưu lọc, nhóm, toán tử so sánh, ngưỡng, thời gian và phiên bản. R3 cần phép đếm URI khác nhau; không triển khai thành chỉ đếm 404 rồi tuyên bố đạt đủ rule. Nếu dùng cardinality gần đúng, ghi giới hạn và đối chiếu tập URL gốc trong test biên.

Ưu tiên Kibana Elasticsearch query rule với ES|QL/aggregation tương ứng. R1/R2 có thể dùng Index threshold; nếu UI chỉ hỗ trợ “above”, điều kiện >=5 tương ứng count >4. Không dùng KQL một mình để biểu diễn GROUP BY hoặc đếm distinct; KQL chỉ lọc. R3 cần xác minh khả năng query rule ở bản cài, chạy query trong Dev Tools rồi tạo alert từ đúng kết quả nhóm. R4 tính threshold từ baseline cố định, không đòi ML.

Mẫu logic R3: lọc nginx.access + status 404 + thời gian; nhóm source.ip; COUNT(*) >=20 AND COUNT_DISTINCT(url.path) >=10. Kiểm tra giới hạn số group/top-N để không bỏ sót IP. Không đánh dấu triển khai xong trước khi test alert thực.

## Cảnh báo và chứng cứ

Action chính ghi document vào pbl4-alerts-lab và hiển thị dashboard. Kiểm tra license thực trước khi chọn connector; tin nhắn/email tùy chọn. Watcher không phải yêu cầu bắt buộc. Nếu query rule không đáp ứng, đánh giá ElastAlert2 và ghi quyết định thay đổi; không chạy hai hệ cảnh báo không cần thiết.

Alert theo CONTRACT: rule.id, timestamp, IP/quốc gia nếu có, count, threshold, window. R3 thêm số URL; R4 nguồn là tổng website. Hạn chế lặp theo (rule.id, source.ip) trong 5 phút; R4 dùng khóa toàn hệ thống. Hiển thị lần đầu/last_seen để không làm mất sự kiện kéo dài. Kiểm thử trạng thái phục hồi dưới ngưỡng và kích hoạt lại.

Mỗi rule có E11 test dương, dưới ngưỡng, biên và E12 traffic bình thường. Lưu log gốc, query, cấu hình export và ảnh cảnh báo. Không kết luận request cao là tấn công đã xác minh; đó là tín hiệu cần xem xét.

## Mở rộng sau nghiệm thu cốt lõi

Scanner user-agent, dấu hiệu SQLi, download lớn và quốc gia ít gặp chỉ là mở rộng. Không coi user-agent hoặc quốc gia riêng lẻ là bằng chứng tấn công. Không bắt buộc 8 rule hoặc Machine Learning.

Nguồn: [Elastic subscriptions](https://www.elastic.co/subscriptions). Đối chiếu license trên bản cài trước khi bật action.
