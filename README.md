# Đồ án 515 — Website trên AWS + Hệ thống giám sát ELK/GeoIP

Bộ tài liệu cho đồ án nhóm 3 người: dựng **hạ tầng AWS cơ bản** để chạy một
**website thương mại điện tử** (PHP + MySQL) và một **hệ thống giám sát luồng truy
cập** bằng **ELK Stack**, làm giàu IP nguồn bằng **GeoIP**, và **phát hiện hành vi
bất thường**.

> Đối tượng đọc: sinh viên IT, kiến thức **mạng ở mức nhập môn**, **chưa học điện
> toán đám mây / AWS**. Mọi chương giải thích từ số 0. Thuật ngữ giữ tiếng Anh kèm
> giải thích; nguồn tham khảo ưu tiên tiếng Anh (tài liệu chính thức).

---

## Đọc theo thứ tự nào

**Bước 1 — Cả nhóm đọc chung (bắt buộc):**
1. [01-work-breakdown/00 — Tổng quan & Phân tích đề bài](01-work-breakdown/00-tong-quan-va-phan-tich-de-bai.md)
2. [02-learning/01 — Nền tảng mạng](02-learning/01-nen-tang-mang.md)
3. [02-learning/00 — Lộ trình học (index)](02-learning/00-index.md)

**Bước 2 — Đọc theo vai** (xem [ma trận phân công](01-work-breakdown/04-ma-tran-phan-cong-va-rui-ro.md)):
- **A — Cloud/Infra/Transport/Cost:** chương 03, 11 (+ nửa transport ch06)
- **B — Linux/Web/Detection:** chương 02, 04, **09**
- **C — Monitoring/ELK/Data:** chương 05, 06, 07, 08

(Phân công đã tái cân bằng — detection về B, transport về A. Chi tiết + lý do ở [ma trận phân công](01-work-breakdown/04-ma-tran-phan-cong-va-rui-ro.md).)

**Bước 3 — Khi bắt tay làm:** bám [Giai đoạn 2 — Triển khai](01-work-breakdown/02-giai-doan-2-trien-khai.md), gặp khái niệm lạ thì mở chương học tập tương ứng (mỗi bước có link).

---

## Bản đồ tài liệu

```
docs/
├── README.md  ← bạn đang ở đây
├── 01-work-breakdown/     (chia việc + kế hoạch + timeline)
│   ├── 00 Tổng quan & phân tích đề bài
│   ├── 01 Giai đoạn 1 — Khoanh vùng & học kiến thức (+ nguồn tài liệu)
│   ├── 02 Giai đoạn 2 — Triển khai (timeline + hướng dẫn từng bước)
│   ├── 03 Giai đoạn 3 — Kiểm thử, demo, báo cáo
│   ├── 04 Ma trận phân công & rủi ro (RACI, đường găng, dự phòng)
│   └── 05 Hợp đồng bàn giao (hand-off + acceptance test)
└── 02-learning/           (kiến thức nền + thiết kế + cấu hình + "tại sao")
    ├── 00 Index — lộ trình học
    ├── 01 Nền tảng mạng
    ├── 02 Linux cơ bản
    ├── 03 Cloud & AWS
    ├── 04 Web server & app PHP
    ├── 05 ELK — kiến trúc
    ├── 06 Thu thập & xử lý log (Filebeat, Logstash, ILM)
    ├── 07 GeoIP
    ├── 08 Kibana dashboard & Maps
    ├── 09 Phát hiện hành vi bất thường
    ├── 10 Kiểm thử & demo
    ├── 11 Bảo mật, vận hành, chi phí
    └── 12 Phụ lục (glossary VI-EN, config đầy đủ, FAQ lỗi)
```

---

## Kiến trúc tổng thể (tóm tắt)

```
Internet ─► [EC2-WEB]  nginx + PHP-FPM + MariaDB + shop app (PHP)
                │  ghi access log JSON → Filebeat ─(private IP :5044)─►
                ▼
            [EC2-ELK]  Logstash (json→geoip→useragent) ─► Elasticsearch ─► Kibana
                                                          (Discover / Lens / Maps)
[EC2-TESTER / máy cá nhân] ─► sinh traffic thường + tấn công mô phỏng để kiểm thử giám sát
```

Ba quyết định thiết kế chính và lý do nằm trong [Giai đoạn 1](01-work-breakdown/01-giai-doan-1-kien-thuc.md#lua-chon-cong-nghe) và được giải thích sâu ở từng chương.

---

## Sự thật kỹ thuật đã kiểm chứng

> Mục này chốt các con số/phiên bản/giá để cả nhóm dùng thống nhất, tránh chép nhầm
> từ blog cũ. Mỗi mục kèm nguồn (tra cứu 2026-09-08). Chi tiết ở [CONTRACT.md](CONTRACT.md).

- **OS:** Ubuntu Server 24.04 LTS (hỗ trợ tới 2029) — https://ubuntu.com/about/release-cycle
- **Elastic Stack:** pin **9.5.3** cả stack (ES/Kibana/Logstash/Filebeat). Filebeat 9.x dùng `type: filestream` (bỏ `type: log`); security bật mặc định từ 8.0 — https://www.elastic.co/subscriptions
- **License Basic (miễn phí) đủ dùng:** Index-threshold + Elasticsearch-query alerting, Kibana Maps, Security prebuilt rules (không ML), transforms, ES|QL. **Trả phí:** ML anomaly jobs, Watcher, connector email/Slack → phát hiện dùng **rule-based**.
- **Logstash `ecs_compatibility=v8` mặc định** → `geoip{source=>"[source][ip]"}` ghi ra `source.geo.location` (geo_point).
- **GeoIP:** MaxMind GeoLite2 (cần license key miễn phí) hoặc downloader `geoip.elastic.co`. Chính xác cấp quốc gia ~99.8%, cấp thành phố thấp hơn nhiều.
- **AWS Free Plan 2026:** ~**$200 credit**, dùng trong **6 tháng** hoặc tới khi hết (cái nào trước). Ưu đãi cũ 750h t3.micro **không áp dụng** account mới. **t4g.small free 750h/tháng tới 31/12/2026**.
- **Giá EC2 Singapore (ap-southeast-1):** t3.small $0.0264/h ($19.3/mo), t3.medium $0.0528/h ($38.5/mo). gp3 $0.096/GB-tháng. Public IPv4 $0.005/IP/h. **NAT Gateway ~$43/mo → né bằng public subnet.**
- **Chi phí đồ án:** 2 máy 24/7 ≈ $71/tháng (~2.8 tháng credit); bật theo phiên (~60h/tháng) ≈ $11/tháng. Xem [11](02-learning/11-bao-mat-van-hanh-chi-phi.md).
- **OWASP Top 10 hiện hành:** bản **2025**, hạng mục **A09 Security Logging and Alerting Failures** — https://owasp.org/Top10/2025/

---

## Ghi chú cho người chấm / giảng viên
- Mọi con số chi phí quy về ngân sách **$200 credit** (tài khoản AWS mới) — chi tiết ở [chương 11](02-learning/11-bao-mat-van-hanh-chi-phi.md).
- Các IP "nước ngoài" trong demo GeoIP là **giả lập có kiểm soát trong lab của nhóm** (X-Forwarded-For / log mẫu), không phải người dùng thật — nêu rõ trong [chương 10](02-learning/10-kiem-thu-va-demo.md).
- Công cụ tấn công (hydra/nikto/ffuf...) chỉ chạy **nhắm vào chính hạ tầng của nhóm**, có chủ đích kiểm thử phòng thủ.
