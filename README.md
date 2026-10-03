# Hồ Sơ Đen

**Thư viện của những dấu vết. Mã nguồn mở. Local-first.**

[Preview công khai](https://phoenixvn.github.io/ho-so-den/) · [English](docs/README.en.md) · [Kho local](docs/LOCAL_ARCHIVE.md) · [Hai instance cộng đồng](docs/COMMUNITY_SETUP.md) · [Đóng góp mã nguồn](CONTRIBUTING.md)

**Tiếp quản dự án / AI coding:** bắt đầu tại [AGENTS.md](AGENTS.md), đọc
[sổ tiến độ đầy đủ](docs/PROJECT_STATUS.md), [quy trình phát triển](docs/DEVELOPMENT_WORKFLOW.md)
và [vòng đời sản phẩm](docs/PRODUCT_LIFECYCLE.md).

> **0.3.0-alpha.1 — đóng góp cộng đồng, bản phát triển.** Đã có kho local, gói gửi
> chọn lọc và instance cộng đồng tiếp nhận riêng, duyệt rồi xuất bản. Cả hai đang
> dùng SQLite và một quản trị viên mỗi instance. Chưa có PostgreSQL, OTP email
> nhiều người dùng, upload tiếp tục, thanh toán hoặc Web3. GitHub Pages vẫn chỉ
> chạy preview tĩnh. Xem [đối chiếu yêu cầu](docs/REQUIREMENTS.md).

![Trang đọc hồ sơ minh họa](docs/assets/preview-paper.png)

## Ba chế độ

**Kho local** (`npm start`): chạy trên máy tính hoặc server của bạn. Tài khoản,
hồ sơ và tệp nằm trong thư mục dữ liệu riêng, ngoài web root. Không cần tài khoản
cộng đồng hay ví. Dữ liệu không tự gửi ra ngoài.

**Preview** (`npm run start:preview` hoặc GitHub Pages): sáu hồ sơ hư cấu, hai theme,
nguồn dẫn, lịch sử và các luồng demo. OTP `123456` và Cryptomus chỉ là mô phỏng,
không đăng nhập được vào kho local.

Người dùng chọn một phiên bản và các tệp để gửi **một bản sao**: xem trước → xác nhận
gửi → tiếp nhận riêng → duyệt → xuất bản bằng thao tác riêng. Community edits không
ghi đè bản local. Trạng thái chỉ được cập nhật khi người dùng yêu cầu.

**Community** (`HSD_MODE=community`): cấp/thu hồi khóa đóng góp, hàng đợi riêng,
chỉnh tiêu đề/nội dung và chọn tệp công khai; yêu cầu bổ sung, từ chối hoặc rút lại.
`community.html` phục vụ bản đã công bố mà không yêu cầu đăng nhập. Chưa có tự động
quét mã độc hoặc xác minh nội dung.

## Chạy kho local bằng Docker

Yêu cầu Git, Docker Engine/Desktop đang chạy và Docker Compose v2.

```sh
git clone https://github.com/phoenixvn/ho-so-den.git
cd ho-so-den
docker compose up -d --build
```

Mở **http://localhost:8080** và tạo quản trị viên đầu tiên. Dữ liệu được giữ trong
named volume `archive-data`. Port chỉ bind loopback. Nếu 8080 đang dùng, đặt
`PREVIEW_PORT` sang cổng khác; ví dụ PowerShell: `$env:PREVIEW_PORT = '8098'`.

`docker compose down` giữ dữ liệu. **`docker compose down -v` xóa volume và dữ liệu.**
Xem [hướng dẫn local và backup](docs/LOCAL_ARCHIVE.md) trước khi quản lý volume.

## Chạy bằng Node.js

Node.js **22.18+**, khuyến nghị **24 LTS**. Dùng `node:sqlite` tích hợp; Node 22 có
thể in cảnh báo experimental cho module này.

```sh
npm ci
npm run build
npm start
```

Mở **http://127.0.0.1:8080**. Dữ liệu mặc định tại `data/`, được loại khỏi Git.
`HSD_DATA_DIR` chọn thư mục khác, bắt buộc ngoài `dist/`. Không có mật khẩu mặc định.
`npm run dev` build rồi chạy local server, chưa có hot reload.

## Tính năng local đã có

- Tạo quản trị viên một lần; password hash scrypt; session HttpOnly, SameSite và CSRF.
- Tạo/sửa/xóa hồ sơ, chủ đề, tóm tắt, nội dung văn bản thuần, nguồn dẫn.
- Tìm theo tên, tóm tắt, chủ đề; lịch sử snapshot và chống ghi đè phiên bản cũ.
- Upload/download riêng, SHA-256, tên lưu nội bộ tách khỏi tên tệp người dùng.
- SQLite migrations, WAL, dữ liệu tồn tại sau restart.
- Export `.hsd.json`: hồ sơ, nguồn, lịch sử và tệp hiện tại; restore có kiểm tra hash
  vào kho trống, giữ tài khoản quản trị của instance đích.
- Docker non-root, data volume; font tại chỗ và không analytics mặc định.

**Giới hạn alpha:** một quản trị viên, một process/instance; mỗi tệp tối đa 25 MiB;
backup trình duyệt tối đa 100 MiB JSON / 60 MiB tư liệu / 10.000 mục mỗi loại. Backup
không mã hóa, không chứa tài khoản/session. Chưa quét mã độc, phát video, OCR hoặc
khôi phục tệp đã xóa từ lịch sử. Với kho lớn, sao lưu toàn thư mục data khi server dừng.

## Thử đóng góp giữa hai instance

```sh
docker compose -f compose.yaml -f compose.community.yaml up -d --build
```

- Local: http://localhost:8080 — tạo quản trị viên riêng.
- Community: http://localhost:8099/local.html — tạo quản trị viên khác, mở **Bàn biên tập**.
- Community cấp một khóa; local thêm kết nối origin `http://community:8080`,
  origin công bố `http://localhost:8099` và khóa đó.
- Mở hồ sơ local → **Đóng góp** → chọn tệp/nội dung → xem trước → xác nhận gửi.
- Community duyệt, sau đó xác nhận **Xuất bản công khai**. Local bấm cập nhật trạng thái.

HTTP được bật rõ ràng trong Docker network demo; dùng HTTPS cho Internet.
[Hướng dẫn đầy đủ](docs/COMMUNITY_SETUP.md).

**Giới hạn đóng góp:** 20 MiB tư liệu/50 tệp/gói, request JSON 32 MiB; mỗi outbox
và intake giữ tối đa 256 MiB payload, 50 gói/khóa nhận. Retry nguyên gói có idempotency,
chưa có upload tiếp tục theo chunk. Khóa nằm trong database riêng của bên gửi;
bên nhận lưu hash. Chưa có chính sách tự xóa/retention intake.

## Kiểm thử

```sh
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run test:docker
npm run test:docker:community
```

Test bao gồm auth/CSRF, revision conflict, private files, restart persistence,
backup/restore và backup hỏng; UI đi từ tạo quản trị viên đến phục hồi vào instance
khác. Docker smoke test tạo một project/volume test riêng, kiểm tra dữ liệu qua
restart rồi xóa project test đó. Trên Linux dùng `npx playwright install --with-deps chromium` nếu cần.

## Cấu trúc

```text
local.html, local.js, local.css    Giao diện kho local
server/                          SQLite store và API có xác thực
server/contributions.mjs          Gói gửi, idempotency, tiếp nhận và xuất bản
contribution-ui.js                Giao diện gửi và bàn biên tập
community.html, community.js      Trang công bố công khai
scripts/local.mjs                Server local
scripts/serve.mjs                Server preview tĩnh
index.html, app.js, article.js    Preview hư cấu
scripts/build.mjs                Chỉ đưa asset web vào dist/
tests/                           HTTP, SQLite, browser tests
docs/                            Hướng dẫn, kiến trúc và yêu cầu
Dockerfile, compose.yaml         Local server và persistent volume
```

Không commit dữ liệu cá nhân, `data/`, `dist/`, dependency hoặc kết quả test. Cài/build
lần đầu cần npm/Docker registry; runtime chỉ gọi peer khi người dùng gửi/cập nhật trạng thái. Quyền riêng tư
và lưu trữ: [PRIVACY](docs/PRIVACY.md).

## Cộng đồng và giấy phép

[Issues](https://github.com/phoenixvn/ho-so-den/issues) · [Discussions](https://github.com/phoenixvn/ho-so-den/discussions) · [CONTRIBUTING](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Governance](GOVERNANCE.md) · [Security](SECURITY.md)

GitHub là nơi phát triển phần mềm, không phải nơi gửi hồ sơ vụ việc thật.

Copyright © 2026 Hồ Sơ Đen contributors. Mã nguồn, tài liệu gốc và fixture hư cấu:
**AGPL-3.0-only**, không bảo hành. [LICENSE](LICENSE) chứa toàn văn; khi vận hành bản
sửa đổi qua mạng, cung cấp Corresponding Source theo điều 13 và cập nhật source link.
Font giữ **OFL-1.1**: [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md). Giấy phép phần mềm
không tự áp dụng cho hồ sơ riêng của người dùng. Xem [NOTICE](NOTICE).
