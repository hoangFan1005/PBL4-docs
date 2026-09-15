# 01 — Nền tảng mạng (đọc trước tất cả)

> **Chương này dành cho ai:** cả 3 thành viên, kể cả bạn nghĩ "mình học mạng rồi".
> Đây là những khái niệm mà *mọi tutorial AWS/ELK đều giả định bạn đã biết* — nếu
> hổng chỗ này, mọi bước sau sẽ giống như "gõ bùa". Mục tiêu: đọc xong bạn hiểu
> **một request đi từ trình duyệt tới server và quay về như thế nào**, và **tường
> lửa/địa chỉ IP ảnh hưởng ra sao**.

## Mục tiêu chương
- Hiểu IP, port, CIDR, IP public vs private, NAT, DNS, HTTP, TLS ở mức "dùng được".
- Hiểu tường lửa **stateful** (điều này quyết định vì sao Security Group của AWS
  chỉ cần mở chiều vào).
- Nối được các khái niệm này với thứ bạn đã biết (PHP, MySQL, trình duyệt).

## Cần biết gì trước
Chỉ cần: bạn từng mở trình duyệt gõ một địa chỉ web, và biết PHP chạy trên server
trả HTML về. Không cần gì hơn.

---

## 1. Địa chỉ IP là gì — và tại sao có 2 loại

**Analogy:** IP address giống **địa chỉ nhà**. Muốn gửi thư (dữ liệu) tới một máy,
bạn cần địa chỉ của nó.

IPv4 là dãy 4 số 0–255 ngăn bởi dấu chấm: `203.0.113.45`. (Có IPv6 dài hơn, đồ án
này chỉ cần IPv4.)

Có **hai thế giới địa chỉ**:

| Loại | Ví dụ | Dùng ở đâu | Ai thấy được |
|---|---|---|---|
| **Private IP** (nội bộ) | `10.0.1.23`, `192.168.1.5`, `172.16.x` | Bên trong một mạng riêng (nhà bạn, hoặc VPC trên AWS) | Chỉ các máy trong cùng mạng đó |
| **Public IP** (công cộng) | `13.229.58.10` | Trên Internet | Cả thế giới |

Các dải private được quy định trong chuẩn **RFC 1918**: `10.0.0.0/8`,
`172.16.0.0/12`, `192.168.0.0/16`. Chúng **được phép trùng nhau** giữa các mạng
khác nhau (nhà bạn và nhà tôi đều có thể có `192.168.1.1`) vì chúng không bao giờ
xuất hiện trực tiếp trên Internet.

> **⚠️ Đây là bẫy GeoIP quan trọng nhất của cả đồ án.** IP private **không thuộc về
> quốc gia nào** — nó là địa chỉ nội bộ. Nếu log của bạn ghi IP `10.0.1.x` (IP nội
> bộ trong VPC) thì GeoIP **không thể** tra ra quốc gia, và bản đồ Kibana sẽ trống.
> Ghi nhớ điều này; [chương 07](07-geoip.md) sẽ xử lý nó.

**Nối với đồ án:** trong VPC trên AWS, mỗi EC2 có một **private IP** cố định (vd
`10.0.1.10`) để các máy trong VPC nói chuyện với nhau, và (nếu bạn bật) một
**public IP** để Internet truy cập được. Trình duyệt của khách gõ public IP; nhưng
khi hai EC2 của bạn (Web và ELK) nói chuyện nội bộ, chúng dùng private IP (rẻ hơn,
xem [chương 03](03-cloud-va-aws.md) và [11](11-bao-mat-van-hanh-chi-phi.md)).

---

## 2. Port — nhiều "cửa" trên cùng một địa chỉ

**Analogy:** nếu IP là địa chỉ toà nhà, thì **port** là **số phòng/số cửa**. Một
máy chủ có 1 IP nhưng chạy nhiều dịch vụ; port giúp phân biệt gói tin đi tới dịch
vụ nào.

Port là số 0–65535. Các port bạn sẽ gặp trong đồ án:

| Port | Dịch vụ | Ghi chú |
|---|---|---|
| 22 | SSH | Đăng nhập điều khiển server từ xa |
| 80 | HTTP | Web (chưa mã hoá) |
| 443 | HTTPS | Web (mã hoá TLS) |
| 3306 | MySQL/MariaDB | CSDL — **chỉ mở nội bộ, không ra Internet** |
| 5044 | Beats input của Logstash | Filebeat gửi log tới Logstash |
| 5601 | Kibana | Giao diện web của ELK |
| 9200 | Elasticsearch REST API | **Tuyệt đối không mở ra Internet** |

