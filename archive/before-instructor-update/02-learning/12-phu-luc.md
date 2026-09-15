# 12 — Phụ lục: Glossary VI-EN, FAQ lỗi & tham chiếu

> Nơi tra cứu nhanh: thuật ngữ, các lỗi hay gặp gom một chỗ (runbook rút gọn), và bản
> đồ E-ID. Chi tiết cấu hình nằm trong từng chương; đây là mục lục dẫn tới.

---

## 1. Glossary VI-EN (thuật ngữ giữ tiếng Anh + giải thích ngắn)

### Mạng & hệ thống
| Thuật ngữ | Giải thích ngắn |
|---|---|
| IP address | địa chỉ máy trên mạng |
| public / private IP | IP ra Internet / IP nội bộ (RFC1918: 10.x, 172.16–31.x, 192.168.x) |
| port | "cửa" dịch vụ trên một IP (80, 443, 22, 5601, 9200...) |
| CIDR | ký hiệu dải mạng, vd `/16` (65536 địa chỉ), `/24` (256) |
| NAT | dịch nhiều private IP thành 1 public IP khi ra Internet |
| DNS | danh bạ: tên miền → IP |
| HTTP request/response | yêu cầu/phản hồi web; access log ghi lại từng request |
| status code | mã trạng thái (200, 302, 401, 404, 500) |
| TLS/HTTPS | mã hoá đường truyền web |
| stateful firewall | tường lửa nhớ kết nối → không cần luật chiều về (Security Group) |
| reverse proxy | proxy nhận thay backend rồi trả kết quả (nginx trước Kibana) |
| X-Forwarded-For (XFF) | header proxy ghi IP thật của khách |

### AWS
| Thuật ngữ | Giải thích ngắn |
|---|---|
| Region / Availability Zone | vùng địa lý / trung tâm dữ liệu độc lập trong vùng |
| VPC | mạng ảo riêng của bạn trên AWS |
| subnet | mạng con trong VPC; "public" nếu route ra Internet Gateway |
| route table | bảng định tuyến của subnet |
| Internet Gateway (IGW) | cổng cho VPC ra/vào Internet |
| Security Group (SG) | tường lửa stateful cấp instance (chỉ luật allow) |
| Network ACL (NACL) | tường lửa stateless cấp subnet (có luật deny) |
| EC2 | máy chủ ảo |
| AMI | ảnh hệ điều hành để tạo/nhân bản EC2 |
| EBS | ổ đĩa ảo gắn EC2 (còn tính phí khi instance stop) |
| snapshot | bản chụp EBS để backup |
| key pair | cặp khoá SSH; `.pem` là khoá riêng (giữ bí mật, `chmod 400`) |
| Elastic IP (EIP) | IP public cố định (được giữ) |
| IAM user/role/instance profile | danh tính người/vai trò/vai gắn EC2 |
| AWS Budgets | công cụ cảnh báo chi phí |

### ELK & GeoIP
| Thuật ngữ | Giải thích ngắn |
|---|---|
| Elasticsearch | kho lưu + tìm kiếm/tổng hợp |
| Kibana | giao diện xem/vẽ/cảnh báo |
| Logstash | đường ống parse/enrich log (input→filter→output) |
| Filebeat | bộ đọc & gửi log (nhẹ) |
| index / document / field | ~ bảng-theo-thời-gian / hàng / cột |
| mapping | định nghĩa kiểu field (như CREATE TABLE) |
| shard / replica | mảnh index / bản sao dự phòng |
| keyword vs text | chuỗi aggregate được / chuỗi tìm-toàn-văn |
| geo_point | kiểu toạ độ (bắt buộc cho Kibana Maps) |
| data stream | "bảng" chỉ-ghi-thêm |
| ILM | quản lý vòng đời index (xoay vòng/xoá) |
| ingest pipeline | xử lý trước khi lưu (như trigger BEFORE INSERT) |
| ECS | Elastic Common Schema — bộ tên trường chuẩn |
| GeoIP | định vị theo IP (dùng database MaxMind GeoLite2) |
| ES\|QL / KQL | ngôn ngữ truy vấn của Elastic |

### Bảo mật & giám sát
| Thuật ngữ | Giải thích ngắn |
|---|---|
| OWASP Top 10 (2025) | 10 rủi ro web phổ biến; A09 = Logging & Alerting Failures |
| brute force | dò mật khẩu vét cạn |
| credential stuffing | thử cặp user/pass rò rỉ hàng loạt |
| baseline | mức "bình thường" đo trước |
| negative control | đối chứng: traffic thường → kỳ vọng 0 báo động |
| false positive | báo động giả |
| detection latency | độ trễ phát hiện |
| fail2ban | tự chặn IP tại host sau nhiều lần thất bại |

