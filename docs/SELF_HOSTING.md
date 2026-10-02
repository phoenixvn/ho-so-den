# Tự chạy bản preview

## Phạm vi

Release này phục vụ **giao diện tĩnh và dữ liệu hư cấu**. Không có database,
thư mục hồ sơ riêng, tài khoản server, upload hay đồng bộ. Việc cài Docker không
tự tạo những tính năng đó. Không đưa file cá nhân vào thư mục `dist/`.

## Docker Compose

```sh
git clone https://github.com/realitechteam/ho-so-den.git
cd ho-so-den
docker compose up -d --build
docker compose ps
```

Địa chỉ: http://localhost:8080 . Container có health check `/healthz`, chạy
non-root và filesystem read-only. Lần build đầu cần Internet để tải image và
dependency; runtime không yêu cầu dịch vụ ngoài.

```sh
docker compose logs --tail=100 preview
docker compose down
```

Port mặc định bind `127.0.0.1`. Để xem trên LAN, chủ động đổi phần host của mapping
trong `compose.yaml` sang IP LAN của máy. Preview không có xác thực truy cập.
Không mô tả việc mở port là một triển khai kho hồ sơ riêng có bảo vệ.

Nếu cổng 8080 đã được ứng dụng khác sử dụng, chọn một cổng khác bằng biến
`PREVIEW_PORT`. Ví dụ PowerShell: `$env:PREVIEW_PORT = '8097'` rồi chạy Compose;
POSIX: `PREVIEW_PORT=8097 docker compose up -d --build`. Truy cập cổng vừa chọn.

## Node.js

Yêu cầu Node.js 22+; khuyến nghị 24 LTS.

```sh
npm ci
npm run build
npm start
```

Server chỉ đọc `dist/`, mặc định `127.0.0.1:8080`. Có thể cấu hình `HOST` và `PORT`.

PowerShell:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '8081'
npm start
```

POSIX shell:

```sh
HOST=127.0.0.1 PORT=8081 npm start
```

Không cần `.env`; preview không có secret hoặc khóa API. Không nhập thông tin thật
vào các form demo. OTP mẫu là `123456`.

## Static hosting

Upload **nội dung `dist/`**, không upload toàn bộ repo hay `node_modules/`. Các đường
dẫn asset là tương đối nên hỗ trợ subpath như `/ho-so-den/`. Route hồ sơ dùng hash;
không cần rewrite mọi URL về index. `robots.txt` và meta robots đánh dấu preview
không lập chỉ mục. Đây không phải cơ chế kiểm soát quyền truy cập.

Giữ `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md` và `font-licenses/` trong bản phân
phối. Khi sửa và triển khai, đổi source link trong giao diện để trỏ tới mã nguồn
tương ứng. Cấu hình HTTPS tại hosting/reverse proxy nếu mở public.

## Nâng cấp và dữ liệu

Kiểm tra release notes, checkout tag mong muốn rồi chạy lại `npm ci` + build hoặc
`docker compose up -d --build`. Chưa có schema database để migrate. Theme nằm trong
localStorage của trình duyệt; ghi chú demo mất khi refresh. Chức năng backup hồ sơ
và nâng cấp không mất dữ liệu là milestone tiếp theo, chưa được cung cấp.
