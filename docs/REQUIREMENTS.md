# Đối chiếu yêu cầu — v0.1.0-alpha.1

## Kết luận

**Đủ phạm vi phát hành mã nguồn mở và public design preview. Chưa đạt yêu cầu
nền tảng local-first/community production.** Các mục “thiết kế” không được tính
là đã triển khai.

## Đã triển khai trong release

- UI thư viện, hồ sơ ba cột, hai theme, tìm kiếm và route có thể mở trực tiếp.
- Nguồn/lịch sử/thảo luận/xác minh ở mức fixture và tương tác demo.
- Chạy preview bằng Node hoặc Docker; tài nguyên và font tại chỗ sau khi build.
- Không tự gửi dữ liệu hồ sơ/ghi chú, không analytics hoặc remote fonts.
- Giấy phép AGPL đầy đủ, notices, tài liệu cộng đồng và lộ trình.
- Bộ kiểm thử HTTP và browser; cấu hình CI và GitHub Pages.

## Chưa đáp ứng — chặn beta dữ liệu thật

- **Kho local bền vững:** chưa có SQLite, CRUD hồ sơ hoặc lưu tệp trên ổ đĩa.
- **Thiết lập ban đầu:** chưa có local admin, session hoặc quyền truy cập thật.
- **Sao lưu/phục hồi:** chưa có export/import kho hồ sơ hoặc thử restore.
- **Push tự nguyện:** chưa có định dạng gói thực thi, upload, retry hoặc trạng thái nhận.
- **Máy chủ cộng đồng:** chưa có PostgreSQL, OTP thật, reviewer và hàng đợi duyệt.
- **Biên tập/đính chính:** chỉ có ví dụ tĩnh, chưa lưu được lịch sử thay đổi.
- **Tệp/video:** chưa có quét tệp, chuyển mã, che dữ liệu hoặc signed URLs.
- **Solana/IPFS:** chưa có program, key management, indexer, CID hoặc pinning thật.
- **Cryptomus:** chưa có merchant integration, signed webhook hoặc đối soát.
- **NFT:** chưa triển khai.

## Tiêu chí nghiệm thu các bản tiếp theo

1. Local: cài độc lập → tạo hồ sơ/tệp → restart → vẫn còn dữ liệu → backup/restore.
2. Contribution: chọn đúng tệp → xem trước → xác nhận → retry an toàn → duyệt riêng.
3. Publication: xuất bản bản được duyệt → trả link → local không bị ghi đè → đính chính.
4. Provenance: tạo manifest → đối chiếu hash/phiên bản → xử lý giao dịch lỗi/thu hồi.
5. Funding: tạo invoice thật → xác minh webhook → chống xử lý trùng → đối soát trạng thái.

## Kiểm tra release có thể lặp lại

```sh
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:e2e
docker compose config
docker compose up -d --build --wait
```

Kết quả CI gắn với commit là bằng chứng cho lần kiểm tra tương ứng. Không suy ra
khả năng chạy NAS/ARM64 hoặc độ an toàn backend từ việc test preview thành công.
