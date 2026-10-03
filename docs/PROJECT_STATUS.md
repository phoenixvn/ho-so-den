# Sổ tiến độ và bàn giao — Hồ Sơ Đen

**AI vào repo lần đầu: đọc [AGENTS.md](../AGENTS.md), rồi tài liệu này.**
Đây là snapshot tiến độ có phạm vi; Git/CI/release thực tế là bằng chứng cho push
và phát hành. Không lấy riêng version string hoặc dấu checkbox làm bằng chứng vận hành.

## 1. Snapshot hiện tại

- Repository chính: https://github.com/phoenixvn/ho-so-den
- Maintainer: `@phoenixvn`; giấy phép source/docs/fixture: `AGPL-3.0-only`.
- Nhánh tích hợp: `main`.
- Phiên bản phát triển trong mã: **`0.3.0-alpha.1`**.
- Maturity: **local + community alpha, một admin mỗi instance**.
- SQLite schema: **v2**. Portable archive format: **v1**. Contribution protocol: **v1**.
- Các release đã được xác nhận trước checkpoint này: `v0.1.0-alpha.1` và
  `v0.1.0-alpha.2` (design preview). Chưa tạo tag/release `0.2` hoặc `0.3`.
- Preview public: https://phoenixvn.github.io/ho-so-den/ — chỉ `dist/`, không có API,
  database, archive riêng hoặc receiver community chạy trên GitHub Pages.
- Các thay đổi local/community đang được đóng gói vào checkpoint source mới;
  xem phần bằng chứng phía dưới và remote CI để xác định trạng thái tích hợp.

## 2. Những quyết định đã chốt

- Local-first/self-hosted: dữ liệu do operator giữ, không yêu cầu tài khoản central.
- Đóng góp là **bản sao chọn lọc, chủ động gửi**, không tự đồng bộ cả archive.
- Receiver giữ intake riêng; approval và public publication là hai bước.
- Các chỉnh sửa community không ghi đè local originals.
- Thiết kế wiki/tư liệu, màu giấy ngà/đen mực, hai theme; fixture phải ghi rõ hư cấu.
- Chỉ Cryptomus cho thanh toán dự kiến. Solana làm hướng provenance, IPFS cho bản
  công khai đã duyệt. Chưa có integration thật hoặc NFT trong code hiện tại.
- Bản alpha dùng Node/browser JS + SQLite. PostgreSQL/OTP/RBAC/object storage là
  hướng production chưa triển khai. Next.js/NestJS đã được thảo luận, chưa migrate.
- Mã nguồn mở theo AGPL không thay đổi quyền của người dùng đối với tư liệu riêng.

## 3. Lịch sử tiến độ theo milestone

### Preview và repo cộng đồng — đã phát hành

- Dựng thư viện với sáu hồ sơ hư cấu, tìm kiếm có/không dấu, bộ lọc và sort.
- Đổi sang wiki ba cột, hai theme, chú thích, lịch sử và luồng demo.
- Chuẩn hóa AGPL/third-party notices, DCO, quy tắc cộng đồng, self-host và CI/Pages.
- Repo chuyển về `phoenixvn/ho-so-den`, giữ lịch sử. Các commit nền:
  `6cfd77e` (open-source preview), `ec9897a` (owner/publishing links).
- Hai prerelease `v0.1.0-alpha.1`, `v0.1.0-alpha.2` có source/tag và preview artifact.

### Local core 0.2 — đã triển khai và kiểm thử, không có tag riêng

- Admin setup một lần, salted scrypt, session token hash, logout, CSRF/Host/Origin,
  in-memory login throttling.
- SQLite/WAL, CRUD hồ sơ/nguồn, lịch sử snapshots, optimistic revision checks.
- File storage riêng, SHA-256, authenticated downloads và cleanup blob dùng chung.
- Portable backup/restore kho trống, giữ admin của instance đích; restart persistence.
- UI quản trị riêng và persistent Docker volume.

### Community flow 0.3 — đã triển khai và kiểm thử, chưa là dịch vụ production

- Schema v2 thêm connectors, frozen outbox, hashed receiver keys, intake/events,
  editorial copy và public snapshots. Cookie names tách theo instance.
- Chọn body/sources/tệp; title/summary/category luôn có trong preview gói.
- Khóa riêng do receiver admin cấp, có thu hồi. Gửi cần xác nhận đúng hash.
- Strict payload/hash validation, idempotency theo key + package ID; retry nguyên gói.
- Request changes/reject/approve, sau đó publication riêng; rút lại chặn public reads/files.
- Manual status refresh trả phản hồi/link. Local records không thay đổi.
- Public reader chỉ đọc published snapshot; hai-instance Docker override đã có.

### Bộ hướng dẫn AI và quy trình — checkpoint này

- Root `AGENTS.md`: bất biến sản phẩm, cách bắt đầu/kết thúc và phạm vi Git.
- `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project-workflow.mdc`:
  chỉ dẫn về cùng root rules, không nhân bản chính sách.
- Tài liệu workflow, lifecycle, status ledger và liên kết vào README/CONTRIBUTING.

## 4. Bản đồ code và điểm vào

- `index.html`, `app.js`, `article.js`: preview hư cấu, giữ các mock rõ ràng.
- `local.html`, `local.js`, `local.css`: login/CRUD/history/files/backup UI.
- `contribution-ui.js`: pair, package preview/send, queue/review/publication.
- `community.html`, `community.js`: public snapshot reader, không đọc private intake.
- `scripts/serve.mjs`: static allowlist server; `scripts/local.mjs`: runtime có API.
- `server/store.mjs`: SQLite migrations, records, versions, blobs, portable archive.
- `server/local-api.mjs`: request/auth/CSRF boundaries và route dispatch.
- `server/contributions.mjs`: manifests, peer calls, key isolation, state machine.
- `scripts/build.mjs`: chỉ copy asset allowlist + font/licenses vào `dist/`.
- `compose.yaml`: local; `compose.community.yaml`: optional receiver, volume riêng.
- `tests/*.test.mjs`: API/SQLite; `tests/*.spec.mjs`: browser; `tests/docker-smoke.mjs`:
  disposable single/two-container integration.

