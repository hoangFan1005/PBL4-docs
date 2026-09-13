# 03 — Cloud & AWS (kèm chi phí — đọc TRƯỚC khi bấm Launch)

> **Người đọc chính: A (Cloud/Infra).** Mục tiêu: hiểu điện toán đám mây từ số 0,
> dựng được hạ tầng (VPC, subnet, SG, EC2), và — quan trọng ngang nhau — **kiểm soát
> chi phí trước khi tạo tài nguyên**. Thứ tự trong chương cố ý: **an toàn chi phí →
> Hello EC2 → lý thuyết mạng AWS → dựng thật**.

## Mục tiêu chương
- Hiểu IaaS, Region/AZ, VPC/subnet/route/IGW, Security Group (stateful) vs NACL.
- Dựng được EC2 và truy cập bằng SSH; hiểu vòng đời & **cái gì tính tiền**.
- Đặt **Budget/cảnh báo chi phí** và biết **cái gì vẫn tốn tiền khi stop**.
- Chọn đúng **instance type** cho web và ELK trong ngân sách $200.

## Cần biết gì trước
- [01 Mạng](01-nen-tang-mang.md) (public/private IP, CIDR, port, stateful firewall), [02 Linux](02-linux-co-ban.md) (SSH, `chmod 400`).

---

## 1. Điện toán đám mây & IaaS là gì
Thay vì mua máy chủ vật lý, bạn **thuê máy chủ ảo** theo giờ trên hạ tầng của AWS.
Đây là **IaaS (Infrastructure as a Service)**: AWS lo phần cứng/điện/mạng, bạn lo
hệ điều hành trở lên. **EC2** (Elastic Compute Cloud) là dịch vụ máy chủ ảo đó.

**Analogy:** thay vì mua xe (máy vật lý), bạn **thuê xe theo giờ** (EC2) — trả tiền
khi chạy, trả xe thì thôi (gần đúng — xem mục chi phí về ổ đĩa).

---

## 2. ⚠️ AN TOÀN CHI PHÍ — làm NGAY, trước mọi thứ

Tài khoản mới có **Free Plan ~$200 credit**, dùng trong **6 tháng kể từ ngày tạo
HOẶC tới khi hết credit** (cái nào đến trước). Hết credit → tài khoản **tự đóng**,
không âm thầm trừ thẻ. **Lưu ý:** ưu đãi cũ "750 giờ t3.micro/tháng trong 12 tháng"
**KHÔNG áp dụng** cho tài khoản tạo sau 15/07/2025 — mọi giờ chạy đều trừ vào $200.

> **IAM (Identity and Access Management) = "ai được làm gì" trên AWS.** `root` là tài
> khoản toàn quyền (chỉ dùng khi thật cần); **IAM user** là tài khoản con giới hạn
> quyền cho công việc hằng ngày; **IAM role** là "vai" gắn cho dịch vụ/EC2. Hướng dẫn
> tạo IAM user (chính thức): https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html

**Ba việc bắt buộc trước khi Launch:**
```
1) Bật MFA cho tài khoản root; tạo IAM user thường dùng (đừng dùng root hằng ngày).
2) Tạo AWS Budget: mẫu "Zero spend" + một budget $X (vd $50) với cảnh báo 20/50/80%.
   (Budget theo dõi là MIỄN PHÍ; 2 budget có "action" đầu tiên cũng miễn phí.)
3) (Khuyến nghị) Bật Budget Action để TỰ STOP EC2 khi vượt ngưỡng — "kill switch"
   gần nhất mà AWS có. Cần gắn IAM role cho Budgets.
```
> **Sự thật quan trọng:** AWS **không có hard cap** tự tắt mọi thứ mặc định. Budget
> mặc định chỉ **gửi cảnh báo**. Muốn nó *thực sự dừng* EC2 thì phải bật **Budget
> Action** (target = running instances). Đây là điều nên làm cho tài khoản sinh viên.

**Tự tính burn-rate (làm để "thấm" con số):** $/giờ × số instance × 168 giờ/tuần.
Vd 2 máy chạy 24/7 (t3.small + t3.medium) ≈ $70/tháng → **hết $200 trong ~2.8 tháng**.
→ Kết luận: **tắt máy khi không dùng** (mục 8).

**Cạm bẫy đốt tiền nhanh nhất:** wizard "VPC and more" mặc định tạo **NAT Gateway**
(~$43/tháng chỉ tiền giờ + $0.059/GB). **Không tạo NAT Gateway.** Đồ án đặt cả 2 máy
ở public subnet để né hẳn khoản này.

