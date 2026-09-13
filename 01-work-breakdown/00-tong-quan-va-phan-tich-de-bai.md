# 00 — Tổng quan & Phân tích đề bài (Đề tài 515)

> **Tài liệu này dành cho ai:** cả 3 thành viên đọc đầu tiên, trước khi làm bất cứ
> việc gì. Nó biến đề bài "chung chung" thành danh sách **yêu cầu đo được** và bản
> đồ "yêu cầu → bằng chứng nộp → ai làm → học chương nào".

---

## 1. Đề bài nói gì (nguyên văn rút gọn)

**Đề tài 515 — Tìm hiểu về AWS Cloud, xây dựng hạ tầng cơ bản để dựng một website
và hệ thống giám sát luồng truy cập thông qua ELK.**

Bối cảnh giả định: một công ty triển khai website thương mại điện tử (e-commerce)
trên AWS và cần một hệ thống giám sát (monitoring) luồng truy cập qua ELK. Công ty
yêu cầu nhóm:

- Tìm hiểu hệ điều hành **Linux** và dựng website trên đó.
- Tìm hiểu **AWS Cloud, ELK, GeoIP** — hiểu cơ chế vận hành khi triển khai trên cloud.
- **Triển khai website** thương mại điện tử trên AWS thông qua **EC2 Instance**.
- **Xây dựng hệ thống giám sát** luồng truy cập qua ELK.

**Đầu vào (Input):**
1. Máy chủ Web chứa website của công ty, cấu hình được qua EC2 instance, **có giao
   diện đăng nhập** (login).
2. **Access log** của website được **gửi về hệ thống ELK** để xây dựng hệ thống giám sát.
3. **Máy kiểm tra** hệ thống giám sát.

**Đầu ra (Output):**
1. Phân tích **IP nguồn theo GeoIP** (biết truy cập đến từ quốc gia/thành phố nào).
2. Hệ thống giám sát được **các luồng truy cập** và **phân tích được hành vi bất
   thường** (anomaly) của website.

**Lưu ý của đề:** dùng AWS Cloud; nếu nhóm thành thạo hạ tầng cloud khác vẫn được
chấp nhận. → Nhóm **chọn AWS** (đúng trọng tâm đề tài, và nhóm có credit $200).

---

## 2. "Dịch" đề bài sang ngôn ngữ kỹ thuật

Đề bài viết theo giọng "công ty đặt hàng", nên mơ hồ. Dưới đây là cách nhóm hiểu
từng cụm từ và **quyết định cụ thể** tương ứng (lý do đầy đủ nằm trong tài liệu học tập).

| Cụm từ trong đề | Nhóm hiểu là | Quyết định cụ thể của nhóm |
|---|---|---|
| "hạ tầng cơ bản trên AWS" | Mạng ảo + máy chủ ảo tối thiểu để chạy được hệ thống | 1 VPC, 1 public subnet, 2 EC2 (Web + ELK) → xem [chương 03](../02-learning/03-cloud-va-aws.md) |
| "website thương mại điện tử có giao diện đăng nhập" | Web có trang login thật, có luồng truy cập giống shop thật | **App PHP + MySQL tự viết** trên LEMP (nginx + PHP-FPM + MariaDB) → [chương 04](../02-learning/04-web-server-va-app.md) |
| "triển khai qua EC2 instance" | Chạy trên máy chủ ảo EC2, cấu hình từ xa | Ubuntu Server 24.04 LTS, truy cập bằng SSH key → [chương 02](../02-learning/02-linux-co-ban.md), [03](../02-learning/03-cloud-va-aws.md) |
| "access log gửi về ELK" | Log truy cập web được thu thập tập trung | nginx ghi **log JSON** → Filebeat → Logstash → Elasticsearch → [chương 06](../02-learning/06-thu-thap-va-xu-ly-log.md) |
| "phân tích IP nguồn theo GeoIP" | Ánh xạ IP → quốc gia/thành phố, hiện lên bản đồ | `geoip` + `geo_point` + Kibana **Maps** → [chương 07](../02-learning/07-geoip.md), [08](../02-learning/08-kibana-dashboard.md) |
| "giám sát luồng truy cập" | Dashboard xem lưu lượng theo thời gian, URL, mã trạng thái, quốc gia | Kibana dashboard (Discover/Lens/Maps) → [chương 08](../02-learning/08-kibana-dashboard.md) |
| "phân tích hành vi bất thường" | Phát hiện tấn công: brute-force login, quét thư mục, flood, scanner | **Rule-based detection** + alerting (license Basic) → [chương 09](../02-learning/09-phat-hien-bat-thuong.md) |
| "máy kiểm tra hệ thống giám sát" | Máy thứ 3 sinh traffic thường + tấn công mô phỏng để chứng minh | "Tester machine": k6/curl (traffic thường) + hydra/nikto/ffuf (tấn công) → [chương 10](../02-learning/10-kiem-thu-va-demo.md) |

> **Điểm mấu chốt cần nói khi bảo vệ:** đề bài trích dẫn đúng vấn đề của **OWASP
> Top 10 (2025) — A09: Security Logging and Alerting Failures**. Cả đồ án này chính
> là lời giải cho hạng mục đó: không chỉ *ghi* log mà *tập trung, làm giàu, trực
> quan hoá và cảnh báo* trên log. Nêu được điều này cho thấy nhóm hiểu "tại sao"
> chứ không chỉ "làm gì".

---

## 3. Bảng truy vết yêu cầu (Requirement Traceability Matrix)

