# 00 — Index: Lộ trình học & bản đồ "kiến thức → công việc"

> Chương này là **mục lục có định hướng** của tài liệu học tập: học gì trước, mỗi
> chương phục vụ task nào, và ai cần đọc chương nào.

## Khung chuẩn của mỗi chương

Mọi chương trong thư mục này theo cùng một khung (để dễ đọc và dễ kiểm tra không sót bước):

1. **Mục tiêu chương** — học xong làm được gì.
2. **Cần biết gì trước** — link tới chương tiên quyết.
3. **Kiến thức nền** — giải thích từ số 0, kèm analogy với PHP/MySQL/đời thường.
4. **Thiết kế & cấu hình cụ thể** — lệnh/config copy-paste được, có nhãn máy chạy.
5. **Tại sao thiết kế như vậy** — biện minh + "nếu làm cách khác thì hỏng ở đâu".
6. **Cách tự kiểm tra đã đúng** — lệnh/thao tác xác nhận.
7. **Lỗi thường gặp**.
8. **References** (ưu tiên tiếng Anh, tài liệu chính thức).

Nhãn máy trong mọi khối lệnh: `[EC2-WEB]` · `[EC2-ELK]` · `[EC2-TESTER]` · `[máy cá nhân]` · `[Kibana UI]` (đồng bộ với [CONTRACT §5](../CONTRACT.md)).

## Thứ tự học đề xuất (theo tầng phụ thuộc)

```
01 Mạng ──► 02 Linux ──► 03 Cloud/AWS ──► 04 Web & app
                                              │
                                              ▼
   05 ELK kiến trúc ──► 06 Thu thập/xử lý log ──► 07 GeoIP ──► 08 Kibana
                                              │
                                              ▼
                                  09 Phát hiện bất thường
                                              │
                                              ▼
                    10 Kiểm thử & demo ──► 11 Bảo mật/vận hành/chi phí ──► 12 Phụ lục
```

Lý do thứ tự này: mỗi mũi tên là một quan hệ "cần cái trước mới hiểu cái sau". Bạn
không thể hiểu Security Group (03) nếu chưa nắm port + stateful firewall (01);
không dựng được ingest pipeline (06) nếu chưa biết ES là gì (05); không làm bản đồ
(07/08) nếu log chưa chảy (06).

## Bảng ánh xạ: chương → yêu cầu đề bài → ai đọc

| Chương | Phục vụ yêu cầu (xem [bảng truy vết](../01-work-breakdown/00-tong-quan-va-phan-tich-de-bai.md#3-bảng-truy-vết-yêu-cầu-requirement-traceability-matrix)) | Người đọc chính |
|---|---|---|
| [01 Mạng](01-nen-tang-mang.md) | Nền cho tất cả | **cả nhóm** |
| [02 Linux](02-linux-co-ban.md) | R1 | B (+ cả nhóm) |
| [03 Cloud/AWS](03-cloud-va-aws.md) | R2 | A |
| [04 Web & app](04-web-server-va-app.md) | R1, R3, R4 (nguồn log) | B |
| [05 ELK kiến trúc](05-elk-kien-truc.md) | R4, R6 | C |
| [06 Thu thập/xử lý log](06-thu-thap-va-xu-ly-log.md) | R4 | C |
| [07 GeoIP](07-geoip.md) | R5 | C |
| [08 Kibana](08-kibana-dashboard.md) | R5, R6 | C |
| [09 Phát hiện bất thường](09-phat-hien-bat-thuong.md) | R7 | C |
| [10 Kiểm thử & demo](10-kiem-thu-va-demo.md) | R7, R8 | cả nhóm (C dẫn) |
| [11 Bảo mật/vận hành/chi phí](11-bao-mat-van-hanh-chi-phi.md) | R2, ngân sách | A (+ cả nhóm) |
| [12 Phụ lục](12-phu-luc.md) | R9 (tra cứu) | cả nhóm |

## Lời khuyên học cho người mới
- **Đừng học thuộc — hãy làm rồi tra.** Đọc mục tiêu + kiến thức nền của một chương,
  rồi nhảy sang [Giai đoạn 2](../01-work-breakdown/02-giai-doan-2-trien-khai.md) làm
  theo bước; khi vướng thuật ngữ, quay lại chương đó đọc kỹ.
- **Vẽ lại sơ đồ hành trình request** ([chương 01 mục 9](01-nen-tang-mang.md#9-ghép-tất-cả-hành-trình-một-request-trong-đồ-án)) bằng trí nhớ. Vẽ được = hiểu hệ thống.
- **Mỗi khi gõ một lệnh "lạ", tự hỏi 3 câu:** lệnh này chạy trên máy nào? nó đổi
  file/dịch vụ nào? làm sao biết nó chạy đúng? Ba câu này chính là mục 6 của mỗi chương.