**Nối với PHP:** khi bạn chạy `php -S localhost:8000` để test, `8000` chính là port.
`localhost` là tên gọi của IP `127.0.0.1` — "chính máy này".

---

## 3. CIDR — cách viết gọn "một dải địa chỉ"

Đây là khái niệm khiến người mới bối rối nhất khi vào AWS, nhưng bản chất đơn giản.

**Vấn đề:** làm sao nói "tất cả địa chỉ từ `10.0.0.0` đến `10.0.255.255`" một cách
gọn? → Dùng **CIDR notation**: `10.0.0.0/16`.

Con số sau dấu `/` (gọi là **prefix length**) cho biết **bao nhiêu bit đầu là cố
định (phần mạng)**; các bit còn lại tự do (phần máy).

**Analogy mã bưu chính:** `/16` giống như khoá cứng "Hà Nội" — mọi địa chỉ bắt đầu
bằng "Hà Nội, ..." đều thuộc dải. `/24` khoá cứng thêm tới tận "Hà Nội, quận Cầu
Giấy" — dải hẹp hơn. Số càng lớn → dải càng **nhỏ** (càng nhiều bit bị khoá).

| CIDR | Dải địa chỉ | Số địa chỉ | Trực giác |
|---|---|---|---|
| `10.0.0.0/16` | `10.0.0.0` → `10.0.255.255` | 65 536 | "cả một toà nhà lớn" (VPC) |
| `10.0.1.0/24` | `10.0.1.0` → `10.0.1.255` | 256 | "một tầng của toà nhà" (subnet) |
| `10.0.1.10/32` | đúng `10.0.1.10` | 1 | "đúng một căn phòng" (một IP cụ thể) |
| `0.0.0.0/0` | tất cả | ~4 tỉ | "bất kỳ ai" (cả Internet) |

**Bạn sẽ dùng chính xác 3 cái này trong đồ án:**
- VPC = `10.0.0.0/16` (toà nhà).
- Public subnet = `10.0.1.0/24` (một tầng bên trong toà nhà).
- Trong Security Group: `0.0.0.0/0` nghĩa "mở cho cả thế giới" (dùng cho web port
  80/443); còn `<IP-của-bạn>/32` nghĩa "chỉ đúng máy tôi" (dùng cho SSH — an toàn).

> **Cách lấy IP công cộng hiện tại của bạn** (để điền vào SG cho SSH): mở trình
> duyệt vào `https://checkip.amazonaws.com` hoặc chạy `curl https://checkip.amazonaws.com`.
> IP này **có thể đổi** khi bạn đổi mạng/khởi động lại router — nếu SSH bỗng không
> vào được, kiểm tra lại IP này đầu tiên ([chương 03](03-cloud-va-aws.md)).

---

## 4. NAT — vì sao IP trên log khác IP trên trình duyệt

**Analogy tổng đài công ty:** cả công ty có 1 số điện thoại đối ngoại. Nhân viên
gọi ra ngoài đều hiện số tổng đài đó; tổng đài nhớ ai đang gọi để chuyển cuộc gọi
về đúng người. Đó là **NAT (Network Address Translation)**: dịch nhiều private IP
bên trong thành một public IP khi ra Internet, và ngược lại.

Hệ quả bạn sẽ gặp:
- Nhiều người ngồi cùng một mạng WiFi/công ty **ra Internet với cùng một public IP**.
- Router/proxy đứng trước web có thể làm server thấy **IP của router** thay vì IP
  thật của khách. Header **`X-Forwarded-For`** sinh ra để giải quyết: proxy ghi IP
  thật của khách vào header này. → [chương 04](04-web-server-va-app.md) sẽ cấu hình
  nginx để **ghi đúng IP khách** vào log, nếu không GeoIP sẽ định vị nhầm.

> Trên AWS, một private-subnet muốn ra Internet phải qua **NAT Gateway** — dịch vụ
> **tính phí theo giờ + theo GB**. Đây là lý do đồ án đặt cả 2 EC2 ở **public
> subnet** để tránh chi phí này ([chương 03](03-cloud-va-aws.md), [11](11-bao-mat-van-hanh-chi-phi.md)).

---

## 5. DNS — danh bạ của Internet

**Analogy:** DNS là **danh bạ điện thoại**. Con người nhớ tên (`shop.example.com`),
máy tính cần số (IP). DNS dịch tên → IP.

