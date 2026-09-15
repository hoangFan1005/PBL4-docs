# 04 — Ma trận phân công, đường găng & rủi ro

> Trả lời 4 câu: **ai làm gì**, **thứ tự phụ thuộc** (cái gì chặn cái gì), **làm gì
> khi bị chặn**, và **rủi ro nào dễ giết đồ án + cách chặn trước**.

---

## 1. Phân công 3 vai (đã tái cân bằng)

Nguyên tắc cân bằng: chương giám sát (ELK/GeoIP/detection) là **phần được chấm nặng
nhất và mới lạ nhất** với cả nhóm, nên không dồn hết cho một người. Việc **phát hiện
bất thường** giao cho B (vì B viết app + trang login + script tấn công, hiểu rõ ngữ
nghĩa sự kiện đăng nhập), còn **đường truyền log** (SG cổng 5044/9200/5601, phân
phối chứng chỉ CA, kết nối Filebeat→Logstash) giao cho A (vì đó là việc mạng, và
giúp A không "ngồi chơi" sau khi dựng xong hạ tầng).

| Vai | Sở hữu chính | Chương học tập phụ trách |
|---|---|---|
| **A — Cloud / Hạ tầng / Đường truyền / Chi phí** | Tài khoản AWS, MFA/IAM, **Budget & cảnh báo chi phí**, VPC/Subnet/Route/IGW/SG/EIP, tạo & snapshot 3 EC2, **đường truyền log** (mở port giữa 2 máy, phân phối CA, thông Filebeat→Logstash), teardown, báo cáo chi phí | [03](../02-learning/03-cloud-va-aws.md), [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md), đồng sở hữu [06](../02-learning/06-thu-thap-va-xu-ly-log.md) (nửa transport) |
| **B — Linux / Web / Phát hiện** | Ubuntu, LEMP, **app PHP shop + trang login**, nginx JSON log, **log schema**, threat model, script sinh traffic + tấn công, **rule phát hiện bất thường** | [02](../02-learning/02-linux-co-ban.md), [04](../02-learning/04-web-server-va-app.md), [09](../02-learning/09-phat-hien-bat-thuong.md), đồng sở hữu [10](../02-learning/10-kiem-thu-va-demo.md) |
| **C — ELK / Dữ liệu** | Elasticsearch/Kibana/Logstash, **mapping & index template**, ILM, **geoip enrichment**, dashboard & Maps | [05](../02-learning/05-elk-kien-truc.md), [06](../02-learning/06-thu-thap-va-xu-ly-log.md) (nửa parse/enrich), [07](../02-learning/07-geoip.md), [08](../02-learning/08-kibana-dashboard.md), đồng sở hữu [10](../02-learning/10-kiem-thu-va-demo.md) |
| **Chung** | [01 Mạng](../02-learning/01-nen-tang-mang.md), [00 phân tích đề](00-tong-quan-va-phan-tich-de-bai.md), [12 phụ lục](../02-learning/12-phu-luc.md), báo cáo & slide, demo | — |

> **Chống rủi ro "mỗi người là điểm mù của phần mình":** khi bảo vệ thường chấm cá
> nhân. Áp dụng **luật xoay vòng demo** — *người KHÔNG dựng thành phần đó sẽ là người
> demo nó*. Ép mỗi thành viên hiểu chéo ít nhất phần kề mình. Chi phí bằng 0, lợi ích lớn.

### RACI rút gọn (R=làm, A=chịu trách nhiệm cuối, C=hỏi ý, I=được báo)

| Hạng mục | A | B | C |
|---|---|---|---|
| Hạ tầng AWS (VPC/EC2/SG) | **R/A** | I | C |
| Kiểm soát chi phí | **R/A** | I | I |
| Website + login | C | **R/A** | I |
| nginx JSON log | C | **R/A** | C |
| Đường truyền Filebeat→Logstash | **R** | C | **A** |
| Cài & vận hành ES/Kibana/Logstash | I | I | **R/A** |
| GeoIP + dashboard + Maps | I | C | **R/A** |
| Rule phát hiện bất thường | I | **R/A** | C |
| Kiểm thử (baseline + tấn công) | C | **R** | **R/A** |
| Báo cáo & bảo vệ | **R** | **R** | **R** |

---

## 2. Đường găng (critical path)

Mỗi task ghi rõ **phụ thuộc** và **ước lượng ngày-người**. `d` = ngày làm việc.

