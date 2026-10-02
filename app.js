// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
'use strict';
// All records are fictional design fixtures. No network, wallet or payment calls.
const records = [
  { id: 'HS-0001', title: 'Dòng tiền phía sau một dự án', category: 'Kinh tế', description: 'Đối chiếu hợp đồng, diễn biến huy động vốn và những mốc thời gian cần làm rõ.', sources: 12, files: 8, date: '2026-10-02', art: 'building', illustration: '<div class="building"></div>', status: 'Đã xét xử · mẫu' },
  { id: 'HS-0002', title: 'Mạng lưới sau những tài khoản ảo', category: 'Công nghệ', description: 'Theo dấu một tình huống giả định về mạo danh trực tuyến và các giao dịch liên quan.', sources: 9, files: 6, date: '2026-10-01', art: 'network', illustration: '<div class="network-orbit"></div><div class="network-core">⌘</div>', status: 'Đang đối chiếu · mẫu' },
  { id: 'HS-0003', title: 'Những dấu vết bên dòng sông', category: 'Môi trường', description: 'Tập hợp mẫu tài liệu quan trắc, biên bản kiểm tra và diễn biến xử lý một vụ việc.', sources: 7, files: 11, date: '2026-09-29', art: 'factory', illustration: '<div class="chimney"></div><div class="factory"></div>', status: 'Đã xét xử · mẫu' },
  { id: 'HS-0004', title: 'Một chữ ký, nhiều phiên bản', category: 'Xã hội', description: 'Hồ sơ thiết kế về cách đối chiếu tài liệu, nguồn gốc và lịch sử thay đổi văn bản.', sources: 6, files: 9, date: '2026-09-27', art: 'document', illustration: '<div class="paper-art"><i></i><i></i><i></i><i></i><i></i></div>', status: 'Đang đối chiếu · mẫu' },
  { id: 'HS-0005', title: 'Phía sau một lời mời đầu tư', category: 'Công nghệ', description: 'Dòng thời gian minh họa về một nền tảng số, lời chào mời và các dấu vết công khai.', sources: 14, files: 7, date: '2026-09-24', art: 'grid', illustration: '<div class="grid-art"></div>', status: 'Đã xét xử · mẫu' },
  { id: 'HS-0006', title: 'Hành trình của một lô hàng', category: 'Kinh tế', description: 'Ghép nối chứng từ, các mốc vận chuyển và thông tin đối chiếu trong hồ sơ giả định.', sources: 8, files: 5, date: '2026-09-20', art: 'boxes', illustration: '<div class="boxes-art"></div>', status: 'Đang đối chiếu · mẫu' }
];
const $ = (selector) => document.querySelector(selector);
const modal = $('#modal');
let filter = 'all';
let activeRecord;
let amount = 10;
let lastFocused;
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function renderRecords() {
  const query = normalize($('#search').value.trim());
  const sort = $('#sort').value;
  const filtered = records.filter((r) => (filter === 'all' || r.category === filter) && normalize(`${r.title} ${r.id} ${r.category} ${r.description}`).includes(query));
  filtered.sort((a, b) => sort === 'sources' ? b.sources - a.sources : sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  $('#result-count').textContent = `${String(filtered.length).padStart(2, '0')} HỒ SƠ MINH HỌA`;
  $('#case-grid').innerHTML = filtered.length ? filtered.map((r) => `
    <a class="case-card" href="${articleHref(r.id)}" aria-label="Xem hồ sơ minh họa: ${r.title}">
      <div class="case-art art-${r.art}" aria-hidden="true"><span class="art-label">${r.category.toUpperCase()}</span>${r.illustration}<span class="art-caption">TƯ LIỆU MINH HỌA</span><span class="art-index">${r.id} / VN</span></div>
      <div class="card-content"><div class="card-meta"><span>${r.id}</span><span class="status">${r.status}</span></div><h3>${r.title}</h3><p>${r.description}</p><div class="card-footer"><span>▤ ${r.sources} nguồn &nbsp; / &nbsp; ${r.files} tư liệu</span><span class="arrow">↗</span></div></div>
    </a>`).join('') : '<div class="empty">Không tìm thấy hồ sơ phù hợp.<br><br>Thử từ khóa khác hoặc chọn “Tất cả”.</div>';
}

function openModal(content) {
  if (!modal.open) lastFocused = document.activeElement;
  $('#modal-content').innerHTML = content;
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeModal() { modal.close(); }
modal.addEventListener('close', () => { document.body.style.overflow = ''; lastFocused?.focus(); });
$('#close-modal').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  const box = modal.getBoundingClientRect();
  if (e.target === modal && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) closeModal();
});

