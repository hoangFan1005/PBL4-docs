# 10 — Kiểm thử và demo

Trí tạo traffic, Bảo đối chiếu dữ liệu/cảnh báo, Hoàng kiểm tra đường mạng và chi phí. Tester mặc định là laptop/VM ngoài AWS; EC2 tester là tùy chọn. Chỉ kiểm thử website lab của nhóm.

## 1. Baseline E9

Chạy traffic bình thường 30–60 phút gồm xem sản phẩm, search có/không kết quả, login đúng, một số login sai hợp lý và giỏ hàng. Ghi start/end UTC, request/phút, top IP/URI, login success/fail, 404 và số người mô phỏng. Chốt B và ngưỡng R1–R4 trước phiên thử bất thường. Không dùng synthetic GeoIP để đo baseline.

## 2. Test matrix E11/E12

| Test | Dữ liệu | Kỳ vọng |
|---|---|---|
| R1-biên | 50 rồi 51 request/IP/1 phút | 50 không; 51 cảnh báo |
| R2-biên | 4 rồi 5 login fail/IP/5 phút | 4 không; 5 cảnh báo |
| R3-biên | 20 lỗi 404 nhưng 9 URI; sau đó đủ 10 URI | Chỉ cảnh báo khi cả hai điều kiện đúng |
| R4-biên | Tổng count bằng và lớn hơn max(100,3B) | Chỉ lớn hơn mới cảnh báo |
| Nhóm IP | Hai IP riêng mỗi IP dưới ngưỡng R1/R2 | Không cộng gộp thành một IP |
| Cửa sổ | Sự kiện hết hạn cửa sổ | Không tính sự kiện cũ |
| Phục hồi | Dừng traffic bất thường, chờ cửa sổ hết | Alert phục hồi; lần sau tái kích hoạt |
| Âm tính | Chạy lại phiên traffic thường | Ghi số alert sai, không giấu kết quả |

Đặt thời gian chạy để request nằm trong cửa sổ tại lần đánh giá; lịch 30 giây có thể khiến test sát biên trượt thời gian. Giữ log timestamps để giải thích. Một IP laptop không mô phỏng được nhiều IP thật bằng cách đổi XFF; test grouping dùng dữ liệu offline có nhãn, sau đó demo live với nguồn thực hiện có.

## 3. GeoIP E6/E7

Hiển thị map quốc gia và top country truy cập/bất thường, đối chiếu IP thật với database sử dụng. Không bắt buộc ba nước hoặc đúng thành phố. Dữ liệu replay nhiều quốc gia vào index synthetic riêng, ghi nhãn trên panel. IP private/lookup failure được thống kê riêng.

## 4. Độ trễ E13

Đồng bộ đồng hồ UTC, gắn request.id; tối thiểu đề xuất 30 mẫu, lưu từng mẫu. Không điền kết quả khi chưa đo.

- E13a: event.ingested - @timestamp. Tạo ingest pipeline ES có set event.ingested={{_ingest.timestamp}}, gắn index.default_pipeline trong template. Đảm bảo pipeline tồn tại trước khi ghi. Giá trị này chưa tính refresh và Kibana.
- E13b: lần đầu quan sát trên Kibana - thời điểm log phát sinh. Ghi auto-refresh, thao tác quan sát và sai số. Nếu polling Elasticsearch thì gọi là search visibility, không gọi là đã hiển thị Kibana.
- E13c: alert được tạo - thời điểm sự kiện làm đủ điều kiện rule. Ghi cửa sổ/lịch check; không tính từ request đầu tiên của một đợt dài.

Mẫu bảng: run_id, request.id/rule.id, event_time, ingest_time, first_visible_time, threshold_met_time, alert_time, latency_ms, ghi chú. Báo cáo N, median, p95, max và phương pháp tính; p95 ít mẫu chỉ mang tính tham khảo.

## 5. Demo 10–12 phút

1. Giới thiệu public/private, NAT, SG, ProxyJump.
2. Truy cập web và lần theo request → access/auth → Filebeat TLS → Logstash → document.
3. Mở dashboard request/login/GeoIP; chỉ rõ dữ liệu thật.
4. Chạy kịch bản login fail hoặc 404; xem alert và so log gốc. Các rule còn lại có bảng kết quả đã chạy.
5. Trình bày E13, false positive, chi phí và giới hạn.

Lưu screenshot Kibana + log gốc + query/config cho mỗi rule. Tin nhắn chỉ bổ sung nếu đã tích hợp. Test TLS CA sai phải thất bại, Kibana không truy cập trực tiếp Internet, restart Filebeat không mất/nhân đôi log phải được kiểm chứng và ghi kết quả.