Khi gõ `shop.example.com`, máy bạn hỏi DNS server "IP của tên này là gì?", nhận về
`13.229.58.10`, rồi mới kết nối. Trong đồ án, EC2 được AWS cấp sẵn một tên DNS công
cộng dạng `ec2-13-229-58-10.ap-southeast-1.compute.amazonaws.com` — dùng tạm được,
nhưng **không** xin được chứng chỉ HTTPS cho tên này (xem [chương 04](04-web-server-va-app.md)).

---

## 6. HTTP — ngôn ngữ của web (và là thứ ta giám sát)

Đây là phần cốt lõi vì **access log chính là bản ghi các HTTP request**.

Mỗi lần trình duyệt tải một thứ gì đó (trang, ảnh, CSS), nó gửi **một HTTP request**:

```
GET /products/123 HTTP/1.1        ← method + đường dẫn (URI) + phiên bản
Host: shop.example.com            ← các "header" (thông tin kèm theo)
User-Agent: Mozilla/5.0 ...       ← trình duyệt/công cụ nào đang gọi
```

Server trả về **HTTP response** kèm một **status code** (mã trạng thái):

| Nhóm mã | Ý nghĩa | Ví dụ bạn sẽ soi trong log |
|---|---|---|
| 2xx | Thành công | `200 OK` |
| 3xx | Chuyển hướng | `302 Found` (vd login xong đá về trang chủ) |
| 4xx | Lỗi phía client | `401`/`403` (từ chối), `404` (không có trang) |
| 5xx | Lỗi phía server | `500` (app PHP lỗi) |

**Method** thường gặp: `GET` (lấy dữ liệu), `POST` (gửi dữ liệu — vd submit form
login). Ghi nhớ: **đăng nhập là `POST` tới trang login**. Một loạt `POST` tới trang
login mà phần lớn thất bại = dấu hiệu **brute-force** ([chương 09](09-phat-hien-bat-thuong.md)).

Vì sao HTTP quan trọng với giám sát: từ mỗi dòng access log ta đọc được **ai (IP),
lúc nào (time), làm gì (method + URI), kết quả (status), bằng công cụ gì
(user-agent), tốn bao nhiêu byte**. Toàn bộ hệ thống giám sát dựng trên 6 mẩu tin
này.

---

## 7. TLS/HTTPS — vì sao trang login cần khoá

**HTTP** gửi dữ liệu **dạng chữ trần** — ai bắt được gói tin trên đường đều đọc
được, kể cả mật khẩu bạn gõ ở trang login. **HTTPS = HTTP + TLS**, TLS mã hoá đường
truyền (biểu tượng ổ khoá trên trình duyệt).

Ba điều cần nhớ cho đồ án:
1. Vì có **trang đăng nhập**, ta **nên** bật HTTPS để mật khẩu không lộ.
2. HTTPS **không thay đổi nội dung access log** — vẫn là IP, URI, status như cũ.
3. Cần một **chứng chỉ (certificate)**. Các cách lấy (chi tiết ở [chương 04](04-web-server-va-app.md)):
   self-signed (nhanh, trình duyệt cảnh báo), hoặc Let's Encrypt (miễn phí, cần một
   tên miền — có thể xin miễn phí qua DuckDNS).

---

## 8. Tường lửa STATEFUL — khái niệm quyết định cách dùng AWS Security Group

Đây là khái niệm mà nếu không hiểu, bạn sẽ bối rối khi cấu hình Security Group.

**Tường lửa (firewall)** quyết định gói tin nào được đi qua. Có hai kiểu:

- **Stateless (không nhớ trạng thái):** xét từng gói tin độc lập. Muốn cho phép một
  cuộc trao đổi, bạn phải mở **cả chiều đi lẫn chiều về** thủ công. (AWS **Network
  ACL** là loại này.)
- **Stateful (có nhớ trạng thái):** nhớ các kết nối đang mở. Nếu bạn cho phép một
  request **đi vào**, thì phản hồi **đi ra** được tự động cho qua — bạn **không cần**
  khai báo luật chiều về. (AWS **Security Group** là loại này.)

**Analogy bảo vệ toà nhà có sổ khách:** bảo vệ stateful ghi sổ "khách A vừa vào lúc
9h" — khi A đi ra, bảo vệ thấy trong sổ nên cho ra ngay. Bảo vệ stateless không có
sổ — mỗi lần ra/vào đều phải xuất trình giấy phép riêng.