## 5. Bằng chứng và trạng thái tích hợp

### Kiểm tra đã quan sát ở checkpoint implementation

- `npm run check`: đạt syntax checks.
- `npm test`: **21/21** HTTP/API/SQLite tests đạt, gồm migration v1 → v2.
- `npm run test:e2e`: **10/10** tests đạt trên Windows/Edge (`PLAYWRIGHT_CHANNEL=msedge`).
- `npm run test:docker:community`: đạt trên Docker Linux containers/Node 24;
  restart giữ dữ liệu, peer HTTP alias trong network hoạt động, gửi–duyệt–publish–refresh đạt.
- Các test dùng fixture và thư mục/project ngẫu nhiên; không dùng archive thật.

Đây là evidence của implementation trước push; không thay thế kết quả CI của commit
remote. Checkpoint tích hợp sẽ ghi source hash/run URL sau khi thực sự hoàn tất.

### Release/deploy distinction

- Đẩy source lên `main` sẽ chạy CI Node 22/24, browser, Docker và Pages workflow.
- Pages chỉ cập nhật giao diện tĩnh; `local.html`/`community.html` trên Pages giải
  thích cách tự host, không gọi backend của người truy cập.
- Chưa yêu cầu tạo tag/release mới ở checkpoint này. Không tự bump maturity.
- Không có registry image public hoặc backend community production đã được công bố.

## 6. Vận hành local đã thử

Hai instance Docker đã được chạy trên máy phát triển, loopback ports 8098 (local)
và 8099 (community). Đây là quan sát của phiên làm việc, **không phải trạng thái
đảm bảo trên máy của người tiếp quản**. Kiểm tra Compose trước khi thao tác.

Volume local đã được sao lưu khi dừng server trước migration schema v2. Đường dẫn
backup, credential và trạng thái dữ liệu thật không được đưa vào repo công khai.
Tài khoản cũ giữ nguyên; namespace cookie mới yêu cầu đăng nhập lại.

Chạy môi trường của riêng bạn theo [COMMUNITY_SETUP.md](COMMUNITY_SETUP.md).
Không tự xóa volume hoặc sử dụng `down -v` trên instance không phải test.

## 7. Giới hạn và các hạng mục chưa xong

- Một admin/một process cho mỗi SQLite archive; không có OTP email, RBAC hoặc PostgreSQL.
- Tệp local 25 MiB. Portable backup: 100 MiB JSON, 60 MiB tư liệu, 10.000 mục/loại.
- Contribution: 20 MiB tư liệu, 50 tệp, 32 MiB wire JSON; outbox/intake mỗi bên 256 MiB
  retained payload; tối đa 50 gói/receiver key.
- Chưa upload resume/chunk, rotation key giữ identity, retention/purge với tombstones.
- Chưa malware scan, redaction, OCR, video transcoding hoặc NAS/ARM64 nghiệm thu.
- Review UI giữ nguyên source list; public correction/version linkage còn thiếu.
- Backup không mã hóa. `.hsd.json` **không** chứa credentials/connectors/outbox/intake/
  events/publications; full-directory backup khi dừng server mới giữ toàn instance.
- Sender key nằm plaintext trong private SQLite; receiver chỉ lưu hash. Không đặt
  credentials trong config frontend, environment examples hoặc logs.
- Cryptomus, Solana/IPFS, NFT hiện vẫn ở roadmap; mock UI không phải provider integration.

## 8. Điểm tiếp quản đề xuất

Ưu tiên kế tiếp: **retention/purge và key rotation cho community alpha**. Hiện intake
có trần lưu giữ nhưng chưa có luồng purge, nên chưa phù hợp vận hành dài hạn.

Tiêu chí cần thỏa nếu task này được chọn:
1. Purge được cho trạng thái được phép, không làm lộ private metadata.
2. Giữ idempotency tombstone: retry gói đã purge không vô tình tạo bản mới/công bố lại.
3. Rotation giữ contributor identity và receipt ownership, thu hồi khóa cũ có kiểm thử.
4. Audit/backup/restore phản ánh đúng lifecycle mới; không tự xóa archive người dùng.
5. Có test hai instance và docs giới hạn/tương thích trước khi đổi maturity.

Task khác vẫn có thể được ưu tiên theo chỉ đạo người dùng; đây không phải danh sách
việc AI tự làm toàn bộ. Khi bàn giao, cập nhật checkpoint và next action ở file này.

## 9. Tài liệu theo trách nhiệm

- Quy tắc AI: [AGENTS.md](../AGENTS.md).
- Cách phát triển/kiểm tra/tích hợp: [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md).
- Giai đoạn/maturity/release gates: [PRODUCT_LIFECYCLE.md](PRODUCT_LIFECYCLE.md).
- Phạm vi implementation: [REQUIREMENTS.md](REQUIREMENTS.md), [ROADMAP.md](../ROADMAP.md).
- Thiết kế: [ARCHITECTURE.md](ARCHITECTURE.md), [CONTRIBUTION_PROTOCOL.md](CONTRIBUTION_PROTOCOL.md).
- Vận hành: [LOCAL_ARCHIVE.md](LOCAL_ARCHIVE.md), [COMMUNITY_SETUP.md](COMMUNITY_SETUP.md).
- Release: [RELEASING.md](RELEASING.md), [CHANGELOG.md](../CHANGELOG.md).
