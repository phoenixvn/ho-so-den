# Đối chiếu yêu cầu — 0.3.0-alpha.1 (development)

## Kết luận

**Đã có local core và luồng đóng góp–duyệt–xuất bản giữa hai instance SQLite,
một quản trị viên mỗi bên. Chưa đủ phạm vi production toàn nền tảng.** Website Pages tiếp
tục là preview tĩnh, không được nhầm với kho local.

## Đã triển khai

- UI hai theme, kho preview và giao diện quản trị local riêng.
- Thiết lập quản trị viên một lần, password hash, phiên đăng nhập/logout thật.
- SQLite schema v2/WAL, CRUD hồ sơ, nguồn và lịch sử snapshot; migration v1 → v2.
- Xung đột revision không tự ghi đè; tìm theo tên/tóm tắt/chủ đề.
- Upload tệp riêng trên ổ đĩa, hash SHA-256, download có xác thực, xóa tệp/hồ sơ.
- Tồn tại qua restart; Docker persistent volume.
- Backup portable gồm hồ sơ/nguồn/lịch sử/tệp hiện tại; restore vào kho trống,
  kiểm tra cấu trúc, version và checksum, không thay tài khoản của instance đích.
- Host/origin/CSRF checks, session token hash và login throttling.
- Mã nguồn mở AGPL, font tại chỗ, không analytics hay tự gửi dữ liệu.
- Kết nối peer do admin cấu hình, khóa đóng góp có thể thu hồi.
- Chọn tệp/body/nguồn, tạo bản sao cố định, xem trước và xác nhận hash trước khi gửi.
- Tiếp nhận riêng, idempotent retry, status chỉ thuộc khóa người gửi.
- Duyệt có revision check, biên tập bản riêng, xuất bản bằng xác nhận thứ hai,
  public reader và rút lại; không ghi đè local.

## Giới hạn local alpha

- Một quản trị viên, một process cho mỗi data directory; chưa có phân quyền nhóm.
- Tệp 25 MiB; backup trình duyệt 100 MiB JSON / 60 MiB tư liệu / 10.000 mục mỗi loại.
- Chưa quét mã độc, redaction, OCR hoặc chuyển mã/phát video.
- Snapshot lưu nội dung/nguồn; không khôi phục tệp đã xóa từ lịch sử.
- Portable backup không mã hóa, không chứa credentials. Backup toàn instance là
  sao chép filesystem khi dừng server, chưa có UI phục hồi volume.
- NAS/ARM64 chưa được nghiệm thu; chưa có reset password qua email.

## Chưa đáp ứng — phần cộng đồng

- PostgreSQL/object storage cộng đồng, OTP email thật, vai trò contributor/reviewer.
- Upload tiếp tục theo chunk, key rotation, retention/purge và quota production.
- Nhiều reviewer, kháng nghị/đính chính liên kết phiên bản công bố, sửa nguồn trong review UI.
- Solana program, indexer, IPFS pinning và xác minh công khai.
- Cryptomus invoice/webhook/đối soát, NFT người bảo trợ.

## Bằng chứng kiểm tra

`npm test`: HTTP preview + local API, bao gồm auth, CSRF, private download,
restart, revision conflict, backup/restore sang instance mới, backup hỏng, xóa
blob dùng chung, logout và throttling. `npm run test:e2e`: các luồng preview và
local từ first-run đến tạo/sửa/upload/backup/restore trên trình duyệt.

```sh
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:e2e
docker compose up -d --build --wait
```

Luồng hai instance đã được kiểm thử cả API và browser: chọn gói, xem trước, gửi,
retry, duyệt riêng, công bố, nhận lại trạng thái/link và rút lại. Test còn kiểm tra
khóa khác không xem được trạng thái, thu hồi khóa, payload sai hash và peer redirect.
Tính năng production chưa có không được suy ra từ các bài kiểm tra alpha này.
