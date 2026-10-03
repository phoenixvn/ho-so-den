# Quy trình phát triển — người và AI

Áp dụng cho mọi thay đổi sản phẩm. Điểm vào AI: [AGENTS.md](../AGENTS.md).
Trạng thái hiện tại: [PROJECT_STATUS.md](PROJECT_STATUS.md). Tài liệu này mô tả
cách làm việc; không có nghĩa mọi tính năng hoặc cổng phát hành đã hoàn thành.

## 1. Tiếp nhận yêu cầu

- Nêu kết quả người dùng cần và tiêu chí quan sát được; hỏi khi một quyết định
  chưa rõ làm thay đổi dữ liệu, quyền truy cập, tương thích hoặc phạm vi công bố.
- Phân biệt chỉnh UI preview, backend local, receiver cộng đồng và public reader.
- Ghi rõ ngoài phạm vi của task; không tự thêm provider, blockchain hoặc migration.
- Với công việc nhiều bước, lập kế hoạch ngắn và theo dõi trạng thái từng bước.

Ví dụ nghiệm thu tốt: “Gửi cùng package ID hai lần trả cùng biên nhận và chỉ có
một submission.” Không dùng “làm sync ổn” làm tiêu chí.

## 2. Khảo sát và xác nhận nền

- Đọc trạng thái Git, diff liên quan và commit gần nhất trước khi sửa.
- Đọc code cùng tests của phần sẽ chạm tới; không coi roadmap là tính năng đã có.
- Dùng `package.json`/lockfile cho lệnh và phiên bản; code/migration định nghĩa
  hành vi thực. Nếu docs lệch code, xác minh rồi cập nhật docs, không suy diễn.
- Giữ thay đổi chưa commit của người dùng. Không checkout/reset để “làm sạch” repo.

## 3. Thiết kế theo ranh giới sản phẩm

- Mô tả data flow, actor và điểm dữ liệu chuyển từ riêng sang công khai.
- Backend/schema/protocol: xác định version, lỗi, retry, concurrency và migration.
- UI: hai theme, bàn phím, mobile, empty/error/loading state, ranh giới mock/real.
- Dependency hoặc thay đổi kiến trúc đáng kể cần lý do và ghi nhận quyết định.
- Thay đổi lớn nên có proposal trong issue/discussion trước khi triển khai; một
  task rõ ràng đã được chủ dự án chấp thuận không cần hỏi lại cùng quyết định.

## 4. Triển khai có phạm vi

- Thay đổi nhỏ, nhất quán với cấu trúc hiện tại; không migrate framework chỉ vì
  framework đã được nhắc trong thảo luận trước.
- Validate ở server, không dựa vào checkbox/readonly phía client làm quyền truy cập.
- Giữ outbox immutable, bearer key tách admin session, private intake tách public snapshot.
- Mọi migration giữ dữ liệu cũ; thử với fixture schema cũ và kiểm tra restart.
- Không bật outbound mặc định. Mọi peer mới phải được người quản trị cấu hình.
- Tài khoản/khóa dùng trong tests là fixture; không dùng dữ liệu thực để kiểm thử.

## 5. Kiểm tra theo ảnh hưởng

### Mọi thay đổi source

```sh
npm run check
git diff --check
```

### API, SQLite, auth, backup hoặc protocol

```sh
npm test
```

Lệnh này build `dist/` và chạy các bài HTTP/API/SQLite trong `tests/*.test.mjs`.
Các test phải chứng minh bất biến hoặc lỗi thực: quyền truy cập, dữ liệu bền vững,
khôi phục, xung đột revision, idempotency và visibility.

### UI hoặc luồng end-to-end

```sh
npm run build
npx playwright install chromium
npm run test:e2e
```