---

## 3. Hello EC2 — chiến thắng đầu tiên (~45 phút, vài cent)

Đừng học hết lý thuyết VPC rồi mới đụng máy. Làm ngay một vòng nhỏ trong **VPC mặc định**:
```
1) EC2 → Launch instance → chọn Ubuntu Server 24.04 LTS, t3.micro (hoặc t4g.small).
2) Tạo/chọn key pair (.pem) → tải về.
3) Network: giữ VPC mặc định, bật "Auto-assign public IP".
4) Security Group: chỉ mở SSH(22) từ "My IP".
5) Launch → chờ "running" → SSH:  chmod 400 key.pem && ssh -i key.pem ubuntu@<public-ip>
6) whoami; sudo apt update
7) TERMINATE instance (dọn sạch).
```
Xong bước này bạn đã hiểu "máy ảo" là gì bằng trực giác, và có cái để [chương 02](02-linux-co-ban.md) thực hành.

---

## 4. Bản đồ khái niệm AWS (giải thích từ số 0)

| Khái niệm | Là gì | Analogy |
|---|---|---|
| **Region** | vùng địa lý (vd `ap-southeast-1` = Singapore) | thành phố đặt trung tâm dữ liệu |
| **Availability Zone (AZ)** | trung tâm dữ liệu độc lập trong Region | các toà nhà riêng trong thành phố |
| **VPC** | mạng ảo riêng của bạn | khu đất có tường rào của riêng bạn |
| **subnet** | mạng con trong VPC | một lô trong khu đất |
| **public subnet** | subnet có route ra **Internet Gateway** | lô có cổng ra đường lớn |
| **route table** | bảng chỉ đường của subnet | biển chỉ dẫn giao thông |
| **Internet Gateway (IGW)** | cổng cho VPC ra/vào Internet | cổng chính khu đất |
| **Security Group (SG)** | tường lửa **stateful** cấp máy (chỉ luật allow) | bảo vệ có sổ khách, gắn từng máy |
| **Network ACL (NACL)** | tường lửa **stateless** cấp subnet (có deny) | rào ngoài lô, xét từng chiều |
| **EC2 instance** | máy chủ ảo | căn nhà thuê |
| **AMI** | ảnh HĐH để tạo máy | bản thiết kế nhà mẫu |
| **EBS** | ổ đĩa ảo gắn máy | ổ cứng (vẫn tốn tiền khi máy tắt) |
| **key pair** | cặp khoá SSH | chìa khoá nhà (AWS giữ ổ, bạn giữ chìa) |
| **Elastic IP (EIP)** | IP public cố định | số nhà cố định (thuê riêng) |

> **Chọn Region:** dùng **`ap-southeast-1` (Singapore)** — gần Việt Nam, đủ dịch vụ.
> Giá trong tài liệu tính theo region này.