**Hệ quả cực kỳ thực tế trong đồ án:** với **Security Group**, bạn chỉ cần tạo luật
**inbound** (cho phép cái gì đi vào: 22 từ IP của bạn, 80/443 từ mọi nơi). Bạn
**không cần** đụng tới outbound cho các phản hồi — chúng tự về được. Người mới hay
hoảng "sao không thấy mở chiều ra?" — vì SG là stateful, không cần. Chi tiết SG vs
NACL ở [chương 03](03-cloud-va-aws.md).

---

## 9. Ghép tất cả: hành trình một request trong đồ án

```
[Trình duyệt khách]  ── HTTP GET /products/1 ──►  (Internet)
        │                                              │
        │  DNS: shop... → 13.229.58.10                 │  đi tới public IP của EC2-WEB
        ▼                                              ▼
   Security Group (stateful): cho phép 80/443 vào  ──► [EC2-WEB: nginx]
                                                          │  nginx gọi PHP-FPM xử lý
                                                          │  PHP hỏi MariaDB (port 3306, nội bộ)
                                                          │  nginx GHI 1 DÒNG access log (JSON)
                                                          ▼
                                              access log  ──► Filebeat ──(private IP, 5044)──►
                                                                                 [EC2-ELK: Logstash]
                                                                                 parse JSON → geoip → ES
        ◄──────────────── HTTP 200 + HTML ─────────────────┘ (phản hồi tự về nhờ SG stateful)

[Nhóm/giảng viên] ── HTTPS 5601 ──► Kibana (trên EC2-ELK) ── xem dashboard/bản đồ
```

Nếu bạn đọc hiểu sơ đồ này, bạn đã có "khung xương" để hiểu mọi chương còn lại. Mỗi
chương sau chỉ là phóng to một chặng trong hành trình trên.

---

## Cách tự kiểm tra đã hiểu (tự trả lời, không tra tài liệu)
1. Vì sao địa chỉ `10.0.1.10` không hiện được lên bản đồ GeoIP?
2. Trong Security Group, để cho khách vào xem web thì mở port nào, cho phép từ CIDR
   nào? Còn SSH thì nên giới hạn CIDR nào và vì sao?
3. Bạn cần mở luật outbound cho phản hồi HTTP về không? Vì sao?
4. `/24` là bao nhiêu địa chỉ? `0.0.0.0/0` nghĩa là gì?
5. Một loạt `POST /login` với hầu hết trả `200` (hiện lại trang login) thay vì `302`
   gợi ý điều gì?

## Lỗi thường gặp
- **Nhầm public/private IP** → GeoIP trống. Luôn hỏi "IP này có ra Internet được không?"
- **Mở SSH cho `0.0.0.0/0`** → cả thế giới thử đăng nhập server của bạn (bạn sẽ thấy
  chính điều này trong log!). Chỉ mở cho `<IP-của-bạn>/32`.
- **Quên rằng nhiều khách sau NAT dùng chung 1 public IP** → đừng vội kết luận "1 IP
  = 1 người".

## References (ưu tiên tiếng Anh)
- Cloudflare Learning — *What is an IP address?* — https://www.cloudflare.com/learning/dns/glossary/what-is-my-ip-address/
- Cloudflare Learning — *What is a port?* / *TCP/IP* — https://www.cloudflare.com/learning/network-layer/what-is-a-computer-port/
- RFC 1918 (private address space) — https://datatracker.ietf.org/doc/html/rfc1918
- Cloudflare Learning — *What is CIDR?* — https://www.cloudflare.com/learning/network-layer/what-is-cidr/
- MDN — *An overview of HTTP* — https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview
- MDN — *HTTP response status codes* — https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- Cloudflare Learning — *What is NAT?* — https://www.cloudflare.com/learning/network-layer/what-is-nat/
- Cloudflare Learning — *Stateful vs stateless firewall* — https://www.cloudflare.com/learning/ddos/glossary/stateful-vs-stateless-firewall/
- Cloudflare Learning — *What is TLS/HTTPS?* — https://www.cloudflare.com/learning/ssl/what-is-https/

> **Đối chiếu thuật ngữ nhanh:** IP address = địa chỉ IP · port = cổng · CIDR = ký
> hiệu dải mạng · NAT = dịch địa chỉ mạng · stateful firewall = tường lửa có trạng
> thái · request/response = yêu cầu/phản hồi · status code = mã trạng thái. Bảng đầy
> đủ ở [Phụ lục 12](12-phu-luc.md).
