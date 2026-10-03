# Kho local — 0.3.0-alpha.1

## Cài và thiết lập

```sh
npm ci
npm run build
npm run start:local
```

Hoặc `docker compose up -d --build`. Mở `http://localhost:8080`. Lần đầu tạo một
quản trị viên với tên 3–40 ký tự (chữ, số, `_`, `.`, `-`) và mật khẩu 12–128 ký tự.
Không có password mặc định hoặc tài khoản trung tâm. Ghi lại thông tin đăng nhập:
bản alpha chưa có email khôi phục mật khẩu. Thiết lập trên localhost trước khi
cấu hình cho người khác truy cập.

## Dữ liệu

Node mặc định dùng `data/`; Docker dùng `/app/data` trong named volume `archive-data`.

```text
data/
  archive.sqlite          Hồ sơ, nguồn, lịch sử, password hash và session
  archive.sqlite-wal      SQLite WAL (có thể tồn tại khi đang chạy)
  archive.sqlite-shm      SQLite shared memory (có thể tồn tại)
  blobs/<sha256>          Nội dung tệp, tên lưu không do người upload chọn
```

Không đặt thư mục này trong `dist/`; server từ chối cấu hình đó. Chỉ chạy một process
local server cho mỗi thư mục dữ liệu. Bảo vệ thư mục bằng quyền hệ điều hành/ổ đĩa;
dữ liệu không được mã hóa at rest bởi ứng dụng.

## Dùng kho

1. Tạo hồ sơ: tên, chủ đề, tóm tắt, nội dung văn bản thuần và nguồn dẫn.
2. Chỉnh sửa tạo snapshot mới. Nếu phiên bản đang sửa cũ hơn server, thao tác trả
   xung đột; tải lại để đọc thay đổi mới, không tự ghi đè.
3. Upload tư liệu riêng, tối đa **25 MiB/tệp**. Download cần phiên đăng nhập.
4. Tệp luôn tải dưới dạng attachment; không render HTML/SVG/PDF tùy ý trong origin
   ứng dụng. Chưa có quét mã độc, OCR, redaction hoặc chuyển mã video.
5. Lịch sử giữ nội dung và nguồn dẫn. Xóa tư liệu gỡ tệp hiện tại; lịch sử không giữ
   bản tệp đã xóa. Xóa hồ sơ cũng xóa các snapshot và tư liệu liên quan.

Trạng thái `reviewed` nghĩa là đã đối chiếu **nội bộ**, không phải chứng nhận pháp lý
hoặc trạng thái đã xuất bản. Nút **Đóng góp** tạo một bản sao chọn lọc, có bước xem
trước và xác nhận gửi riêng. Xem [COMMUNITY_SETUP](COMMUNITY_SETUP.md).

## Backup di động qua giao diện

“Sao lưu kho” xuất file `.hsd.json`, định dạng `ho-so-den.archive`, version 1:

- Tất cả hồ sơ, nguồn và lịch sử nội dung hiện có.
- Tệp hiện tại, metadata và SHA-256; dữ liệu tệp mã hóa base64, **không mã hóa bảo mật**.
- Không bao gồm tài khoản quản trị, password hash, cookie, session, kết nối/khóa,
  gói outbox, hàng đợi cộng đồng, audit events hoặc public snapshots.

Giới hạn alpha: **100 MiB** file JSON, **60 MiB** tổng tư liệu và **10.000** mục
mỗi loại (hồ sơ, phiên bản, attachment). Giới hạn giữ thao tác import/export trong
bộ nhớ có kiểm soát; dùng sao lưu filesystem cho kho lớn hơn.

Để phục hồi:

1. Tạo instance mới với thư mục/volume dữ liệu mới.
2. Thiết lập quản trị viên ở instance đích.
3. Chọn “Khôi phục”, chọn backup và xác nhận nhập vào instance này.
4. Server chỉ nhận **kho trống**, kiểm tra schema, IDs, phiên bản, kích thước và
   hash trước khi commit. Backup hỏng không tạo hồ sơ dở dang hoặc ghi đè dữ liệu.
5. Kiểm tra hồ sơ và tải thử tệp; tài khoản đích vẫn giữ nguyên.

Đây là portable archive backup, không phải backup toàn bộ cấu hình/máy chủ.

## Backup đầy đủ trên ổ đĩa

Để giữ cả quản trị viên, cấu hình SQLite và toàn bộ tư liệu, **dừng server** rồi sao
chép toàn thư mục data (không chỉ riêng file `.sqlite`). Với Docker, dừng service
`archive` và sao lưu toàn bộ named volume bằng công cụ quản lý Docker/backup của bạn.
Khôi phục vào thư mục/volume riêng, giữ quyền đọc/ghi cho UID của container (`node`).
Không phục hồi đè lên instance đang chạy. Bản này chưa có nút restore toàn volume.

`docker compose down` giữ volume. `docker compose down -v` xóa nó. Các backup đã
xuất trước đó vẫn chứa dữ liệu tại thời điểm xuất, kể cả hồ sơ sau đó bị xóa.

## Cấu hình

- `HOST`: bind address, Node mặc định `127.0.0.1`; Docker bind trong container.
- `PORT`: port server, mặc định `8080`.
- `PREVIEW_PORT`: port host Docker Compose (tên giữ tương thích bản trước).
- `HSD_DATA_DIR`: thư mục riêng ngoài web root; Node mặc định `data/`.
- `HSD_ORIGIN`: origin chính xác như `https://archive.example.com`, không dấu `/`
  cuối. Cần khi dùng LAN/reverse proxy. Mặc định chỉ chấp nhận Host loopback.

Không tin `X-Forwarded-*` do client gửi. Reverse proxy phải giữ Host đúng với
`HSD_ORIGIN`. Khi origin là HTTPS, cookie có `Secure`. Bản alpha dành cho một quản trị
viên trên instance riêng, chưa có multi-user roles hoặc production hardening audit.

Session có thời hạn cố định 7 ngày, cookie HttpOnly/SameSite=Strict, chỉ lưu hash
token trong SQLite. Logout thu hồi session. Sau 10 lần đăng nhập trong 15 phút từ
cùng IP, phải chờ cửa sổ giới hạn; bộ đếm rate limit nằm trong bộ nhớ process.

Schema SQLite hiện là v2. Nâng từ v1 thêm bảng đóng góp và namespace cookie;
cần đăng nhập lại sau nâng cấp. Sao lưu toàn data trước khi nâng; phần mềm cũ không
mở được schema mới. HSD_MODE/HSD_ALLOW_HTTP_PEERS/HSD_INTAKE_HOSTS được mô tả trong
hướng dẫn community.

## Preview vẫn độc lập

`npm run start:preview` chạy website tĩnh với fixture. `local.html` trên GitHub Pages
chỉ hướng dẫn tự host, không gọi API hoặc dò máy local của khách truy cập. Preview
OTP `123456` không phải phương thức đăng nhập local.