Trên Linux, cài browser bằng `npx playwright install --with-deps chromium` nếu cần.
Windows có thể dùng Edge đã cài: `$env:PLAYWRIGHT_CHANNEL = 'msedge'` rồi chạy test.
Không ghi “Chromium CI passed” chỉ vì đã chạy Edge local; ghi đúng môi trường.

### Container, volume hoặc giao tiếp hai instance

```sh
npm run test:docker:community
```

Script tạo project/volume có tên ngẫu nhiên, kiểm tra rồi dọn **project test đó**.
Không thay lệnh bằng `docker compose down -v` trên project của người dùng.

### Trước push milestone runtime hoặc phát hành

```sh
npm ci
npm run check
npm test
npm run test:e2e
npm run test:docker:community
```

`npm run check:license` xác nhận AGPL theo SPDX khi thay license hoặc chuẩn bị
release; cần mạng. Chỉ sửa docs thì kiểm tra nội dung, liên kết và diff; không cần
chạy lại toàn bộ test local nếu source không đổi. CI vẫn chạy theo cấu hình repo.
Sau khi các kiểm tra phù hợp đã đạt, không lặp lại vô ích nếu không có thay đổi
hoặc vấn đề mới. Luôn ghi rõ lỗi/chặn/chưa kiểm thử thay vì suy ra kết quả.

## 6. Cập nhật tài liệu trước bàn giao

- `docs/PROJECT_STATUS.md`: snapshot hiện tại, checkpoint, test/evidence và việc tiếp theo.
- `ROADMAP.md`: milestone checklist, không dùng phần trăm hoàn thành chủ quan.
- `docs/REQUIREMENTS.md`: đáp ứng/chưa đáp ứng/giới hạn của implementation.
- `CHANGELOG.md`: hành vi người dùng thấy; mục development không tự là release.
- Docs module: setup, protocol, privacy, schema và giới hạn tương ứng.
- Giữ mỗi loại thông tin ở đúng nơi; link thay vì chép lại một quy tắc nhiều lần.

Mẫu checkpoint:

```text
Milestone / phạm vi:
Đã triển khai:
Kiểm tra thực chạy và kết quả:
Source commit / CI run (nếu có):
Trạng thái push / preview / release:
Giới hạn và blockers:
Bước tiếp theo / tiêu chí nghiệm thu:
```

Không đưa đường dẫn máy cá nhân, token, password, private archive hoặc nội dung
backup thật vào sổ tiến độ công khai. Chỉ ghi cách truy xuất trạng thái vận hành.

## 7. Tích hợp Git và CI

- Chỉ commit/push/tag/release khi được task người dùng cho phép.
- Trước commit: `git status`, diff liên quan, `git log --oneline -10`, staged diff
  và `git diff --cached --check`. Stage đúng file; giữ Git identity đang cấu hình.
- DCO: `git commit -s ...`. Dùng prefix `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Không amend commit đã công bố, force-push, đổi Git config hoặc rewrite release tag.
- Với PR, giải thích mục tiêu, tests và data boundary theo template của repo.
- Nếu push `main`, theo dõi **CI** và **Publish preview**; lỗi thì sửa bằng commit
  mới và theo dõi lại. Workflow Pages chỉ đưa `dist/` lên static hosting.
- Không tạo tag/release chỉ vì đã push code. Hướng dẫn riêng: [RELEASING.md](RELEASING.md).

## 8. Handoff và Definition of Done

Một task được coi là hoàn thành khi hành vi trong phạm vi đã làm, kiểm tra phù hợp
đã đạt hoặc giới hạn đã nói rõ, docs đã cập nhật và không còn lỗi được biết trong
luồng nghiệm thu. Nếu task bao gồm push/deploy, phải xác nhận kết quả thực của nó.

Handoff phải nói: thay đổi gì; đã test gì; còn thiếu gì; đang ở workspace/remote/
preview/release nào; bước tiếp theo cụ thể. Không nói “đã lên production” khi chỉ
có Pages, container local hoặc version string mới trong package.json.
