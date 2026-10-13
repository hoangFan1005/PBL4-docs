# Kiểm tra và quyết định review trước xuất bản

> Bản tài liệu public trên nhánh `baocaolan1` của PBL4-docs. Link đọc code/bằng chứng chi tiết trỏ đến repo **PBL4-demo private**, cần quyền truy cập; clone repo tài liệu không có app/scripts để chạy các lệnh. Bộ tài liệu này không công bố credentials, log thô hay runtime riêng. Các ví dụ và số liệu lab không phải cam kết production.

Ngày 13/10/2026. Mục đích: lưu mốc tiến độ, code AWS đã triển khai, tài liệu học và phân công lên nhánh `bao-cao-tien-do-lan-1`. Không deploy hoặc bật EC2 trong task xuất bản này.

## Phạm vi

- Giữ source base `50fea813fa3b35a1b0c4d5a96e374e1af46ce13d`, thêm phần AWS/helper/tests và bộ báo cáo.
- Chỉ stage các file source/test/tài liệu được chọn; không stage `.env`, credentials, private keys, `.runtime` hoặc log thô. Evidence cũ trong lịch sử Git không được tuyên bố đã review lại toàn bộ ở task này.
- Kiểm JSON, link tương đối của Markdown mới, generator/template tương đương và cú pháp từng Bash script; quét pattern credentials có độ tin cậy cao trong file được chọn. Không gọi phép quét này là audit privacy runtime đầy đủ.
- Workflow CI hiện chỉ auto-trigger push trên `demo/local-mvp` và `demo/live-acceptance`; nhánh báo cáo này không tự chạy CI đầy đủ. Kết quả source test dưới đây là local, không phải CI của nhánh mới.

## Gemini và quyết định của Codex

Review global chạy SUCCESS trong 297,25 giây, ngày 13/10. Phạm vi đúng bốn file: `infra/aws/demo.py`, `scripts/verify/preflight.py`, `tests/tooling/test_aws_demo.py`, `tests/tooling/test_preflight.py`. Các source hạ tầng khác có hai vòng review từ task AWS trước, được ghi tại [AWS deployment](https://github.com/hoangFan1005/PBL4-demo/blob/1de188527799033647415e269093e1d266bbe839/docs/aws-deployment.md); không suy phạm vi này thành whole-project review.

| Nhận xét | Đối chiếu và quyết định |
|---|---|
| Thiếu import json/sys gây NameError | Bác bỏ: source thực tế có `import json` và `import sys`; parse/import helper và bộ test thực chạy thành công. Excerpt reviewer trích không khớp file |
| Backslash trong file:// không được AWS CLI hỗ trợ | Bác bỏ: phép thử local `ec2 describe-instances --generate-cli-skeleton output` với đường Windows backslash và region đã load file thành công; không gọi API AWS. Lượt STS skeleton lỗi validation ở Arn giả của output skeleton, không phải lỗi đọc file |
| TimeUnit CUSTOM không hợp lệ | Bác bỏ: [AWS Budget API](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Budget.html) liệt kê CUSTOM; task AWS trước đã create/readback budget thực |
| Outputs có thể chưa tồn tại | Chấp nhận: helper hiện báo lỗi rõ và chặn vận hành khi thiếu một trong hai instance outputs |
| Archive không kiểm symlink/đường Windows/traversal | Chấp nhận: chỉ cho regular file/directory, chặn link/device, đường absolute/drive/backslash/parent traversal; mở rộng chặn file env/key và chặn source=target trước khi ghi |
| Các action thiếu tham số vẫn chạy rồi lỗi | Chấp nhận: argparse kiểm tham số theo action trước mọi AWS call; exit 2 với hướng dẫn |
| Hardcoded AWS CLI Windows | Giữ trong phạm vi helper cho máy Windows đã triển khai; tài liệu nêu rõ yêu cầu cấu hình. Chưa nhận portable Linux/macOS |
| Không có test helper | Chấp nhận: thêm 5 test hồi quy cho tham số/outputs/archive, hoàn toàn offline |
| read_text không explicit UTF-8 | Ghi nhận rủi ro portability; file script/template hiện là ASCII và bộ test Windows đạt. Thêm UTF-8 khi ghi payload mới; chưa thay toàn bộ IO của dự án |
| Test split heredoc dễ vỡ khi đổi format | Giữ: test kiểm script hiện tại; text-mode read chuẩn hóa newline. Đổi cấu trúc heredoc sau này cần cập nhật test cùng code |

Codex sửa các finding được xác nhận rồi chạy lại regression. Không thực hiện vòng Gemini thứ hai cho bản sửa; không gọi bản sau sửa là đã được Gemini review lại.

## Regression sau sửa

```text
python -m unittest discover -s tests/tooling -q
python -m unittest discover -s tests/pipeline -q
python -m unittest discover -s tests/detection -q
```

Kết quả: **281 tooling tests OK (2 skipped), 14 pipeline OK, 18 detection OK**. Tổng 313 tests, 2 skipped. Bộ AWS gồm 13 tests, 5 test helper mới. Đây là kiểm source/offline; không chạy lại acceptance 30 phút hoặc browser AWS.

## Gate vẫn mở

Browser/map và display latency trên AWS; human dry-run; audit privacy L09; domain/HTTPS; hiệu chỉnh ngưỡng/tải/vận hành trước final. Gói summary trích từ phiên AWS ngày 12/10 không đóng những gate này.