Đây là **hợp đồng nghiệm thu** của nhóm. Mỗi dòng là một yêu cầu trong đề; cột
"Bằng chứng nộp được" là thứ phải xuất hiện trong báo cáo/demo để chứng minh đã
đạt. Không dòng nào được để trống cột bằng chứng.

| # | Yêu cầu trong đề | Bằng chứng nộp được (artefact) | Người chịu trách nhiệm | Học ở chương |
|---|---|---|---|---|
| R1 | Hiểu Linux & dựng web trên Linux | Website chạy trên Ubuntu EC2; giải thích được các lệnh/quyền/service đã dùng | B | 02, 04 |
| R2 | Hiểu & triển khai AWS (EC2, mạng) | Sơ đồ kiến trúc AWS + ảnh chụp VPC/Subnet/SG/EC2 đang chạy | A | 03 |
| R3 | Website e-commerce có giao diện đăng nhập | Screenshot trang login + trang sản phẩm; code app PHP trong repo | B | 04 |
| R4 | Access log gửi về ELK (cấu hình được) | Ảnh Discover trong Kibana hiển thị log của web đúng thời gian thực | B (nguồn log) + C (ingest) | 06 |
| R5 | Phân tích IP nguồn theo GeoIP | Bản đồ Kibana Maps + bảng "Top countries" từ log thật | C | 07, 08 |
| R6 | Giám sát luồng truy cập | Dashboard: requests/phút, top URL, phân bố status code, top IP | C | 08 |
| R7 | Phát hiện hành vi bất thường | Bảng "rule → tín hiệu" + ảnh alert kích hoạt khi chạy tấn công mô phỏng | C (rule) + tester | 09, 10 |
| R8 | Máy kiểm tra hệ thống giám sát | Test plan + bảng kết quả (traffic thường vs tấn công) + log thực thi | Cả nhóm | 10 |
| R9 | Hiểu cơ chế vận hành trên cloud | Mục "Tại sao thiết kế như vậy" trong mỗi chương + phần Q&A bảo vệ | Cả nhóm | tất cả |

---

## 4. Ranh giới phạm vi (để không làm thừa / làm thiếu)

**Trong phạm vi (phải làm):**
- Dựng đủ hạ tầng để **1 request từ trình duyệt → hiện trên bản đồ Kibana**.
- Ít nhất **4 loại phát hiện bất thường** hoạt động được và chứng minh bằng tester
  (đề xuất: brute-force login, quét 404, request-rate spike, scanner user-agent).
- Kiểm soát chi phí trong ngân sách **$200 credit**.

**Ngoài phạm vi (cố ý không làm — nêu rõ khi bảo vệ nếu bị hỏi):**
- Không dùng ML anomaly detection của Elastic (tính năng trả phí — xem [chương 09](../02-learning/09-phat-hien-bat-thuong.md)); nhóm dùng **rule-based** trên license Basic miễn phí.
- Không dựng High Availability / Auto Scaling / Load Balancer nhiều node (vượt "hạ tầng cơ bản" và tốn credit).
- Không tự thu thập dữ liệu người dùng thật; mọi IP "nước ngoài" trong demo là **giả lập có kiểm soát** (xem [chương 10](../02-learning/10-kiem-thu-va-demo.md)).
- Không làm thanh toán thật (payment gateway) — shop chỉ cần luồng duyệt sản phẩm + giỏ hàng + login.

---

## 5. Bản đồ 3 giai đoạn (chi tiết ở các file kế tiếp)

| Giai đoạn | Mục tiêu | File |
|---|---|---|
| **GĐ1 — Khoanh vùng & học kiến thức** | Chọn công nghệ, liệt kê kiến thức cần, gom nguồn tài liệu (ưu tiên tiếng Anh) | [01-giai-doan-1-kien-thuc.md](01-giai-doan-1-kien-thuc.md) |
| **GĐ2 — Triển khai** | Timeline theo tuần + hướng dẫn từng bước dựng toàn hệ thống | [02-giai-doan-2-trien-khai.md](02-giai-doan-2-trien-khai.md) |
| **GĐ3 — Kiểm thử, demo, báo cáo** | Sinh traffic thường/bất thường, chứng minh giám sát, viết báo cáo & slide | [03-giai-doan-3-kiem-thu-demo-baocao.md](03-giai-doan-3-kiem-thu-demo-baocao.md) |
| **Phân công & rủi ro** | Ma trận RACI, đường găng (critical path), rủi ro + phương án dự phòng | [04-ma-tran-phan-cong-va-rui-ro.md](04-ma-tran-phan-cong-va-rui-ro.md) |

Kiến thức nền cho tất cả các giai đoạn nằm ở thư mục [`../02-learning/`](../02-learning/00-index.md).

---

## 6. Cách đọc bộ tài liệu này

1. Cả nhóm đọc file này (00) + [chương 01 — Nền tảng mạng](../02-learning/01-nen-tang-mang.md). Đây là kiến thức **bắt buộc chung**.
2. Mỗi người đọc sâu các chương thuộc vai của mình (xem [ma trận phân công](04-ma-tran-phan-cong-va-rui-ro.md)).
3. Khi làm, bám theo [GĐ2 — Triển khai](02-giai-doan-2-trien-khai.md); gặp khái niệm lạ thì tra chương học tập tương ứng (mỗi bước đều có link).
4. Thuật ngữ tiếng Anh chưa hiểu → tra [Phụ lục 12 — Glossary VI-EN](../02-learning/12-phu-luc.md).