---

## 2. Runbook rút gọn — lỗi hay gặp gom một chỗ

> Chi tiết & bảng lỗi đầy đủ ở mỗi chương. Dùng mục này khi "đang panic".

**Quy trình debug dịch vụ (áp dụng mọi dịch vụ):**
`systemctl status X` → `journalctl -u X -n 50 --no-pager` → `ss -tlnp | grep <port>` → `curl localhost:<port>`

**Thang "không vào được từ ngoài" (theo thứ tự):**
1. Tiến trình bind `0.0.0.0` hay chỉ `127.0.0.1`? (`ss -tlnp`)
2. Có đang nghe không? 3. `ufw`? 4. Security Group? 5. Đúng public IP chưa?

**Thang 5 điểm "Kibana trống":** nginx ghi? → Filebeat gửi? → Logstash nhận? → ES lưu? → **Kibana đúng data view + time range + timezone?** ([06](06-thu-thap-va-xu-ly-log.md))

**Sự cố thường gặp → chương xử lý:**
| Sự cố | Chương |
|---|---|
| SSH `Permission denied` / khoá lỗi | [02](02-linux-co-ban.md) |
| Tự khoá khỏi SSH (SG/ufw) | [02](02-linux-co-ban.md), [11](11-bao-mat-van-hanh-chi-phi.md) |
| `502 Bad Gateway` (php-fpm socket) | [04](04-web-server-va-app.md) |
| ES chết khởi động (heap/max_map_count) | [05](05-elk-kien-truc.md) |
| `missing authentication credentials` | [05](05-elk-kien-truc.md) |
| cluster `yellow` | [05](05-elk-kien-truc.md) |
| Filebeat không chạy (`type: log`) | [06](06-thu-thap-va-xu-ly-log.md) |
| Dashboard/bản đồ trống | [06](06-thu-thap-va-xu-ly-log.md), [07](07-geoip.md), [08](08-kibana-dashboard.md) |
| Đĩa đầy → index read-only | [06](06-thu-thap-va-xu-ly-log.md), [11](11-bao-mat-van-hanh-chi-phi.md) |
| Instance đổi public IP sau stop | [03](03-cloud-va-aws.md) |
| Đốt credit | [03](03-cloud-va-aws.md), [11](11-bao-mat-van-hanh-chi-phi.md) |

---

## 3. Bản đồ bằng chứng E-ID

Chi tiết tiêu chí: [GĐ3](../01-work-breakdown/03-giai-doan-3-kiem-thu-demo-baocao.md). Định nghĩa: [CONTRACT §6](../CONTRACT.md).

E1 sơ đồ · E2 bảng SG · E3 log schema · E4 log thô↔`_source` · E5 template geo_point ·
E6 bản đồ+top country · E7 IP không lên bản đồ · E8 dashboard · E9 baseline · E10 danh
mục rule · E11 bảng test · E12 negative control · E13 độ trễ · E14 chi phí · E15
teardown · E16 truy vết.

---

## 4. Chỉ mục cấu hình đầy đủ (nằm ở chương nào)
- nginx JSON `log_format` + server block → [04](04-web-server-va-app.md)
- App PHP login + auth log → [04](04-web-server-va-app.md)
- Index template (geo_point) + ILM → [06](06-thu-thap-va-xu-ly-log.md)
- Logstash pipeline → [06](06-thu-thap-va-xu-ly-log.md)
- Filebeat `filebeat.yml` → [06](06-thu-thap-va-xu-ly-log.md)
- geoip / GeoLite2 / geoipupdate → [07](07-geoip.md)
- 8 detection rule + cron alert → [09](09-phat-hien-bat-thuong.md)
- Sinh traffic + tấn công → [10](10-kiem-thu-va-demo.md)
- VPC/SG/EC2/Budget → [03](03-cloud-va-aws.md)
- Hardening/teardown → [11](11-bao-mat-van-hanh-chi-phi.md)

## 5. Nguồn tài liệu tổng hợp
Xem danh mục đầy đủ ở [GĐ1 §3](../01-work-breakdown/01-giai-doan-1-kien-thuc.md#3-nguồn-tài-liệu-ưu-tiên-tiếng-anh-tài-liệu-chính-thức); mỗi chương còn có References riêng.