| Task | Chủ | Phụ thuộc | Ước lượng |
|---|---|---|---|
| T1 Tài khoản, MFA, IAM user, **Budget alarm** | A | — | 0.5d |
| T2 Key pair + "Hello EC2" (VPC mặc định) | A | T1 | 0.5d |
| T3 VPC, subnet, IGW, route table, ma trận SG | A | T2 | 1d |
| T4 Tạo EC2 WEB + ELK (+ TESTER khác region) | A | T3 | 0.5d — **chặn cả B và C** |
| T5 Cài LEMP trên EC2-WEB | B | T4 | 1d |
| T6 **App shop + schema + login (dựng LOCAL trước)** | B | — | 3d — **không phụ thuộc AWS** |
| T7 nginx JSON `log_format` + app auth log | B | T5, log schema | 0.5d |
| T8 **Cài ES + Kibana (heap, TLS, auth, bootstrap checks)** | C (cặp đôi) | T4 | 1–2d — **rủi ro cao nhất** |
| T9 Index template + ILM + `geo_point` | C | T8 | 0.5d |
| T10 **Logstash pipeline (dựng OFFLINE với file log mẫu)** | C | log schema | 1.5d — **không phụ thuộc AWS** |
| T11 Filebeat WEB → Logstash (SG, CA, cred) | A + C | T7, T9, T10 | 0.5d |
| T12 Data view + dashboard | C | T11 + có traffic | 1.5d |
| T13 Rule phát hiện | B + C | T12 + baseline | 1.5d |
| T14 Script sinh traffic + tấn công trên TESTER | B | T6 (local), T4 | 1d |
| T15 Chạy baseline → tấn công → thu bằng chứng | cả nhóm | T13, T14 | 1.5d |
| T16 Báo cáo chi phí, AMI, teardown | A | T15 | 0.5d |
| T17 Báo cáo, slide, dry-run, bảo vệ | cả nhóm | T15 | 3d |

**Đường găng:** `T1 → T2 → T4 → T8 → T9 → T10 → T11 → T12 → T13 → T15 → T17`.
Gần như toàn bộ sau T4 nằm ở nhánh C — vì vậy **T8 (dựng ES) là điểm dài & rủi ro
nhất**, phải làm sớm và làm cặp đôi.

```
T1─T2─T4─┬─(B) T5─T7 ─────────────┐
         │                        ├─ T11 ─ T12 ─ T13 ─ T15 ─ T17
         ├─(C) T8─T9 ─────────────┤
         │        T10 (offline)───┘
         └─(B) T6 (offline) ─ T14 ─────────┘
```

### Nguyên tắc "offline-first" — giảm rủi ro lớn nhất
Mọi thứ **học và dựng ngoài AWS trước khi cần AWS**:
- **B** dựng toàn bộ app shop trên LEMP/Docker máy cá nhân trước khi có T4.
- **C** chạy **cả ELK bằng Docker trên máy cá nhân** để học Discover/Lens/Maps/mapping,
  và phát triển Logstash pipeline với **một file log mẫu** (`input { file }` +
  `stdout { codec => rubydebug }`, kiểm cú pháp bằng `logstash --config.test_and_exit`).
- **A** phác ma trận SG và mô hình chi phí trên giấy.

→ Tách T8 và T10 khỏi chuỗi chặn, biến phần học rủi ro nhất thành **học miễn phí**,
và bảo vệ credit $200.

---

## 3. Cổng kiểm soát theo tuần (mặc định 8 tuần lõi)

Timeline dùng đơn vị **Tuần 1…N** (nhóm tự ánh xạ lịch thật). Mỗi cổng có **tiêu
chí ra** rõ ràng — không đạt thì cắt phạm vi, đừng trôi.

| Cổng | Cuối tuần | Tiêu chí ra |
|---|---|---|
| G1 | T1 | Budget alarm sống; cả 3 đã SSH vào 1 instance; thấy chi phí trong Cost Explorer |
| G2 | T2 | App shop chạy local; ELK chạy local (Docker); thiết kế VPC review trên giấy; **bàn giao #3 (log mẫu) được chấp nhận** |
| G3 | T3 | VPC thật + 3 EC2; web truy cập được bằng public IP; bắt được 1 dòng JSON log thật |
| **G4** | **T4** | **Dòng log đầu tiên hiện trong Kibana Discover.** Nếu trễ → cắt: bỏ Logstash, dùng Filebeat→ES + ingest pipeline |
| G5 | T5 | Bản đồ hiện ≥3 quốc gia; dashboard v1 đủ 6+1 panel (6 giám sát + 1 parse-failure) |
| G6 | T6 | Đo xong baseline; mọi rule kích hoạt khi chạy tấn công; bảng kết quả điền đủ |
| G7 | T7 | **Dry-run demo xong**; gói bằng chứng đầy đủ; báo cáo chi phí xong |
| G8 | T8 | Báo cáo, slide, bằng chứng teardown, bảo vệ |

> **Tuần cuối GĐ2 = tuần "đóng băng & tích hợp".** Không thêm tính năng mới; chỉ vá
> lỗi và hoàn thiện bằng chứng. Lên lịch **dry-run demo (G7) trước buổi thật ≥5 ngày**.

---

## 4. Làm gì khi bị chặn (chống "ngồi chờ")

| Đang bị chặn | Làm việc này thay thế |
|---|---|
| **A** (sau T4, chờ) | bảng theo dõi chi phí, runbook bật/tắt phiên, checklist teardown, ma trận SG kèm cột "vì sao" từng luật, chương mạng & vận hành, runbook "thang kiểm tra kết nối" |
| **B** (trước T4) | dựng toàn bộ app shop local, schema DB + dữ liệu mẫu, script sinh traffic + tấn công nhắm `localhost`, **đề xuất log schema (`CONTRACT.md`)**, threat model |
| **C** (trước T4) | dựng ELK local bằng Docker, học Discover/Lens/Maps, **phát triển Logstash pipeline với file log mẫu**, viết chương kiến trúc ELK, dựng & test index template ở local |