### Security Group là STATEFUL (nhắc lại vì rất quan trọng)
Chỉ cần tạo luật **inbound**; phản hồi tự về (không cần luật outbound cho reply) —
xem [01 §8](01-nen-tang-mang.md#8-tường-lửa-stateful--khái-niệm-quyết-định-cách-dùng-aws-security-group).

### Mẹo vàng: nguồn của SG có thể là một SG khác
Để EC2-WEB gửi log sang EC2-ELK cổng 5044, đặt **source = `sg-pbl4-web`** thay vì
gõ cứng IP. Vì **IP đổi khi stop/start**, còn tham chiếu SG thì không đổi.
> **Analogy MySQL:** như khoá ngoại trỏ tới một *nhóm*, thay vì chép cứng một giá trị.

---

## 5. Bảng spec instance (suy ra từ yêu cầu ELK)

| Máy | Instance | RAM | Vì sao |
|---|---|---|---|
| **EC2-WEB** | **t3.small** (2GB) — hoặc **t4g.small** (ARM) | 2GB | LEMP + app PHP nhẹ đủ dùng. **t4g.small đang MIỄN PHÍ 750h/tháng tới 31/12/2026** → cân nhắc để web $0 compute (AMI Ubuntu ARM chạy tốt) |
| **EC2-ELK** | **t3.medium** (4GB) | 4GB | **Sàn thực tế** cho ES+Kibana+Logstash một node. 2GB (t3.small) **không đủ** (OOM). Nếu chật, tách Logstash sang WEB hoặc dùng Filebeat→ES |
| **EC2-TESTER** | **t3.micro** (1GB) | 1GB | chỉ sinh traffic; đặt **region khác** để có IP nước ngoài; tắt khi không dùng |

Giá tham chiếu (Singapore, 24/7): t3.small $19.27/mo · t3.medium $38.54/mo ·
t3.micro $9.64/mo · t3.large $77.09/mo. Ổ EBS gp3 $0.096/GB-tháng.

> **RAM ELK quyết định kiến trúc:** ELK cần nhiều RAM hơn web hẳn (JVM heap — [05](05-elk-kien-truc.md)).
> Đặt **volume ELK ≥30GB** (chống đầy đĩa → index read-only, [06](06-thu-thap-va-xu-ly-log.md)).

---

## 6. Dựng hạ tầng thật (các bước chính)

> Làm qua Console (GUI) cho trực quan. Mỗi tài nguyên **gắn tag** `Project=pbl4` để dễ dọn.

1. **VPC** `10.0.0.0/16` → **Subnet** public `10.0.1.0/24` → **Internet Gateway** (attach vào VPC) → **Route table** của subnet thêm route `0.0.0.0/0 → igw`. **Không tạo NAT Gateway.**
2. **Security Groups** (sinh **E2**, mỗi luật ghi cột "vì sao"):

| SG | Inbound | Nguồn | Vì sao |
|---|---|---|---|
| `sg-pbl4-web` | 22 | `<IP nhóm>/32` | SSH quản trị (không mở cả Internet) |
| | 80,443 | `0.0.0.0/0` | web cho khách |
| `sg-pbl4-elk` | 22 | `<IP nhóm>/32` | SSH |
| | 5601 | `<IP nhóm>/32` | Kibana chỉ cho nhóm (không public) |
| | 5044 | **`sg-pbl4-web`** | Filebeat→Logstash (nguồn = SG web) |
| | 9200 | *(không mở ra ngoài)* | ES chỉ nội bộ |

3. **Launch EC2-WEB** (t3.small/t4g.small) + **EC2-ELK** (t3.medium) trong subnet trên; bật auto-assign public IP; volume ELK 30GB. Gắn **1 Elastic IP cho WEB** (URL báo cáo ổn định).
4. Ghi **bảng inventory** (tên/instance-id/private IP/public IP/SG) — [Bàn giao #1](../01-work-breakdown/05-hop-dong-ban-giao.md).
5. **EC2-TESTER (đặt ở REGION KHÁC** — để có IP nước ngoài thật cho demo GeoIP):
   ```
   a) Đổi Region ở góc phải Console (vd sang ap-northeast-1 Tokyo / eu-central-1).
   b) Tạo KEY PAIR MỚI (key pair là theo-region — key của WEB/ELK KHÔNG tồn tại ở region này).
   c) Tạo một SG tối thiểu (chỉ 22 từ IP nhóm); không cần VPC riêng, dùng VPC mặc định.
   d) Launch t3.micro Ubuntu 24.04; TẮT khi không dùng.
   ```
   > **⚠️ Bẫy per-region:** **key pair, Security Group, VPC mặc định đều RIÊNG theo
   > từng Region.** Đổi region là như sang một "chi nhánh AWS" khác — phải tạo lại key
   > pair/SG ở đó. Đây là lý do TESTER cần key pair riêng.

> **Đường vào dự phòng:** bật **EC2 Instance Connect** (SSH qua trình duyệt) hoặc dùng
> **SSM Session Manager** (không cần mở port 22, không cần key/public IP — an toàn nhất
> cho người mới, chỉ cần IAM role + SSM agent). Rất hữu ích khi lỡ tự khoá SSH.

---

## 7. Vòng đời EC2 & cái gì tính tiền

| Trạng thái | Tính tiền gì |
|---|---|
| pending | chưa tính |
| **running** | **compute (giờ) + public IPv4 (nếu có) + EBS** |
| stopping/**stopped** | **KHÔNG tính compute**, **VẪN tính EBS** (và EIP nếu treo) |
| terminated | ngừng hết; EBS root bị xoá (nếu DeleteOnTermination) |

Hai sự thật hay quên:
- **Ổ EBS vẫn tính tiền khi máy stopped.** Stop để tiết kiệm compute, nhưng đĩa vẫn tốn nhẹ.
- **Public IPv4 = $0.005/IP/giờ.** IP auto-assign chỉ tính khi máy **running** (stop thì trả IP). **Elastic IP tính tiền cả khi máy stopped** (EIP treo cũng bị tính) → chỉ giữ EIP thật cần (1 cái cho WEB).

> **⚠️ Bẫy (RK7): stop → start làm ĐỔI public IP** (trừ khi dùng EIP). Hệ quả: SSH
> `known_hosts` báo đổi, Filebeat mất đích, URL đổi. **Cách chặn:** mọi tham chiếu
> máy-tới-máy dùng **private IP** (hoặc `/etc/hosts` alias); 1 EIP cho WEB. Lỗi
> nguyên văn: `REMOTE HOST IDENTIFICATION HAS CHANGED` → `ssh-keygen -R <ip>`.

---

## 8. Runbook phiên & chi phí (E14)
- **Đầu buổi:** start EC2 → kiểm public IP (đổi? cập nhật SG nếu **IP nhóm** đổi: `curl https://checkip.amazonaws.com`) → mở dashboard.
- **Cuối buổi:** **stop mọi EC2 không dùng** → xoá EIP/tài nguyên tạm → liếc Cost Explorer.
- **Kịch bản chi phí vs $200:**

| Kịch bản | /tháng | Ghi chú |
|---|---|---|
| (a) web t3.small + ELK t3.medium **24/7** | ~$70.9 | hết credit ~2.8 tháng — **chỉ kịch bản này có nguy cơ hết tiền** |
| (b) như (a) nhưng **60h/tháng** | ~$11.1 | ràng buộc là **cửa sổ 6 tháng**, còn dư credit khi hết hạn |
| (c) (b) với ELK **t3.large** | ~$14.3 | vẫn trong ngân sách |

→ Khuyến nghị: **bật/tắt theo phiên** (kịch bản b). Chi tiết teardown & backup ở [11](11-bao-mat-van-hanh-chi-phi.md).

---

## Quyết định thiết kế (tóm tắt)
| Vấn đề | Phương án | Chọn | Vì sao / Đánh đổi |
|---|---|---|---|
| Ra Internet cho subnet | NAT Gateway · public subnet | **public subnet + SG** | NAT ~$43/mo đốt credit; bù bằng SG siết chặt |
| Địa chỉ WEB | auto IP · **Elastic IP** | **1 EIP cho WEB** | URL ổn định; EIP tính tiền cả khi stop nên chỉ 1 cái |
| Tham chiếu máy-máy | public IP · **private IP** | **private IP** | miễn phí + không đổi khi stop/start |
| Đường vào | chỉ SSH · +Instance Connect/SSM | **+SSM/Instance Connect** | có đường dự phòng khi tự khoá |

## Cách tự kiểm tra / Câu hỏi bảo vệ
1. Điều gì làm một subnet trở thành "public"?
2. SG khác NACL ở đâu? Vì sao SG không cần luật outbound cho phản hồi?
3. Vì sao 5044 nên đặt source = SG của web thay vì IP?
4. Máy stopped còn tốn tiền gì? Vì sao stop→start hay làm hỏng SSH/Filebeat?
5. AWS có tự tắt mọi thứ khi hết tiền không? Làm sao có "kill switch"?
6. Vì sao ELK cần t3.medium mà web chỉ t3.small?

## Lỗi thường gặp
| Triệu chứng (nguyên văn) | Nguyên nhân | Cách sửa |
|---|---|---|
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | public IP đổi sau stop/start | `ssh-keygen -R <ip>`; dùng private IP/EIP |
| SSH timeout | SG chưa mở 22 cho IP nhóm / IP nhóm đổi | cập nhật SG; kiểm `checkip.amazonaws.com` |
| Hoá đơn tăng bất ngờ | NAT Gateway do wizard / EIP treo / máy quên tắt | xoá NAT/EIP; stop máy; xem Cost Explorer |
| Không SSH được sau khi siết SG | tự khoá | EC2 Instance Connect / SSM Session Manager |

## References (ưu tiên tiếng Anh)
- AWS Free Tier — https://aws.amazon.com/free · EC2 pricing — https://aws.amazon.com/ec2/pricing/on-demand/
- Security Groups — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html · NACL — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- EC2 lifecycle — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- AWS Budgets — https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html · Budget actions — https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html
- Public IPv4 pricing — https://aws.amazon.com/vpc/pricing/ · SSM Session Manager — https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS Skill Builder VPC — https://explore.skillbuilder.aws/learn/course/79/introduction-to-amazon-virtual-private-cloud-vpc · AWS 101 workshop — https://catalog.workshops.aws/aws101/en-US

> **Đối chiếu thuật ngữ:** IaaS · Region/AZ · VPC/subnet/route table/IGW · Security
> Group/NACL · EC2/AMI/EBS/EIP · Budget = ngân sách · burn-rate = tốc độ tiêu tiền.
> Bảng đầy đủ ở [Phụ lục 12](12-phu-luc.md).
