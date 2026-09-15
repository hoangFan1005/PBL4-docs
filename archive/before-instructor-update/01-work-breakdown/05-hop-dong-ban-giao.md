# 05 — Hợp đồng bàn giao (hand-off contracts)

> Vấn đề: 3 người làm song song nhưng đầu ra của người này là đầu vào của người kia.
> Nếu bàn giao mơ hồ ("tôi làm xong log rồi đấy") thì lỗi lộ ra rất muộn. Mỗi bàn
> giao dưới đây có **định dạng cố định** và **bài test nghiệm thu (acceptance test)**
> — chỉ khi test PASS mới coi là đã bàn giao.

## Cách đọc bảng
Mỗi bàn giao: **ai giao → ai nhận → nội dung → định dạng → test nghiệm thu → hạn (cổng G)**.

---

## Bàn giao #1 — A → (B, C): Hạ tầng sẵn sàng
- **Nội dung:** 3 EC2 chạy (WEB, ELK, TESTER), private IP + public IP, key pair, SG mở đúng.
- **Định dạng:** một bảng "inventory" (bảng tài nguyên): tên máy · instance id · private IP · public IP/EIP · region · SG gắn kèm.
- **Test nghiệm thu:**
  - B/C `ssh -i key.pem ubuntu@<public-ip>` vào được cả WEB và ELK.
  - Từ EC2-WEB: `ping <private-ip-ELK>` và `nc -vz <private-ip-ELK> 5044` thông (sau khi C mở Logstash).
- **Hạn:** G3.

## Bàn giao #2 — B → A: Yêu cầu mở port giữa 2 máy
- **Nội dung:** danh sách port cần thông máy-tới-máy (WEB→ELK:5044; nhóm→ELK:5601; nhóm→WEB:80/443).
- **Định dạng:** bổ sung vào **ma trận SG** (proto/port/nguồn/đích/**vì sao**).
- **Test nghiệm thu:** A xác nhận từng luật SG dùng **nguồn là SG khác** (vd `source = sg-web`) chứ không hard-code IP; không có `0.0.0.0/0` trên 22 và 5601.
- **Hạn:** G3.

## ⭐ Bàn giao #3 — B → C: File log mẫu (bàn giao quan trọng nhất)
Đây là bàn giao **tách C khỏi phụ thuộc B và AWS** — cho phép C dựng pipeline offline từ tuần 2.
- **Nội dung:** **≥20 dòng** access log JSON thật của nginx, chứa **ít nhất**: một `200`, một `404`, một `401`, một dòng `User-Agent: curl/...`, và **một dòng có URL chứa payload SQLi kèm ký tự `"`** (vd `/product.php?id=1%22%20OR%201=1--`).
- **Định dạng:** file `sample-access.json.log`, mỗi dòng một JSON hợp lệ, đúng schema trong [`CONTRACT.md`](../CONTRACT.md).
- **Test nghiệm thu:** C chạy
  ```bash
  logstash -f pipeline.conf --path.data /tmp/ls --config.test_and_exit   # cú pháp OK
  # rồi feed file mẫu qua input file + output rubydebug
  ```
  → **cả 20 dòng parse sạch, không có tag `_jsonparsefailure`/`_grokparsefailure`**, và trường `geo`/`user_agent` được sinh đúng.
- **Hạn:** G2 (cuối tuần 2). Đây là cổng bắt buộc — nó khoá **log schema** sớm.

## Bàn giao #4 — B → C: Log schema chốt
- **Nội dung:** danh sách trường + kiểu (đã thống nhất) mà app/nginx sẽ sinh.
- **Định dạng:** chính là [`CONTRACT.md`](../CONTRACT.md) (nguồn sự thật duy nhất về tên trường).
- **Test nghiệm thu:** mọi trường mà [06](../02-learning/06-thu-thap-va-xu-ly-log.md)/[07](../02-learning/07-geoip.md)/[08](../02-learning/08-kibana-dashboard.md)/[09](../02-learning/09-phat-hien-bat-thuong.md) dùng đều có mặt trong CONTRACT.
- **Hạn:** G2.

## Bàn giao #5 — C → A: Yêu cầu chứng chỉ CA cho Filebeat
- **Nội dung:** file CA của Elasticsearch (`/etc/elasticsearch/certs/http_ca.crt`) + user/API key tối thiểu cho Filebeat/Logstash.
- **Định dạng:** file CA + một dòng ghi rõ user và quyền (chỉ ghi vào data stream log, không phải superuser).
- **Test nghiệm thu:** trên EC2-WEB, `curl --cacert http_ca.crt -u <user>:<pass> https://<private-ip-ELK>:9200` trả `200` + thông tin cluster.
- **Hạn:** trước T11 / G4.

## ⭐ Bàn giao #6 — C → toàn nhóm: Index template có `geo_point` (TRƯỚC khi ingest)
- **Nội dung:** index template khai báo `source.geo.location` kiểu `geo_point`, `source.ip` kiểu `ip`, `http.response.status_code` kiểu `long`.
- **Test nghiệm thu:** `GET /_index_template/<name>` cho thấy các kiểu trên **trước khi** bật Filebeat (nếu document vào trước khi có template, mapping bị đoán sai → phải xoá & ingest lại).
- **Hạn:** T9, trước T11.

## Bàn giao #7 — B → C: Bảng threat model & danh mục rule
- **Nội dung:** danh sách hành vi tấn công cần phát hiện + tín hiệu trong log + ngưỡng dự kiến (điền sau baseline).
- **Định dạng:** bảng "rule catalogue" E10 (xem [GĐ3](03-giai-doan-3-kiem-thu-demo-baocao.md)).
- **Test nghiệm thu:** mỗi rule có ≥1 test case tương ứng trong bảng thực thi E11.
- **Hạn:** T13.

## Bàn giao #8 — cả nhóm → báo cáo: Gói bằng chứng (E-ID)
- **Nội dung:** toàn bộ artefact E1…E16 (xem [GĐ3 §bằng chứng](03-giai-doan-3-kiem-thu-demo-baocao.md)).
- **Định dạng:** thư mục `docs/assets/evidence/` đặt tên theo E-ID.
- **Test nghiệm thu:** bảng truy vết trong [00](00-tong-quan-va-phan-tich-de-bai.md) không còn ô bằng chứng trống; mỗi dòng đề bài trỏ tới ≥1 E-ID.
- **Hạn:** G7.

---

## Vì sao làm chặt thế này
Trong đồ án sinh viên, thất bại phổ biến nhất **không** phải do khó kỹ thuật, mà do
**tích hợp muộn**: mỗi người làm xong phần mình theo giả định riêng, đến tuần cuối
ghép lại mới phát hiện tên trường lệch nhau, port chưa mở, mapping sai. Các
acceptance test ở trên ép lỗi lộ ra **ngay tại điểm bàn giao**, khi còn thời gian sửa.
Đặc biệt **Bàn giao #3 và #6** loại bỏ hai nguồn rủi ro lớn nhất: C phải chờ B/AWS,
và mapping `geo_point` bị đoán sai.
