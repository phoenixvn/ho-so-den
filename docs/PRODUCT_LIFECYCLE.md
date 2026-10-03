# Vòng đời sản phẩm Hồ Sơ Đen

## Nguyên tắc đánh giá

Đánh giá bằng khả năng người dùng thực hiện được và bằng chứng nghiệm thu, không
theo số màn hình hoặc số dòng code. Mỗi milestone có thể gồm phần alpha đã chạy và
phần production còn thiếu; không đánh dấu cả milestone xong vì đã có happy path.

Sổ hiện trạng: [PROJECT_STATUS.md](PROJECT_STATUS.md). Checklist phạm vi:
[ROADMAP.md](../ROADMAP.md). Đối chiếu code: [REQUIREMENTS.md](REQUIREMENTS.md).

## Các giai đoạn

### A. Định hướng và khám phá

Chốt đối tượng sử dụng, local-first, quyền sở hữu dữ liệu, bản sao đóng góp và
ranh giới công bố. Đầu ra là các quyết định có thể truy ra lý do và tiêu chí.
Không cần blockchain để đọc/lưu hồ sơ riêng. Việt Nam là phạm vi ngôn ngữ/nội dung
đầu tiên; mã nguồn mở không biến tư liệu của người dùng thành dữ liệu mở.

### B. Prototype và phản hồi

Thiết kế wiki/sổ đen, Trang giấy/Mực đêm, nguồn dẫn và lịch sử. Dùng fixture hư cấu,
mock phải được ghi rõ. Điều kiện qua giai đoạn: luồng đọc/dẫn nguồn dùng được và
trải nghiệm mobile/bàn phím đã kiểm tra. Các tag `v0.1.0-alpha.*` thuộc giai đoạn này.

### C. Local alpha

Điều kiện: cài riêng → tạo admin → tạo/sửa hồ sơ → thêm tệp → restart không mất
dữ liệu → backup/restore sang instance mới. Có thông tin giới hạn và hướng dẫn
phục hồi. Mốc này đã triển khai trong code; không suy ra đã nghiệm thu NAS/ARM64,
multi-user, media processing hoặc production hardening.

### D. Community alpha

Điều kiện: chọn bản sao → xem trước → gửi có xác nhận → tiếp nhận riêng → duyệt
→ công bố riêng → trả trạng thái/link. Test thêm retry trùng, key isolation,
revocation, stale review, withdrawal và local không bị ghi đè. Implementation
hiện dùng SQLite/một admin mỗi instance; đó là luồng end-to-end alpha, không phải
hệ thống cộng đồng PostgreSQL/OTP hoàn chỉnh.

### E. Beta vận hành có kiểm soát — chưa đạt

Trước beta cần xác định phạm vi người dùng và tải thực tế; hoàn thiện các hạng mục
phù hợp từ backlog: retention/purge, xử lý tệp, khôi phục mật khẩu, roles/OTP,
backup đầy đủ, quan sát lỗi, cập nhật và rollback. Tính năng công bố phải có quy
trình nguồn/quyền sử dụng/đính chính do operator thực hiện. Kiểm thử bằng fixture
trước; không coi dữ liệu thật là công cụ stress test.

### F. Production — chưa đạt

Cần kết quả beta, quy trình vận hành và phạm vi hỗ trợ rõ ràng; kiểm tra phục hồi,
nâng cấp dữ liệu và các integration thực tế. Owner/operator quyết định đưa dịch vụ
lên production; AI không tự đổi nhãn maturity hoặc mở dịch vụ chỉ vì CI xanh.

Solana/IPFS và Cryptomus là các mô-đun phát hành độc lập: phải có cấu hình thật,
failure/retry tests và trạng thái phản ánh provider thật trước khi gọi là hoạt động.
NFT không cấp thẩm quyền biên tập hoặc xác nhận một người có tội.

### G. Bảo trì, migration và ngừng hỗ trợ

- Ghi phiên bản được hỗ trợ trong `SECURITY.md` và release notes.
- Version hóa schema/protocol; mô tả khả năng nâng/hạ phiên bản và backup bắt buộc.
- Sửa lỗi bằng commit/release mới, giữ lịch sử công khai; không rewrite tag.
- Deprecation phải có đường xuất dữ liệu/chuyển phiên bản, không ép upload central.
- Xóa/rút công bố phải nói rõ phạm vi: không thu hồi được bản đã tải hoặc lưu bên ngoài.

## Từ vựng trạng thái bắt buộc

- **Planned:** đã chọn hướng, chưa có implementation.
- **In progress:** đang làm; có thể chưa build/test.
- **Implemented:** đã có code cho phạm vi đã nêu, chưa mặc nhiên được kiểm thử.
- **Verified:** đã chạy kiểm tra cụ thể; gắn command/môi trường/commit hoặc CI run.
- **Pushed:** commit đã tồn tại trên remote đúng repo/branch.
- **Preview deployed:** artifact tĩnh được hosting và đã kiểm tra URL.
- **Released:** có tag/release notes/artifact tương ứng; ghi alpha/beta/stable.
- **Production enabled:** dịch vụ runtime thật đã được operator triển khai trong
  phạm vi hỗ trợ; không suy ra từ bất kỳ trạng thái nào ở trên.

`package.json` chứa `0.3.0-alpha.1` không có nghĩa đã có tag cùng tên. Push `main`
không phát hành container registry hoặc triển khai database lên GitHub Pages.

## Ưu tiên sau checkpoint hiện tại

1. Production retention/purge với idempotency tombstones và key rotation.
2. Luồng đính chính/public version linkage, chỉnh nguồn trong review và cải thiện quản trị.
3. Xác định scope beta: PostgreSQL/object storage, OTP/roles và upload resumable.
4. Tích hợp Solana/IPFS và Cryptomus theo tiêu chí riêng; giữ local độc lập.

Đây là thứ tự đề xuất, không phải quyền tự triển khai mọi hạng mục. Task người dùng
và quyết định được ghi nhận mới xác định phạm vi phiên làm việc tiếp theo.
