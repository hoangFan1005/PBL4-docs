/**
 * Tạo Google Forms Quiz 50 câu cho nhóm PBL4.
 * Chạy hàm createNetworkQuiz() bằng tài khoản Google của trưởng nhóm.
 * Tài khoản chạy script trở thành chủ sở hữu biểu mẫu và xem được điểm/câu trả lời.
 */
function createNetworkQuiz() {
  const form = FormApp.create('PBL4 — Kiểm tra nền tảng Mạng, Subnet và AWS');
  form
    .setDescription(
      'Bài kiểm tra 50 câu dành cho nhóm PBL4. Nội dung: mạng căn bản, TCP/IP, ' +
      'DNS/HTTP/HTTPS, CIDR, bài tập chia subnet, VPC và luồng mạng của dự án.\n\n' +
      'Mỗi câu 1 điểm. Hãy tự làm, không xem tài liệu trong lần đầu. Sau khi nộp, ' +
      'ghi lại các chủ đề còn yếu để cả nhóm học lại.'
    )
    .setIsQuiz(true)
    .setCollectEmail(true)
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setConfirmationMessage('Đã ghi nhận bài làm. Trưởng nhóm sẽ xem kết quả và tổng hợp phần kiến thức cần củng cố.');

  form.addTextItem()
    .setTitle('Họ và tên')
    .setRequired(true);

  const sections = [
    {
      title: 'Phần 1 — Nền tảng mạng',
      description: '10 câu nhận biết và thông hiểu về địa chỉ, thiết bị và giao tiếp mạng.',
      questions: [
        ['Mục đích chính của mạng máy tính là gì?', ['Chỉ để tăng tốc CPU', 'Cho phép các thiết bị trao đổi dữ liệu và chia sẻ tài nguyên', 'Chỉ để lưu mật khẩu', 'Thay thế hệ điều hành'], 1],
        ['Địa chỉ IP dùng để làm gì?', ['Nhận diện một giao diện mạng và hỗ trợ định tuyến gói tin', 'Nhận diện duy nhất một người dùng trên toàn thế giới', 'Mã hóa dữ liệu', 'Đo tốc độ CPU'], 0],
        ['Một địa chỉ IPv4 có độ dài bao nhiêu bit?', ['16 bit', '32 bit', '64 bit', '128 bit'], 1],
        ['Dải nào sau đây là dải IPv4 private?', ['8.8.8.0/24', '11.0.0.0/8', '172.16.0.0/12', '1.1.1.0/24'], 2],
        ['Địa chỉ 127.0.0.1 thường có ý nghĩa gì?', ['Default gateway', 'Địa chỉ broadcast', 'Loopback của chính máy đang dùng', 'DNS công cộng'], 2],
        ['Địa chỉ MAC hoạt động chủ yếu ở tầng nào của mô hình OSI?', ['Tầng vật lý', 'Tầng liên kết dữ liệu', 'Tầng mạng', 'Tầng ứng dụng'], 1],
        ['Thiết bị nào có nhiệm vụ định tuyến gói tin giữa các mạng IP khác nhau?', ['Hub', 'Switch Layer 2', 'Router', 'Repeater'], 2],
        ['Switch Layer 2 thường chuyển frame dựa chủ yếu vào thông tin nào?', ['Địa chỉ MAC', 'Tên miền DNS', 'Số port TCP', 'HTTP status code'], 0],
        ['Trong TCP/IP, port giúp xác định điều gì?', ['Quốc gia của máy gửi', 'Ứng dụng hoặc dịch vụ trên một host', 'Địa chỉ MAC của router', 'Kích thước subnet'], 1],
        ['Default gateway được dùng khi nào?', ['Khi đích nằm ngoài mạng cục bộ của host', 'Khi đổi tên file', 'Khi giải nén dữ liệu', 'Chỉ khi dùng Bluetooth'], 0]
      ]
    },
    {
      title: 'Phần 2 — TCP/IP, DNS và Web',
      description: '10 câu gắn trực tiếp với đường đi của request đến website PBL4.',
      questions: [
        ['Đặc điểm nào phù hợp nhất với TCP?', ['Không thiết lập kết nối và không đảm bảo thứ tự', 'Có kết nối, kiểm soát lỗi và đảm bảo thứ tự dữ liệu', 'Chỉ dùng cho DNS', 'Không sử dụng port'], 1],
        ['So với TCP, UDP thường có đặc điểm nào?', ['Luôn chậm hơn TCP', 'Không có bước bắt tay kết nối và có overhead thấp hơn', 'Luôn đảm bảo gói tin đến đúng thứ tự', 'Không hoạt động trên Internet'], 1],
        ['DNS chủ yếu thực hiện công việc gì?', ['Chuyển tên miền thành địa chỉ IP và trả các bản ghi liên quan', 'Mã hóa ổ đĩa', 'Chia subnet', 'Lưu access log'], 0],
        ['HTTP thuộc tầng nào trong mô hình TCP/IP?', ['Tầng liên kết', 'Tầng Internet', 'Tầng giao vận', 'Tầng ứng dụng'], 3],
        ['HTTPS được hiểu đúng nhất là gì?', ['HTTP chạy qua TLS để bảo vệ dữ liệu truyền', 'HTTP dùng port 22', 'Một loại database', 'Một giao thức chỉ dùng trong VPC'], 0],
        ['HTTP method GET thường được dùng để làm gì?', ['Yêu cầu đọc/lấy một tài nguyên', 'Bắt buộc xóa dữ liệu', 'Thiết lập TCP', 'Tra cứu địa chỉ MAC'], 0],
        ['HTTP method POST thường được dùng để làm gì?', ['Gửi dữ liệu đến server để xử lý', 'Tra cứu DNS', 'Đóng port', 'Tạo subnet'], 0],
        ['Bộ mã trạng thái nào được ghép đúng?', ['200: thành công; 404: không tìm thấy; 500: lỗi phía server', '200: lỗi; 404: thành công; 500: chuyển hướng', '200: DNS; 404: TLS; 500: TCP', 'Tất cả đều là mã thành công'], 0],
        ['Bộ port mặc định nào đúng?', ['SSH 21; HTTP 25; HTTPS 53', 'SSH 22; HTTP 80; HTTPS 443', 'SSH 80; HTTP 443; HTTPS 22', 'SSH 53; HTTP 3306; HTTPS 5044'], 1],
        ['Thứ tự bắt tay TCP ba bước đúng là gì?', ['ACK → SYN → FIN', 'SYN → SYN-ACK → ACK', 'GET → POST → ACK', 'DNS → HTTP → TLS'], 1]
      ]
    },
    {
      title: 'Phần 3 — CIDR và subnet căn bản',
      description: '10 câu về prefix, subnet mask, network address và broadcast address.',
      questions: [
        ['Subnet mask tương ứng với /24 là gì?', ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.252'], 2],
        ['Một mạng IPv4 /24 chứa tổng cộng bao nhiêu địa chỉ?', ['128', '254', '256', '512'], 2],
        ['Theo cách tính subnet truyền thống, mạng /24 có bao nhiêu địa chỉ host dùng được?', ['252', '254', '255', '256'], 1],
        ['Network address của 192.168.1.87/24 là gì?', ['192.168.0.0', '192.168.1.0', '192.168.1.87', '192.168.1.255'], 1],
        ['Broadcast address của mạng 192.168.1.0/24 là gì?', ['192.168.1.0', '192.168.1.1', '192.168.1.254', '192.168.1.255'], 3],
        ['Một subnet /26 có tổng cộng bao nhiêu địa chỉ IPv4?', ['32', '62', '64', '126'], 2],
        ['Bước nhảy (block size) ở octet cuối của subnet /27 là bao nhiêu?', ['8', '16', '32', '64'], 2],
        ['Theo cách tính truyền thống, một subnet /28 có bao nhiêu host dùng được?', ['6', '14', '16', '30'], 1],
        ['Khi prefix tăng từ /24 lên /27, kích thước mỗi subnet thay đổi thế nào?', ['Subnet lớn hơn', 'Subnet nhỏ hơn', 'Không thay đổi', 'Chuyển thành IPv6'], 1],
        ['Mục đích chính của subnetting là gì?', ['Chia một mạng IP thành các mạng nhỏ phù hợp hơn', 'Mã hóa packet', 'Đổi HTTP thành HTTPS', 'Tăng dung lượng ổ đĩa'], 0]
      ]
    },
    {
      title: 'Phần 4 — Bài tập tính subnet',
      description: '10 bài tính network, broadcast, dải host và chọn prefix.',
      questions: [
        ['IP 192.168.10.70/26 thuộc subnet nào?', ['192.168.10.0/26', '192.168.10.32/26', '192.168.10.64/26', '192.168.10.128/26'], 2],
        ['Broadcast address của subnet chứa IP 192.168.10.70/26 là gì?', ['192.168.10.63', '192.168.10.64', '192.168.10.126', '192.168.10.127'], 3],
        ['Dải host dùng được của subnet chứa IP 192.168.10.70/26 là gì?', ['192.168.10.1–192.168.10.62', '192.168.10.64–192.168.10.127', '192.168.10.65–192.168.10.126', '192.168.10.129–192.168.10.190'], 2],
        ['IP 10.0.1.200/27 thuộc subnet nào?', ['10.0.1.160/27', '10.0.1.192/27', '10.0.1.200/27', '10.0.1.224/27'], 1],
        ['Broadcast address của subnet chứa IP 10.0.1.200/27 là gì?', ['10.0.1.207', '10.0.1.215', '10.0.1.223', '10.0.1.255'], 2],
        ['IP 172.16.5.130/25 thuộc subnet nào?', ['172.16.5.0/25', '172.16.5.64/25', '172.16.5.128/25', '172.16.5.130/25'], 2],
        ['Theo cách tính truyền thống, một subnet /25 có bao nhiêu host dùng được?', ['62', '126', '128', '254'], 1],
        ['Cần một subnet chứa ít nhất 50 host dùng được. Prefix nhỏ nhất phù hợp là gì?', ['/27', '/26', '/25', '/24'], 1],
        ['Cần một subnet chứa ít nhất 20 host dùng được. Prefix nhỏ nhất phù hợp là gì?', ['/29', '/28', '/27', '/26'], 2],
        ['Muốn chia mạng /24 thành 4 subnet bằng nhau, prefix mới là gì?', ['/25', '/26', '/27', '/28'], 1]
      ]
    },
    {
      title: 'Phần 5 — VPC, Security Group và mạng của PBL4',
      description: '10 câu áp dụng kiến thức mạng vào kiến trúc AWS và ELK của nhóm.',
      questions: [
        ['Phát biểu nào đúng về phạm vi của một AWS VPC?', ['VPC chỉ thuộc một subnet', 'VPC thuộc một Region và có thể chứa subnet ở nhiều AZ trong Region đó', 'VPC luôn thuộc toàn bộ các Region', 'VPC chỉ tồn tại trong một EC2'], 1],
        ['Phát biểu nào đúng về subnet trong AWS?', ['Một subnet có thể trải qua nhiều AZ', 'Một subnet phải nằm hoàn toàn trong một AZ', 'Subnet không có CIDR', 'Mọi subnet đều là private'], 1],
        ['Điều gì làm một subnet IPv4 trở thành public subnet?', ['Tên subnet có chữ public', 'Có route trực tiếp 0.0.0.0/0 đến Internet Gateway', 'Có nhiều EC2', 'Có Security Group'], 1],
        ['Private subnet được hiểu đúng nhất là gì?', ['Subnet không có route trực tiếp đến Internet Gateway', 'Subnet không có địa chỉ private', 'Subnet không dùng route table', 'Subnet luôn miễn phí'], 0],
        ['Security Group của AWS có đặc điểm nào?', ['Stateless và bắt buộc tạo luật cho traffic trả lời', 'Stateful: traffic trả lời cho kết nối được phép được tự động cho qua', 'Chỉ bảo vệ toàn bộ subnet', 'Có luật deny tường minh'], 1],
        ['Network ACL của AWS khác Security Group ở điểm nổi bật nào?', ['NACL là stateful', 'NACL hoạt động cấp subnet và là stateless', 'NACL chỉ dùng cho HTTPS', 'NACL lưu access log Nginx'], 1],
        ['Trong kiến trúc PBL4, Filebeat gửi log tới Logstash qua port nào?', ['22', '443', '5044', '5601'], 2],
        ['Luồng EC2-WEB gửi log tới EC2-ELK trong cùng VPC nên ưu tiên địa chỉ nào?', ['Private IP của EC2-ELK', 'Broadcast address', '127.0.0.1 của EC2-WEB', 'Địa chỉ MAC của laptop'], 0],
        ['Loại IP nào thường không thể định vị quốc gia/thành phố bằng GeoIP công cộng?', ['Public IPv4', 'Private IPv4 như 10.0.1.10', 'IP của người dùng Internet', 'IP của máy chủ DNS công cộng'], 1],
        ['Luồng xử lý log nào đúng với thiết kế PBL4?', ['Nginx → Filebeat → Logstash → Elasticsearch → Kibana', 'Kibana → Nginx → DNS → MariaDB', 'Elasticsearch → Filebeat → Nginx → Logstash', 'MariaDB → Kibana → HTTP → DNS'], 0]
      ]
    }
  ];

  sections.forEach(function(section) {
    form.addPageBreakItem()
      .setTitle(section.title)
      .setHelpText(section.description);

    section.questions.forEach(function(question) {
      const title = question[0];
      const options = question[1];
      const answerIndex = question[2];
      const item = form.addMultipleChoiceItem();
      item
        .setTitle(title)
        .setChoices(options.map(function(option, index) {
          return item.createChoice(option, index === answerIndex);
        }))
        .setRequired(true)
        .setPoints(1);
    });
  });

  const result = {
    editUrl: form.getEditUrl(),
    quizUrl: form.getPublishedUrl(),
    questionCount: 50,
    totalPoints: 50
  };

  console.log(JSON.stringify(result));
  Logger.log(JSON.stringify(result));
  return result;
}