function showLogin() {
  openModal('<h2 id="modal-title">Trở lại kho lưu trữ.</h2><p>Đăng nhập bằng email để lưu hồ sơ và tham gia đóng góp.</p><form id="email-form"><label class="form-label" for="email">Địa chỉ email</label><input class="form-input" id="email" type="email" autocomplete="email" required placeholder="ban@example.com"><button class="button-primary full" type="submit">Tiếp tục bằng email <span>→</span></button></form><p class="fine">Demo giao diện: không gửi email, không lưu địa chỉ. Bạn có thể dùng email giả để xem bước tiếp theo.</p>');
  $('#email-form').addEventListener('submit', (e) => { e.preventDefault(); showOTP(); });
}
function showOTP() {
  openModal('<h2 id="modal-title">Kiểm tra mã đăng nhập.</h2><p>Trong sản phẩm thật, mã dùng một lần sẽ được gửi qua email.</p><div class="notice">Chế độ xem thử · Nhập <strong>123456</strong> để tiếp tục. Chưa có email nào được gửi.</div><form id="otp-form"><label class="form-label" for="otp">Mã gồm 6 chữ số</label><input class="form-input" id="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="000000"><button class="button-primary full" type="submit">Xác nhận mã demo <span>→</span></button><div id="otp-status" class="status-message" role="status"></div></form><button class="text-button" data-action="login">← Đổi email</button>');
  $('#otp-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#otp').value !== '123456') { $('#otp-status').textContent = 'Mã demo chưa đúng. Hãy nhập 123456.'; return; }
    openModal('<h2 id="modal-title">Chào mừng bạn.</h2><p>Bạn đã hoàn thành luồng đăng nhập minh họa.</p><div class="notice">Chưa tạo tài khoản hoặc phiên đăng nhập thật. Bước tiếp theo khi phát triển: kết nối dịch vụ email và xác thực OTP phía máy chủ.</div><button class="button-primary full" data-action="close">Khám phá kho hồ sơ <span>↗</span></button>');
  });
}
function showSupport() {
  amount = 10;
  openModal('<h2 id="modal-title">Góp sức lưu giữ dấu vết.</h2><p>Chọn mức tài trợ để xem trước bước thanh toán. Cổng thanh toán duy nhất: Cryptomus.</p><div class="plans" aria-label="Mức tài trợ tham chiếu"><button class="plan" data-amount="5" aria-pressed="false">$5<small>Góp một trang</small></button><button class="plan selected" data-amount="10" aria-pressed="true">$10<small>Giữ một dấu vết</small></button><button class="plan" data-amount="25" aria-pressed="false">$25<small>Đồng hành lưu trữ</small></button></div><div class="kv"><span>Cổng thanh toán</span><span>Cryptomus</span></div><div class="kv"><span>Giá trị tham chiếu</span><span id="support-total">10 USD</span></div><div class="kv"><span>Coin và mạng thanh toán</span><span>Chọn tại checkout Cryptomus</span></div><p class="fine">USD chỉ là đơn vị niêm yết tham chiếu. Coin, mạng và tỷ giá phụ thuộc cấu hình merchant, khả năng hỗ trợ tại thời điểm tạo hóa đơn; không mặc định trùng với Solana.</p><button class="button-primary full" data-action="checkout">Xem trước checkout <span>↗</span></button><p class="fine">Prototype không tạo hóa đơn, không kết nối ví và không nhận tiền.</p>');
}
const actions = {
  license: () => openModal('<h2 id="modal-title">Mã nguồn mở & quyền riêng tư</h2><p>© 2026 Hồ Sơ Đen contributors. Phần mềm được phép sử dụng, sửa đổi và phân phối theo GNU AGPL phiên bản 3 (AGPL-3.0-only), không có bảo hành.</p><p><a class="source-link" href="LICENSE">Đọc toàn văn giấy phép</a> · <a class="source-link" href="https://github.com/realitechteam/ho-so-den" rel="noreferrer">Mã nguồn tương ứng</a> · <a class="source-link" href="THIRD_PARTY_NOTICES.md">Giấy phép font</a></p><div class="notice">Bản pre-alpha chỉ lưu lựa chọn theme trên trình duyệt. Ghi chú demo giữ trong bộ nhớ tab. Không gửi email, tải tài liệu lên, tạo hóa đơn, gọi blockchain hoặc bật analytics. Font được phục vụ tại chỗ sau khi build.</div><p class="fine">Máy chủ hosting vẫn xử lý yêu cầu HTTP để phục vụ website và có thể ghi log theo chính sách của đơn vị vận hành. Giấy phép phần mềm không tự áp dụng cho tư liệu riêng của người dùng.</p>'),
  'copy-record': copyRecordLink,
  'verify-demo': () => { $('#verify-result').textContent = 'Chưa thể xác minh: thiếu manifest, chữ ký giao dịch và CID. Không có yêu cầu mạng hoặc giao dịch nào được gửi.'; },
  login: showLogin,
  support: showSupport,
  close: closeModal,
  checkout: () => openModal(`<h2 id="modal-title">Checkout / Cryptomus</h2><div class="detail-tags">BẢN XEM TRƯỚC · KHÔNG PHẢI HÓA ĐƠN</div><div class="kv"><span>Mục đích</span><span>Tài trợ kho lưu trữ</span></div><div class="kv"><span>Giá trị tham chiếu</span><span>${amount} USD</span></div><div class="kv"><span>Trạng thái</span><span>Chưa tạo thanh toán</span></div><div class="notice">Khi tích hợp thật, máy chủ tạo hóa đơn Cryptomus rồi chuyển bạn đến checkout do Cryptomus cung cấp. Chỉ cập nhật thành công sau khi kiểm tra webhook có chữ ký và đối soát trạng thái thanh toán.</div><p>Không có QR hoặc địa chỉ ví mẫu để tránh nhầm với giao dịch thật.</p><button class="button-primary full" data-action="support">← Trở lại chọn mức tài trợ</button>`),
  principles: () => openModal('<h2 id="modal-title">Nguồn trước. Kết luận sau.</h2><p>Hồ Sơ Đen được định hướng là thư viện tư liệu có thể đối chiếu.</p><ul><li>Mỗi khẳng định quan trọng phải có nguồn dẫn.</li><li>Phân biệt trạng thái tố tụng với mức độ kiểm chứng tài liệu.</li><li>Ẩn dữ liệu nhạy cảm trước khi công bố hoặc đưa lên IPFS.</li><li>Đính chính phải rõ ràng, gắn với phiên bản đã được thay thế.</li><li>Không suy đoán danh tính từ tài liệu đã ẩn danh.</li></ul><div class="notice">Prototype hiện chỉ dùng nội dung hư cấu. Chưa có hoạt động biên tập hoặc xác minh thực tế.</div>'),
  network: () => openModal('<h2 id="modal-title">Lớp lưu trữ & xác minh.</h2><p>Kiến trúc dự kiến cho phiên bản Solana-first.</p><div class="kv"><span>Ghi nhận phiên bản</span><span>Solana · Rust / Anchor</span></div><div class="kv"><span>Tư liệu công khai đã duyệt</span><span>IPFS · nhiều bên pin</span></div><div class="kv"><span>Tệp gốc và bản nháp</span><span>Kho riêng có kiểm soát truy cập</span></div><div class="kv"><span>Thanh toán</span><span>Cryptomus</span></div><div class="kv"><span>Đăng nhập</span><span>OTP email</span></div><div class="notice">Tất cả kết nối đang ở trạng thái thiết kế, chưa hoạt động. IPFS cần duy trì bản sao và chi phí lưu trữ; không bảo đảm tồn tại vĩnh viễn.</div>'),
  contribute: () => openModal('<h2 id="modal-title">Mỗi nguồn dẫn đều có giá trị.</h2><p>Luồng đóng góp dự kiến: đăng nhập → mô tả tư liệu → gửi vào kho riêng → kiểm tra nguồn và quyền công bố → duyệt bản công khai.</p><div class="notice">Bản xem thử chưa tiếp nhận tệp hoặc thông tin vụ việc. Hãy dùng dữ liệu giả khi thử giao diện.</div><button class="button-primary full" data-action="login">Thử đăng nhập bằng email <span>↗</span></button>')
};
document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.action) actions[button.dataset.action]?.();
  if (button.dataset.articleTab) navigateArticleTab(button.dataset.articleTab);
  if (button.dataset.source) openSource(Number(button.dataset.source));
  if (button.dataset.filter) {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((b) => { const selected = b.dataset.filter === filter; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
    renderRecords();
  }
  if (button.dataset.amount) {
    amount = Number(button.dataset.amount);
    document.querySelectorAll('[data-amount]').forEach((b) => { const selected = Number(b.dataset.amount) === amount; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
    $('#support-total').textContent = `${amount} USD`;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !modal.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); if ($('#library-view').hidden) { location.hash = '#archive'; requestAnimationFrame(() => $('#search').focus()); } else $('#search').focus(); }
  if (e.target.matches('[role="tab"]') && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(e.target);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    navigateArticleTab(tabs[next].dataset.articleTab);
  }
});
$('#search').addEventListener('input', renderRecords);
$('#sort').addEventListener('change', renderRecords);
renderRecords();
let savedTheme = 'paper';
try { savedTheme = localStorage.getItem('hoso-reading-theme') || 'paper'; } catch { /* Use default theme. */ }
setReadingTheme(savedTheme);
$('#theme-toggle').addEventListener('click', () => setReadingTheme(document.documentElement.dataset.theme === 'ink' ? 'paper' : 'ink'));
window.addEventListener('hashchange', articleRoute);
articleRoute();
