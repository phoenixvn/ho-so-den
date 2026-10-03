# Hai instance: local → community (0.3 alpha)

Một người giữ hồ sơ riêng và chọn một bản sao để gửi. Một instance khác nhận vào
hàng đợi riêng, quản trị viên biên tập, duyệt rồi chủ động xuất bản. Dữ liệu gốc
không bị thay đổi. Đây là alpha SQLite/single-admin; chưa phải dịch vụ cộng đồng
nhiều người dùng có OTP hoặc PostgreSQL.

## Docker demo

```sh
docker compose -f compose.yaml -f compose.community.yaml up -d --build
```

Hai volume độc lập: `archive-data` và `community-data`. Local mặc định cổng 8080,
community cổng 8099, đều bind loopback. Dùng `PREVIEW_PORT` và `COMMUNITY_PORT` để đổi.
Không dùng `down -v` nếu còn cần dữ liệu.

1. Mở local, tạo quản trị viên nếu chưa có.
2. Mở `http://localhost:8099/local.html`, tạo quản trị viên của community.
3. Community → **Bàn biên tập** → **Cấp khóa đóng góp**. Khóa chỉ hiện một lần.
4. Local → **Đóng góp / Kết nối** → **Thêm kết nối**:
   - Origin máy nhận: `http://community:8080` (hostname trong Docker network).
   - Origin để mở bản công bố: `http://localhost:8099` (địa chỉ trình duyệt).
   - Dán khóa riêng vừa cấp. Lưu cấu hình không gửi hồ sơ hoặc gọi máy nhận.
5. Mở hồ sơ local → **Đóng góp**. Tệp, nội dung ghi chép và nguồn đều mặc định bỏ chọn.
   Tên, tóm tắt, chủ đề luôn nằm trong gói và được trình bày ở bước xem trước.
6. Nhập tên ghi nhận tùy chọn và căn cứ quyền công bố. Tạo gói để xem nội dung,
   file metadata và hash. Gói này là bản sao cố định trong outbox riêng.
7. Xác nhận gửi tới đúng origin. Máy nhận trả biên nhận; chưa có dữ liệu công khai.
8. Community mở gói, kiểm tra nguồn/quyền công bố và tải tệp riêng khi cần. Có thể
   chỉnh tiêu đề/tóm tắt/nội dung, tên ghi nhận và chọn lại tệp được công bố.
9. **Duyệt** chỉ chuyển sang approved. Bấm **Xuất bản công khai** kèm xác nhận riêng
   mới tạo public snapshot tại `community.html`.
10. Local bấm **Cập nhật trạng thái** để nhận trạng thái, phản hồi và public link.

Cookies đặt tên riêng theo instance, tránh ghi đè phiên khi hai instance dùng
cùng hostname nhưng khác port. Mỗi bên có tài khoản và session độc lập.

## Chạy bằng Node

Chạy hai terminal với hai thư mục dữ liệu khác nhau. Ví dụ PowerShell:

```powershell
# Terminal local
$env:PORT = '8080'
$env:HSD_MODE = 'local'
$env:HSD_DATA_DIR = 'C:\hsd-private\local'
npm start
```

```powershell
# Terminal community
$env:PORT = '8099'
$env:HSD_MODE = 'community'
$env:HSD_DATA_DIR = 'C:\hsd-private\community'
npm start
```

Kết nối local tới `http://127.0.0.1:8099`; không cần allowlist nội bộ Docker.
Với Internet, dùng HTTPS ổn định và cấu hình `HSD_ORIGIN` của máy nhận.

## Cấu hình mạng bổ sung

- `HSD_MODE=local|community`: chọn chức năng instance.
- `HSD_ALLOW_HTTP_PEERS`: origin HTTP cho phép, cách nhau bằng dấu phẩy. Mặc định
  rỗng, chỉ HTTPS hoặc loopback được nhận. Docker override chủ động cho phép đúng
  `http://community:8080`.
- `HSD_INTAKE_HOSTS`: host alias chỉ cho intake server-to-server. Docker override
  cho phép `community:8080`; không mở đăng nhập quản trị qua alias đó.
- `HSD_ORIGIN`: origin quản trị/public khi triển khai ngoài loopback.

Không follow redirect khi gửi token/gói tới peer. Timeout 15 giây. URL peer do
admin chọn; app không tự dò mạng hoặc fetch các URL nguồn trong hồ sơ.

## Retry, quyền và bản sao

- Cùng khóa + submission ID + payload hash trả cùng biên nhận. Đổi nội dung dưới
  cùng ID bị từ chối. Khi chưa rõ kết quả, thử lại chính gói đó, không tạo gói mới.
- Gói cũ giữ bản đã chọn dù hồ sơ/tệp gốc được chỉnh hoặc xóa sau đó.
- Khóa đóng góp chỉ gửi và đọc trạng thái của gói thuộc khóa đó; không xem hàng
  đợi người khác hoặc tự duyệt/xuất bản.
- Thu hồi khóa chặn gửi/đọc trạng thái tiếp theo, không tự xóa gói đã nhận.
- Xóa bản sao outbox chỉ xóa ở bên gửi, không rút bản ở máy nhận.
- Phản hồi reviewer là thông tin người gửi sẽ thấy; không đặt ghi chú riêng ở đó.
- Rút bản công bố làm public API/file trả 404. Không xóa các bản đã tải/cache ngoài.
  Gói gốc vẫn nằm riêng trong intake.

## Backup và giới hạn

Schema SQLite nâng v1 → v2. Dừng server, sao lưu toàn data/volume trước khi nâng;
v1 không mở lại được schema v2. Cần đăng nhập lại do namespace cookie mới;
tài khoản/hồ sơ vẫn giữ nguyên.

`.hsd.json` là backup hồ sơ local, không gồm connector secrets, outbox, keys,
intake, audit events hoặc public snapshots. Sao lưu toàn data khi server dừng để
giữ tất cả trạng thái. Bên gửi lưu plaintext khóa trong SQLite riêng để dùng lại;
bên nhận chỉ lưu hash. Bảo vệ volume và các bản sao toàn data.

Gói tối đa 20 MiB tư liệu, 50 tệp, request 32 MiB JSON; outbox/intake mỗi bên có trần
256 MiB payload; tối đa 50 gói/khóa nhận. Chưa có chunk/resume, retention/purge intake,
malware scan, tự che thông tin hoặc kiểm chứng sự thật. Review UI giữ nguyên nguồn
dẫn; nếu nguồn cần sửa, yêu cầu người gửi tạo gói mới. PostgreSQL, nhiều reviewer/
OTP email, Solana/IPFS và Cryptomus chưa triển khai.
