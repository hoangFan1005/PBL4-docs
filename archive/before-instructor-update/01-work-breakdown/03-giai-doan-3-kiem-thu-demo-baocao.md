# 03 — Giai đoạn 3: Kiểm thử, Demo & Báo cáo

> Đây là giai đoạn **chứng minh** hệ thống giám sát hoạt động, đúng chuẩn đầu ra của
> đề bài (R5 GeoIP, R7 phát hiện bất thường, R8 máy kiểm tra). Nguyên tắc khoa học:
> một hệ giám sát **báo động mọi thứ là vô dụng** — nên phải có **baseline** (mức
> bình thường) và **negative control** (chạy traffic thường, kỳ vọng 0 báo động).

---

## 1. Tư duy kiểm thử: baseline → tấn công → đối chứng

```
(1) BASELINE       chạy traffic THƯỜNG ≥30–60 phút, ĐO 5 chỉ số  → suy ra ngưỡng rule
(2) TẤN CÔNG       chạy từng kịch bản tấn công, xem rule tương ứng có kích hoạt
(3) NEGATIVE CTRL  chạy lại traffic thường, kỳ vọng 0 báo động (đo số báo động giả)
(4) THU BẰNG CHỨNG chụp/log lại toàn bộ theo E-ID
```

> **Vì sao thứ tự này:** nếu đặt ngưỡng rule trước khi đo baseline, câu hỏi "vì sao
> ngưỡng 100 request/phút?" sẽ không có câu trả lời. Baseline biến "vì sao 100" từ
> điểm yếu thành điểm mạnh khi bảo vệ.

---

## 2. Máy kiểm tra (Tester) & sinh dữ liệu

Máy `[EC2-TESTER]` (đặt ở **region khác** để có IP nước ngoài thật) + máy cá nhân.
Mọi công cụ dưới đây **chỉ nhắm vào hạ tầng của chính nhóm**, có chủ đích kiểm thử
phòng thủ (pentest hợp pháp trên tài sản của mình).

### Traffic thường (baseline & negative control)
- `curl`/script vòng lặp duyệt sản phẩm, đăng nhập đúng, thêm giỏ hàng.
- **k6** hoặc **Locust** để mô phỏng nhiều người dùng thật (kịch bản có tỉ lệ hợp lý).
- **ApacheBench (`ab`)** để tạo tải một URL.

### Traffic tấn công (mỗi loại khớp một rule ở [chương 09](../02-learning/09-phat-hien-bat-thuong.md))
| Kịch bản | Công cụ | Rule kỳ vọng kích hoạt |
|---|---|---|
| Brute-force login | `hydra` / k6 lặp `POST /login.php` sai mật khẩu | Rule 1 (brute force) |
| Credential stuffing | script nhiều IP thử nhiều username | Rule 2 |
| Quét thư mục (404 burst) | `ffuf` / `gobuster` với wordlist nhỏ | Rule 3 |
| Dò SQLi/XSS | `sqlmap` + `curl` payload có sẵn | Rule 4 |
| Scanner user-agent | chính các công cụ trên (UA `sqlmap`, `nikto`…) | Rule 5 |
| Flood request | `ab -n 5000 -c 50` | Rule 6 |
| Truy cập từ nước lạ | TESTER region khác / XFF giả lập có nhãn | Rule 7 (geo) |
| Im lặng ingest | dừng Filebeat 10 phút | Rule 8 (giám sát chính hệ giám sát) |

### Đa dạng IP cho demo GeoIP (chống bẫy "mọi traffic từ 1 IP VN")
Nhiều lớp, từ thật đến giả lập, **luôn ghi nhãn rõ**:
- **L1:** EC2-TESTER ở region xa (vd sa-east-1, eu-central-1) → 1 IP nước ngoài thật, vài cent.
- **L2 (khuyến nghị hôm demo):** bật 3–4 `t3.micro` ở 3–4 region trong 30 phút, curl vào site → nhiều nước thật, vài cent.
- **L3:** **XFF giả lập trung thực** — nginx `set_real_ip_from` chỉ tin IP tester, gửi
  `-H "X-Forwarded-For: <IP công cộng thật của nước X>"`. **Phải ghi nhãn "giả lập"**
  trong cả dashboard lẫn báo cáo, và lưu vào data stream `-synthetic`.
