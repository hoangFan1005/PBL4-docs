# 02 — Giai đoạn 2: Triển khai (timeline & hướng dẫn từng bước)

> Đây là "bản nhạc" thi công: **thứ tự các bước**, ai làm, và trỏ tới chương học tập
> có cấu hình chi tiết. Bám [cổng G1–G8](04-ma-tran-phan-cong-va-rui-ro.md#3-cổng-kiểm-soát-theo-tuần-mặc-định-8-tuần-lõi)
> và [đường găng](04-ma-tran-phan-cong-va-rui-ro.md#2-đường-găng-critical-path).
> Timeline dùng "Tuần 1…N"; nhóm tự ánh xạ lịch thật.

> **Nguyên tắc xuyên suốt:** mỗi khối lệnh có nhãn máy (`[EC2-WEB]`...); dựng
> **offline trước** khi lên AWS; **giữ một phiên SSH mở** khi đổi mạng/tường lửa;
> **rà chi phí** mỗi buổi.

---

## Tuần 1 — Nền tảng & an toàn chi phí (Cổng G1)

**Mục tiêu:** không ai bấm "Launch" trước khi có phanh chi phí.

1. **[A]** Tạo tài khoản AWS, **bật MFA cho root**, tạo **IAM user** thường dùng (không dùng root hằng ngày). → [03 §IAM](../02-learning/03-cloud-va-aws.md)
2. **[A]** Tạo **AWS Budget** + cảnh báo 20/50/80% và cảnh báo "zero-spend"; bật billing alert. **Trước mọi launch.** → [11 §chi phí](../02-learning/11-bao-mat-van-hanh-chi-phi.md)
3. **[A]** Tự tính **burn-rate**: $/giờ × số instance × 168 giờ/tuần → cả nhóm "thấm" con số. → [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md)
4. **[A]** Tạo **key pair**, làm **"Hello EC2"**: launch 1 instance trong VPC mặc định, SSH vào, `whoami`, rồi **terminate**. → [03 §Hello EC2](../02-learning/03-cloud-va-aws.md)
5. **[cả nhóm]** Ai cũng SSH được vào một instance ít nhất một lần. Đọc [01 Mạng](../02-learning/01-nen-tang-mang.md).

**Ra G1 khi:** Budget alarm sống; cả 3 đã SSH; thấy chi phí trong Cost Explorer.

---

## Tuần 2 — Dựng OFFLINE & chốt hợp đồng (Cổng G2)

**Mục tiêu:** tách rủi ro khỏi AWS; khoá log schema sớm.

6. **[B]** Dựng **app shop PHP local** (LEMP/Docker máy cá nhân): sản phẩm, giỏ, **login**, health, dữ liệu mẫu. → [04](../02-learning/04-web-server-va-app.md)
7. **[B]** Cấu hình **nginx JSON log** + **app auth log**; xuất **file log mẫu ≥20 dòng** (có 200/404/401/curl/SQLi có `"`). → [04](../02-learning/04-web-server-va-app.md), [Bàn giao #3](05-hop-dong-ban-giao.md)
8. **[C]** Dựng **ELK bằng Docker local**; học Discover/Lens/Maps; **viết Logstash pipeline**, test với file log mẫu bằng `--config.test_and_exit` + `rubydebug`. → [05](../02-learning/05-elk-kien-truc.md), [06](../02-learning/06-thu-thap-va-xu-ly-log.md)
9. **[A]** Phác **ma trận SG** + **mô hình chi phí** trên giấy; thiết kế VPC/subnet.
10. **[cả nhóm]** Chốt [`CONTRACT.md`](../CONTRACT.md) (tên trường, version 9.5.3, quy ước).

**Ra G2 khi:** app chạy local; ELK chạy local; **Bàn giao #3 PASS** (20 dòng parse sạch); VPC review trên giấy.

---

## Tuần 3 — Dựng hạ tầng AWS thật (Cổng G3)

**Mục tiêu:** hạ tầng thật + web có log thật.

11. **[A]** Tạo **VPC `10.0.0.0/16`**, public subnet `10.0.1.0/24`, private subnet `10.0.2.0/24`, Internet Gateway và NAT Gateway trong public subnet. Public route đi IGW; private route đi NAT. → [03 §VPC](../02-learning/03-cloud-va-aws.md)
12. **[A]** Tạo **Security Groups**: `pbl4-web-sg` (22 từ IP nhóm, 80/443 từ Internet), `pbl4-elk-sg` (22 và 5044 chỉ từ `pbl4-web-sg`). Không mở 3306/5601/9200 ra Internet. → [03 §SG](../02-learning/03-cloud-va-aws.md) (sinh **E2**)
13. **[A]** Launch **EC2-WEB** trong public subnet và **EC2-ELK** trong private subnet. WEB có public IPv4; ELK không có public IPv4 và được quản trị qua WEB làm jump host. Ghi bảng inventory ([Bàn giao #1](05-hop-dong-ban-giao.md)).
14. **[B]** Cài **LEMP** + triển khai app + nginx JSON log lên EC2-WEB; web mở được bằng public IP. → [04](../02-learning/04-web-server-va-app.md)
15. **[A]** Vẽ **sơ đồ kiến trúc** với CIDR/port/SG thật (sinh **E1**).

**Ra G3 khi:** VPC + 3 EC2 (kể cả TESTER); web truy cập public IP; bắt được 1 dòng JSON log thật.

---

## Tuần 4 — Cho log chảy vào Kibana (Cổng G4 — quan trọng nhất)

**Mục tiêu:** dòng log đầu tiên hiện trong Discover.

16. **[C]** Cài **ES + Kibana** (cặp đôi làm — rủi ro cao): pre-flight `free/df/sysctl`, đặt heap, `vm.max_map_count`, vượt **security-by-default** (enrollment token, mật khẩu `elastic`, CA). → [05 §security](../02-learning/05-elk-kien-truc.md)
17. **[C]** Tạo **index template có `geo_point`** + **ILM** **TRƯỚC** khi ingest (sinh **E5**). → [06](../02-learning/06-thu-thap-va-xu-ly-log.md), [Bàn giao #6](05-hop-dong-ban-giao.md)
18. **[C]** Cài **Logstash** + nạp pipeline đã test; cài **geoip** (downloader hoặc GeoLite2). → [06](../02-learning/06-thu-thap-va-xu-ly-log.md), [07](../02-learning/07-geoip.md)
19. **[A+C]** Mở **5044** (SG), phân phối **CA** (Bàn giao #5); cài **Filebeat** (`filestream`) trên EC2-WEB. → [06](../02-learning/06-thu-thap-va-xu-ly-log.md)
20. **[C]** Xác nhận qua **thang 5 điểm**; sinh **E4** (log thô ↔ `_source`).

**Ra G4 khi:** dòng log đầu tiên hiện trong Kibana Discover. **Nếu trễ → cắt:** bỏ Logstash, dùng Filebeat→ES + ingest pipeline.

---

## Tuần 5 — GeoIP & Dashboard (Cổng G5)

21. **[C]** Tạo **Data view**; dựng **dashboard 6 panel + panel parse-failure** (E8). → [08](../02-learning/08-kibana-dashboard.md)
22. **[C]** Dựng **Maps** (clusters + choropleth) trên `source.geo.location`. → [07](../02-learning/07-geoip.md), [08](../02-learning/08-kibana-dashboard.md)
23. **[B]** Chuẩn bị **EC2-TESTER** (region khác) + script sinh traffic thường/tấn công. → [10](../02-learning/10-kiem-thu-va-demo.md)
24. **[C+B]** Cho traffic đa quốc gia → bản đồ ≥3 nước (E6); giải thích IP không lên bản đồ (E7).

**Ra G5 khi:** bản đồ ≥3 nước; dashboard v1 đủ panel.

---

## Tuần 6 — Baseline, Rule & Kiểm thử (Cổng G6)

25. **[B+C]** Chạy **baseline** ≥30–60 phút traffic thường; đo 5 chỉ số (E9). → [10 §baseline](../02-learning/10-kiem-thu-va-demo.md)
26. **[B]** Viết **8 rule** với ngưỡng **trỏ baseline** + cảnh báo 3 tầng (E10). → [09](../02-learning/09-phat-hien-bat-thuong.md)
27. **[cả nhóm]** Chạy từng **kịch bản tấn công** → điền **bảng thực thi E11**; chạy **negative control E12**; đo **độ trễ E13**. → [10](../02-learning/10-kiem-thu-va-demo.md)

**Ra G6 khi:** baseline xong; mọi rule kích hoạt khi tấn công; E11 phủ 100%; ≥2 negative control.

---

## Tuần 7 — Đóng băng, Dry-run & Bằng chứng (Cổng G7)

28. **[cả nhóm]** **Tuần đóng băng:** không thêm tính năng; chỉ vá lỗi + hoàn thiện gói bằng chứng E1–E13.
29. **[A]** **Báo cáo chi phí** (E14) từ Cost Explorer; chụp **teardown** thử.
30. **[cả nhóm]** **Dry-run demo** đầy đủ; **quay video** + gói ảnh dự phòng (chống RK12). Thêm IP phòng demo vào SG hôm trước buổi thật.

**Ra G7 khi:** dry-run xong; gói bằng chứng đầy đủ; báo cáo chi phí xong.

---

## Tuần 8 — Báo cáo, Bảo vệ & Teardown (Cổng G8)

31. **[cả nhóm]** Hoàn tất **báo cáo + slide** (outline [GĐ3 §5](03-giai-doan-3-kiem-thu-demo-baocao.md)); ôn **ngân hàng câu hỏi bảo vệ**; phân vai **demo chéo**.
32. **[cả nhóm]** Bảo vệ.
33. **[A]** Sau bảo vệ: **teardown** — terminate EC2, xoá EBS/EIP/snapshot thừa; chụp **E15**; đối chiếu credit còn lại (E14). → [11 §teardown](../02-learning/11-bao-mat-van-hanh-chi-phi.md)

**Ra G8 khi:** báo cáo/slide xong; bảo vệ xong; teardown sạch (E15).

---

## Checklist mỗi buổi làm việc (dán lên tường)
**Bắt đầu buổi:** `start` EC2 → kiểm public IP (đổi chưa? cập nhật SG nếu IP nhóm đổi)
→ `systemctl status` các dịch vụ → `df -h` (đĩa) → mở dashboard.
**Kết thúc buổi:** thu bằng chứng cần thiết → **`stop` mọi EC2 không dùng** → xoá EIP/tài
nguyên tạm → **liếc Budget/Cost Explorer**. → [11 §runbook phiên](../02-learning/11-bao-mat-van-hanh-chi-phi.md)

> Chi tiết từng lệnh AWS (tạo VPC/SG/EC2, Budget, stop/start, teardown) và **bảng spec
> instance + dự toán chi phí** nằm ở [03](../02-learning/03-cloud-va-aws.md) và
> [11](../02-learning/11-bao-mat-van-hanh-chi-phi.md).