---

## 5. Rủi ro & phương án chặn trước

Bảng rủi ro — mỗi dòng: dấu hiệu → hậu quả → chặn trước ở đâu.

| # | Rủi ro | Hậu quả | Chặn trước (chương) |
|---|---|---|---|
| RK1 | **Đốt credit** vì để máy chạy 24/7 / lỡ tạo NAT Gateway qua wizard | Hết $200, dừng đồ án | Budget alarm ngày 1 + tự tính burn-rate + tắt máy theo phiên ([03](../02-learning/03-cloud-va-aws.md), [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md)) |
| RK2 | **ES không khởi động** (heap / `vm.max_map_count` / RAM thiếu) | Tắc T8, cả nhánh giám sát đứng | Pre-flight check + bảng spec tối thiểu trước khi cài ([05](../02-learning/05-elk-kien-truc.md)) |
| RK3 | **Tự khoá mình** khỏi SSH (SG/ufw sai) | Mất quyền vào server | Luật "2 phiên SSH" + playbook khôi phục (Instance Connect/Serial) ([02](../02-learning/02-linux-co-ban.md), [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md)) |
| RK4 | **Bản đồ GeoIP trống** vì mọi traffic từ 1 IP Việt Nam / IP private | Không đạt đầu ra R5 | Kế hoạch đa dạng IP nhiều lớp (TESTER khác region + XFF giả lập có nhãn) ([07](../02-learning/07-geoip.md), [10](../02-learning/10-kiem-thu-va-demo.md)) |
| RK5 | **Dashboard trống** vì parse JSON lỗi / sai time range / sai timezone | Tưởng hỏng cả hệ thống | Dev pipeline offline + panel đếm parse-failure + "thang 5 điểm kiểm luồng" ([06](../02-learning/06-thu-thap-va-xu-ly-log.md)) |
| RK6 | **nginx log IP proxy thay vì khách** | GeoIP định vị nhầm | `$remote_addr` vs XFF + `set_real_ip_from` có giới hạn ([04](../02-learning/04-web-server-va-app.md)) |
| RK7 | **Instance stop → đổi public IP** | SSH/Filebeat/URL hỏng sau mỗi phiên | Tham chiếu nội bộ dùng private IP/`/etc/hosts`; 1 Elastic IP cho WEB ([03](../02-learning/03-cloud-va-aws.md)) |
| RK8 | **Đĩa đầy → ES chuyển index read-only** | Log ngừng vào giữa tuần test | Volume ≥30GB cho ELK + ILM xoá sau 14 ngày + `df -h` trong checklist ([06](../02-learning/06-thu-thap-va-xu-ly-log.md), [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md)) |
| RK9 | **fail2ban chặn IP tester** giữa lúc demo tấn công | Traffic tấn công tắt, dashboard không thấy gì | KHÔNG cài fail2ban sớm; whitelist tester; demo ban CÓ CHỦ ĐÍCH sau khi thu bằng chứng ([09](../02-learning/09-phat-hien-bat-thuong.md), [10](../02-learning/10-kiem-thu-va-demo.md)) |
| RK10 | **Endpoint cố ý dễ tấn công bị lộ ra Internet** | EC2 bị chiếm, đào coin, hoá đơn AWS | Chỉ mở endpoint test cho IP tester; không dữ liệu thật; IAM tối thiểu ([11](../02-learning/11-bao-mat-van-hanh-chi-phi.md)) |
| RK11 | **Elastic 8/9 TLS + auth** chặn kết nối Filebeat/Kibana | Tắc T8/T11, lỗi khó hiểu | Dạy security-by-default: enrollment token, CA, reset-password ([05](../02-learning/05-elk-kien-truc.md)) |
| RK12 | **Hạ tầng hỏng đúng hôm demo** (wifi lớp, SG cũ, phiên hết hạn) | Mất điểm demo dù hệ thống đúng | Quay video demo + gói ảnh chụp dự phòng ở G7; thêm IP phòng demo vào SG hôm trước ([10](../02-learning/10-kiem-thu-va-demo.md)) |
| RK13 | **Máy cá nhân chạy Windows** không có `chmod` | Kẹt ngay bước SSH đầu tiên | Nêu giả định OS + đường WSL/Git Bash + `icacls` ([02](../02-learning/02-linux-co-ban.md)) |

---

## 6. Nhịp làm việc nhóm
- **Họp 2 lần/tuần** (30 phút): điểm cổng G, mục thường trực = **rà chi phí credit còn lại**.
- **Kho chung** (Git/Drive): mọi config, ảnh bằng chứng (E-ID, xem [GĐ3](03-giai-doan-3-kiem-thu-demo-baocao.md)), nhật ký chi phí.
- **Quy tắc bàn giao:** không "làm xong miệng" — mỗi bàn giao phải qua **acceptance test** trong [hợp đồng bàn giao](05-hop-dong-ban-giao.md).