- **Chống chỉ định (cấm mặc định):** replay hàng loạt log công khai rồi ghi đè
  timestamp — trông hoành tráng nhưng **không chứng minh pipeline hoạt động**. Nếu
  dùng, phải để riêng data stream `-synthetic`, không trộn dữ liệu thật.

> Chi tiết cấu hình sinh traffic ở [chương 10](../02-learning/10-kiem-thu-va-demo.md).

---

## 3. Danh mục bằng chứng (E-ID) — hợp đồng nghiệm thu chi tiết

Mỗi artefact lưu vào `docs/assets/evidence/` đặt tên theo E-ID. Cột "tiêu chí" là
điều kiện để coi bằng chứng hợp lệ (không chỉ "có ảnh").

| E-ID | Bằng chứng | Chương sinh ra | Tiêu chí hợp lệ |
|---|---|---|---|
| **E1** | Sơ đồ kiến trúc (CIDR, port, tên SG thật; che IP nhà) | [03](../02-learning/03-cloud-va-aws.md) | mỗi mũi tên có port **và** khớp một luật SG |
| **E2** | Bảng luật SG: proto/port/nguồn/**vì sao** | [03](../02-learning/03-cloud-va-aws.md) | không `0.0.0.0/0` trên 22 & 5601; mỗi luật có lý do |
| **E3** | Log schema (tên ECS, kiểu, nguồn, ví dụ) | [04](../02-learning/04-web-server-va-app.md) | mọi trường mà ingest/GeoIP/Kibana/detection dùng đều có ([CONTRACT](../CONTRACT.md)) |
| **E4** | 1 dòng log JSON thô **và** `_source` cùng sự kiện đó, đặt cạnh nhau | [06](../02-learning/06-thu-thap-va-xu-ly-log.md) | chú thích trường nào do Logstash thêm |
| **E5** | Output `GET /_index_template/...` có `geo_point` | [06](../02-learning/06-thu-thap-va-xu-ly-log.md) | có dấu thời gian **trước** document đầu tiên |
| **E6** | Ảnh Kibana Maps ≥3 nước + bảng top-10 country/count | [07](../02-learning/07-geoip.md)/[08](../02-learning/08-kibana-dashboard.md) | ≥1 IP ngoài VN từ traffic **thật** (không replay) |
| **E7** | "Vì sao vài IP không lên bản đồ" + số đếm `_geoip_lookup_failure` thật | [07](../02-learning/07-geoip.md) | có con số thật |
| **E8** | Dashboard giám sát: req/phút, phân bố status, top URL, top source IP, bản đồ, top UA, **+ panel đếm parse-failure** | [08](../02-learning/08-kibana-dashboard.md) | mỗi panel nêu câu hỏi vận hành nó trả lời |
| **E9** | Bảng baseline (5 chỉ số + khoảng, ≥30 phút) | [10](../02-learning/10-kiem-thu-va-demo.md) | đo **trước** mọi tấn công |
| **E10** | Danh mục rule: id, tên, tín hiệu, query, ngưỡng, cửa sổ, **cơ sở ngưỡng (trỏ E9)**, ánh xạ OWASP 2025, FP đã biết | [09](../02-learning/09-phat-hien-bat-thuong.md) | mỗi rule trỏ ≥1 test case ở E11 |
| **E11** | Bảng thực thi test: id, kịch bản, lệnh chính xác, giờ bắt đầu/kết thúc, rule kỳ vọng, rule thực sự kích hoạt, ảnh, Pass/Fail, ghi chú | [10](../02-learning/10-kiem-thu-va-demo.md) | phủ 100% E10 + ≥2 negative control |
| **E12** | Kết quả negative control: N báo động trong M phút traffic thường | [10](../02-learning/10-kiem-thu-va-demo.md) | nêu rõ N, lý tưởng = 0 |
| **E13** | Độ trễ phát hiện: từ lúc request → lúc báo động, kèm giải thích nguồn trễ | [10](../02-learning/10-kiem-thu-va-demo.md) | số thật; nêu `refresh_interval`, chu kỳ rule, flush Filebeat |
| **E14** | Báo cáo chi phí: Cost Explorer thực tế vs dự toán 2 kịch bản, credit còn lại | [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md) | khớp verification chi phí |
| **E15** | Bằng chứng teardown: 0 instance chạy, 0 EBS thừa, 0 EIP treo | [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md) | sau khi bảo vệ |
| **E16** | Ma trận truy vết: dòng đề bài → E-ID | [00](00-tong-quan-va-phan-tich-de-bai.md) | không ô nào trống |

---

## 4. Kịch bản demo (khoảng 10–12 phút)

1. **Slide 1–2:** đề bài + sơ đồ kiến trúc (E1) + hành trình một request.
2. **Live:** mở shop, đăng nhập đúng → chỉ Kibana Discover thấy request hiện gần thời
   gian thực (R4). Mở **Maps** thấy điểm trên bản đồ (R5, E6).
3. **Live tấn công:** chạy `hydra` brute-force login từ tester → chỉ dashboard req/phút
   vọt lên, status 401 tăng, và **rule brute-force kích hoạt báo động** (R7, E11).
4. **Live geo:** gửi traffic từ region khác / XFF nước lạ → điểm mới sáng trên bản đồ,
   rule geo-anomaly kích hoạt.
5. **Đối chứng:** nhắc lại negative control (E12) — traffic thường không gây báo động.
6. **Đóng:** nối về **OWASP 2025 A09** (logging & alerting), nêu chi phí (E14) & giới hạn.

**Chống rủi ro demo (RK12):** ở cổng G7, **quay sẵn video full demo** + gói ảnh chụp
(E8/E6/E11) làm phương án dự phòng nếu wifi/hạ tầng hôm demo trục trặc. Thêm IP phòng
demo vào SG **hôm trước**.

---

## 5. Cấu trúc báo cáo & slide (outline)

**Báo cáo:**
1. Giới thiệu & phân tích đề bài ([00](00-tong-quan-va-phan-tich-de-bai.md)) + ma trận truy vết (E16).
2. Cơ sở lý thuyết (rút gọn từ [02-learning](../02-learning/00-index.md), trích chỗ "vì sao").
3. Thiết kế hệ thống: kiến trúc (E1), quyết định thiết kế & đánh đổi.
4. Triển khai: các bước chính + cấu hình then chốt (nginx JSON, pipeline, template, rule).
5. GeoIP: cơ chế, cấu hình, kết quả (E6, E7), **giới hạn độ chính xác**.
6. Phát hiện bất thường: danh mục rule (E10) + ánh xạ OWASP 2025.
7. Kiểm thử: baseline (E9), bảng thực thi (E11), negative control (E12), độ trễ (E13).
8. Vận hành & chi phí: báo cáo chi phí (E14), teardown (E15), bảo mật.
9. Kết luận, hạn chế, hướng mở rộng.
10. Phụ lục: cấu hình đầy đủ (dẫn [12](../02-learning/12-phu-luc.md)), nguồn tài liệu.

**Slide:** bám kịch bản demo mục 4; mỗi thành viên trình phần mình + **demo chéo**
(người không dựng thì demo — luật xoay vòng, xem [phân công](04-ma-tran-phan-cong-va-rui-ro.md)).

---

## 6. Chuẩn bị câu hỏi bảo vệ
Mỗi chương học tập có mục **"Câu hỏi bảo vệ"** kèm đáp án mẫu. Trước buổi bảo vệ, cả
nhóm ôn ngân hàng câu hỏi đó (đặc biệt các câu "vì sao thiết kế như vậy / nếu làm
cách khác thì hỏng ở đâu"). Vài câu điển hình:
- Vì sao dùng log JSON thay vì grok? (gợi ý: ký tự `"` trong SQLi làm vỡ grok)
- Vì sao IP `10.0.1.x` không lên bản đồ?
- SG khác NACL ở đâu? Vì sao SG không cần luật outbound cho phản hồi?
- Vì sao ELK cần nhiều RAM hơn web server? JVM heap đặt bao nhiêu và vì sao?
- Làm sao biết hệ thống không "báo động mọi thứ"? (gợi ý: negative control E12)
- Rule geo-anomaly liên kết GeoIP với phát hiện bất thường thế nào?

---

## 7. Definition of Done — GĐ3
- [ ] E9–E13 đầy đủ; E11 phủ 100% rule trong E10; ≥2 negative control.
- [ ] E6/E7 từ dữ liệu **thật**; dữ liệu giả lập tách riêng `-synthetic`.
- [ ] Video demo + gói ảnh dự phòng (G7).
- [ ] Báo cáo + slide xong; ma trận truy vết E16 không ô trống.
- [ ] Teardown (E15) sau bảo vệ; báo cáo chi phí E14 khớp credit còn lại.
