# 11 — Bảo mật, Vận hành & Chi phí

> **Người đọc chính: A (+ cả nhóm).** Mục tiêu: làm cứng hệ thống ở mức hợp lý cho
> lab, vận hành an toàn (backup, khôi phục, teardown), và **giữ chi phí trong $200**.
> Đây cũng là nơi đặt **runbook sự cố** — mở khi "đang panic".

## Mục tiêu chương
- Hardening: SSH, quản lý secret, phơi bày dịch vụ đúng cách, endpoint dễ tấn công.
- Quyết định về `ufw` và fail2ban (thứ tự demo).
- Backup (AMI/snapshot), teardown sạch (E15), khôi phục sự cố (đĩa đầy, tự khoá).
- Kiểm soát chi phí & báo cáo chi phí (E14).

## Cần biết gì trước
- [02 Linux](02-linux-co-ban.md), [03 AWS](03-cloud-va-aws.md), [05 ELK](05-elk-kien-truc.md).

---

## 1. Hardening ở mức hợp lý cho lab

**SSH** (trên cả 2 EC2) — xem [02 §7](02-linux-co-ban.md#7-ssh--đăng-nhập-server-và-cấu-hình-an-toàn):
- `PermitRootLogin no`, `PasswordAuthentication no` (chỉ vào bằng khoá — chặn brute-force SSH).
- **Luật 2 phiên:** luôn giữ **một phiên SSH đang mở** khi đổi `sshd_config`/SG/tường lửa.

**Phơi bày dịch vụ đúng cách:**
- **Không** mở `9200` (Elasticsearch) ra Internet — chỉ nội bộ.
- **Kibana (5601):** đừng mở thẳng ra Internet. Hai cách an toàn:
  1. **SSH port-forward** (mặc định cho làm việc hằng ngày, không cần mở port):
     `ssh -L 5601:localhost:5601 ubuntu@<elk-ip>` rồi mở `http://localhost:5601`.
  2. **nginx reverse proxy + TLS + basic auth** cho lúc demo: `server.host: 127.0.0.1`
     trong `kibana.yml`, nginx `proxy_pass http://127.0.0.1:5601;`, đặt
     `server.publicBaseUrl`. → [05 §7](05-elk-kien-truc.md), [04 §6](04-web-server-va-app.md).

**Secrets:** không commit mật khẩu/license key/khoá `.pem` lên repo. Dùng biến môi
trường (vd `${LOGSTASH_ES_PASSWORD}` trong pipeline) và keystore của từng dịch vụ.
Cho Filebeat/Logstash dùng **user quyền tối thiểu**, không phải superuser `elastic`
([05 §7](05-elk-kien-truc.md)).

**Endpoint cố ý dễ tấn công (RK10):** nếu để một endpoint dễ SQLi phục vụ demo, **chỉ
mở cho IP tester** (SG hoặc nginx `allow/deny`), **không** mở ra Internet. Không dữ
liệu thật trên máy; IAM role gắn EC2 để rỗng quyền. Một EC2 bị chiếm = đào coin +
cháy credit + thư abuse từ AWS.

---

## 2. Quyết định: `ufw` và fail2ban

**`ufw` — nhóm KHÔNG bật trên các máy này (có chủ đích).** Lý do nêu trong báo cáo:
VPC một chủ, **Security Group đã là tường lửa stateful nằm NGOÀI HĐH** (không thể tự
khoá từ trong máy), nên thêm `ufw` chỉ **tăng rủi ro tự khoá** mà không thêm lợi ích
theo mô hình đe doạ này. Vẫn trình bày `ufw` như lý thuyết + bài tập tuỳ chọn
([02 §8](02-linux-co-ban.md#8-tường-lửa-host-ufw--lớp-phòng-thủ-thứ-hai)).
> "Chúng tôi đã cân nhắc tường lửa host và chọn chỉ dùng SG, đây là lý do" là câu trả
> lời **tốt hơn** một cài đặt `ufw` không suy xét.

**fail2ban — cài nhưng cẩn thận THỨ TỰ demo (RK9):**
- fail2ban quét log, tự **ban IP** tại host sau nhiều lần thất bại (phản ứng cục bộ,
  gần thời gian thực). ELK là giám sát/điều tra tập trung (không tự chặn). Bổ trợ nhau.
- **Đừng để fail2ban ban IP tester TRƯỚC khi thu xong bằng chứng phát hiện** — nếu
  không traffic tấn công tắt sau 30 giây, dashboard trống. Cách đúng: thu bằng chứng
  (E11) trước với tester được **whitelist**, rồi **demo ban có chủ đích** như phần
  "phản ứng" (detect → respond). Xem [10](10-kiem-thu-va-demo.md).

---

## 3. Backup & Teardown (E15)

**Backup khi hệ thống đã chạy tốt:**
- Tạo **AMI** ("golden image") của mỗi EC2 sau khi cấu hình xong → nếu hỏng, relaunch lại.
- **EBS snapshot** cho backup theo thời điểm.

**Teardown sạch (sau bảo vệ — sinh E15):**
```
1) (nếu muốn giữ để dựng lại) tạo AMI mỗi máy.
2) TERMINATE mọi EC2 (WEB, ELK, TESTER — cả region khác).
3) RELEASE mọi Elastic IP không còn gắn máy chạy.
4) XOÁ EBS volume không dùng + snapshot cũ; DEREGISTER AMI thừa.
5) XOÁ NAT Gateway / Load Balancer nếu lỡ tạo (tính tiền theo giờ).
6) Kiểm Cost Explorer; chụp: 0 instance chạy, 0 EBS thừa, 0 EIP treo (E15).
```
> Nhớ: **stopped ≠ hết tiền** (EBS vẫn tính). Muốn ngừng hẳn phí thì **terminate +
> xoá EBS/snapshot/EIP**. Xem [03 §7](03-cloud-va-aws.md#7-vòng-đời-ec2--cái-gì-tính-tiền).

---

## 4. Runbook sự cố (mở khi đang panic)

**Quy trình debug dịch vụ (mọi dịch vụ):**
`systemctl status X` → `journalctl -u X -n 50 --no-pager` → `ss -tlnp | grep <port>` → `curl localhost:<port>`

**Thang "không vào được từ ngoài":** bind `0.0.0.0`/`127.0.0.1`? → đang nghe? → `ufw`? → SG? → đúng public IP?

**Thang 5 điểm "Kibana trống":** nginx ghi? → Filebeat gửi? → Logstash nhận? → ES lưu? → Kibana đúng data view/time/timezone? ([06](06-thu-thap-va-xu-ly-log.md))

**Sự cố hay gặp & cách khôi phục:**
| Sự cố | Khôi phục |
|---|---|
| **Tự khoá SSH** (SG/ufw/sshd) | EC2 Instance Connect / SSM Session Manager; hoặc sửa SG từ Console; hoặc stop→gỡ EBS root→gắn máy khác→sửa→gắn lại |
| **Đĩa đầy → ES read-only** | `df -h`; dọn/tăng đĩa; `PUT /_all/_settings {"index.blocks.read_only_allow_delete": null}`; đặt ILM ([06](06-thu-thap-va-xu-ly-log.md)) |
| **ES chết khởi động** | `dmesg -T \| grep -i oom` (heap); `vm.max_map_count` ([05](05-elk-kien-truc.md)) |
| **public IP đổi** | `ssh-keygen -R <ip>`; dùng private IP/EIP ([03](03-cloud-va-aws.md)) |
| **Demo hỏng hôm thật** | dùng video + ảnh dự phòng (G7); thêm IP phòng demo vào SG hôm trước |

**Disk watermarks:** ES chặn ghi ở 85/90/**95%** (read-only). Volume ELK ≥30GB + ILM
xoá log cũ + `df -h` trong checklist cuối buổi.

---

## 5. Kiểm soát & báo cáo chi phí (E14)

- Budget + cảnh báo 20/50/80% + zero-spend + (khuyến nghị) **Budget Action tự stop EC2**
  đã đặt từ [03 §2](03-cloud-va-aws.md#2--an-toàn-chi-phí--làm-ngay-trước-mọi-thứ).
- **Rà chi phí là mục thường trực mỗi buổi họp** (2 lần/tuần).
- **Bật/tắt theo phiên** (kịch bản b, ~$11/tháng) thay vì 24/7 (~$71/tháng).
- Egress: 100GB/tháng đầu miễn phí; theo dõi GB thực trong Cost Explorer sớm (demo
  đông người có thể vượt giả định).
- **Báo cáo chi phí E14:** xuất Cost Explorer thực tế vs dự toán 2 kịch bản + credit còn lại.

> **Tối ưu tuỳ chọn:** đưa web sang **t4g.small** (miễn phí 750h/tháng tới 31/12/2026)
> → web $0 compute. Lưu ý ngày hết ưu đãi nằm ngoài vòng đời đồ án nên chỉ coi là bonus.

---

## Bàn giao & bằng chứng
- Sinh **E14** (báo cáo chi phí) và **E15** (bằng chứng teardown) sau bảo vệ.

## Câu hỏi bảo vệ
1. Vì sao nhóm **không** bật `ufw`? Lập luận theo mô hình đe doạ.
2. Vì sao demo fail2ban **sau** khi thu bằng chứng phát hiện?
3. Máy stopped còn tốn gì? Teardown sạch gồm những bước nào?
4. Đĩa đầy làm ES ngừng ghi — dấu hiệu và cách khôi phục?
5. Làm sao truy cập Kibana an toàn mà không mở 5601 ra Internet?

## Lỗi thường gặp
| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Credit tụt nhanh | máy 24/7 / NAT / EIP treo | tắt máy theo phiên; xoá NAT/EIP |
| Kibana lộ ra Internet | mở 5601 `0.0.0.0/0` | SSH port-forward / reverse proxy + auth |
| `index.blocks.read_only_allow_delete` | đĩa >95% | dọn đĩa + gỡ block + ILM |
| Không vào được sau khi siết SG | tự khoá | Instance Connect / SSM |

## References (ưu tiên tiếng Anh)
- EC2 lifecycle / billing — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- Create an AMI — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html · EBS snapshots — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html
- AWS Budgets actions — https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html
- Kibana security / reverse proxy — https://www.elastic.co/docs/deploy-manage/security
- fail2ban — https://www.fail2ban.org/ · OpenSSH hardening — https://infosec.mozilla.org/guidelines/openssh

> **Đối chiếu thuật ngữ:** hardening = làm cứng · secret = bí mật/khoá · teardown = dọn
> tài nguyên · AMI/snapshot · watermark = ngưỡng đĩa · reverse proxy. Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
