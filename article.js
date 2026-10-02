// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Dossier pages are fictional editorial fixtures, not records of real cases.
const dossierNotes = {
  'HS-0001': { focus: 'các mốc huy động vốn trong một dự án giả định', materials: 'bản giới thiệu dự án, phụ lục hợp đồng và bảng kê giao dịch', question: 'Thời điểm thay đổi điều khoản có trùng với thời điểm gửi thông báo cho người tham gia?', quote: 'Các khoản ghi nhận cần được đối chiếu với chứng từ gốc trước khi đưa vào tổng hợp.' },
  'HS-0002': { focus: 'một tình huống mạo danh trên nền tảng trực tuyến', materials: 'ảnh chụp giao diện, bản xuất trao đổi và nhật ký tiếp nhận', question: 'Các tài khoản có thực sự do cùng một chủ thể kiểm soát hay chỉ sử dụng hình ảnh giống nhau?', quote: 'Sự trùng lặp về hình ảnh chưa đủ để xác định người đứng sau một tài khoản.' },
  'HS-0003': { focus: 'quá trình ghi nhận thay đổi chất lượng nước trong một tình huống giả định', materials: 'phiếu lấy mẫu, sơ đồ điểm đo và biên bản kiểm tra', question: 'Các mẫu có được thu thập cùng điều kiện và cùng phương pháp phân tích?', quote: 'Kết quả chỉ có thể so sánh khi phương pháp và điều kiện lấy mẫu được xác định rõ.' },
  'HS-0004': { focus: 'các phiên bản khác nhau của một văn bản giả định', materials: 'bản quét văn bản, phụ lục chỉnh sửa và nhật ký bàn giao', question: 'Đâu là phiên bản được ban hành và đâu là bản nháp chưa được xác nhận?', quote: 'Một bản sao không tự xác nhận được thời điểm hay thẩm quyền ban hành văn bản.' },
  'HS-0005': { focus: 'những thông tin trong lời chào mời đầu tư của một nền tảng giả định', materials: 'bản mô tả sản phẩm, ảnh chụp thông báo và điều khoản sử dụng', question: 'Điều khoản người tham gia nhìn thấy tại thời điểm đăng ký là phiên bản nào?', quote: 'Thông tin trong tài liệu quảng bá cần được phân biệt với điều khoản đã được chấp thuận.' },
  'HS-0006': { focus: 'các mốc bàn giao của một lô hàng giả định', materials: 'phiếu xuất kho, biên bản giao nhận và bảng đối chiếu số lượng', question: 'Chênh lệch số lượng xuất hiện ở khâu ghi nhận hay trong quá trình bàn giao?', quote: 'Mỗi lần chuyển giao cần có dấu vết tài liệu để nối tiếp hành trình của lô hàng.' }
};
const articleTabs = [['read', 'Đọc'], ['sources', 'Nguồn'], ['history', 'Lịch sử'], ['discussion', 'Thảo luận'], ['proof', 'Xác minh']];
const articleSections = [['overview', 'Tổng quan'], ['timeline', 'Diễn biến'], ['materials', 'Tư liệu'], ['proceedings', 'Tố tụng'], ['questions', 'Điểm còn tranh chấp'], ['references', 'Nguồn tham khảo']];
let currentArticleKey = '';
let currentArticleTab = 'read';
let contentsObserver;
const sessionComments = new Map();

function setReadingTheme(theme) {
  const selected = theme === 'ink' ? 'ink' : 'paper';
  document.documentElement.dataset.theme = selected;
  document.querySelector('#theme-label').textContent = selected === 'ink' ? 'Mực đêm' : 'Trang giấy';
  const toggle = document.querySelector('#theme-toggle');
  toggle.setAttribute('aria-pressed', String(selected === 'ink'));
  toggle.setAttribute('aria-label', selected === 'ink' ? 'Bật Trang giấy' : 'Bật Mực đêm');
  document.querySelector('meta[name="theme-color"]').content = selected === 'ink' ? '#191917' : '#f4f1e9';
  try { localStorage.setItem('hoso-reading-theme', selected); } catch { /* File previews may block storage. */ }
}

function articleHref(id, tab = 'read', section = '') {
  return `#/ho-so/${id}/${tab}${section ? `/${section}` : ''}`;
}
function navigateArticleTab(tab) {
  if (activeRecord && articleTabs.some(([key]) => key === tab)) location.hash = articleHref(activeRecord.id, tab);
}
function contentsMarkup(id) {
  return `<div class="toc-list">${articleSections.map(([key, label], i) => `<a href="${articleHref(id, 'read', key)}" data-section="${key}"><span>${String(i + 1).padStart(2, '0')}</span>${label}</a>`).join('')}</div>`;
}
function markSection(section) {
  document.querySelectorAll('[data-section]').forEach((link) => {
    const selected = link.dataset.section === section;
    link.classList.toggle('current', selected);
    if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
}
function articleRoute() {
  const match = location.hash.match(/^#\/ho-so\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/);
  const isArticle = Boolean(match) || location.hash.startsWith('#/ho-so/');
  document.querySelector('#library-view').hidden = isArticle;
  document.querySelector('#article-view').hidden = !isArticle;
  document.body.classList.toggle('article-mode', isArticle);
  if (!isArticle) {
    contentsObserver?.disconnect();
    const wasArticle = Boolean(currentArticleKey);
    currentArticleKey = '';
    activeRecord = undefined;
    document.title = 'Hồ Sơ Đen — Thư viện của những dấu vết';
    if (wasArticle || location.hash === '#archive') requestAnimationFrame(() => {
      if (location.hash === '#archive') document.querySelector('#archive').scrollIntoView(); else window.scrollTo(0, 0);
      if (wasArticle) document.querySelector('#main-content').focus({ preventScroll: true });
    });
    return;
  }
  const record = match && records.find((r) => r.id === match[1]);
  const tab = match?.[2] || 'read';
  if (!record || !articleTabs.some(([key]) => key === tab)) {
    contentsObserver?.disconnect();
    currentArticleKey = 'not-found';
    activeRecord = undefined;
    document.querySelector('#article-view').innerHTML = '<div class="empty-route"><div class="eyebrow">TRANG CHƯA CÓ TRONG THƯ VIỆN</div><h1>Không tìm thấy hồ sơ.</h1><p>Liên kết này không thuộc bộ hồ sơ minh họa.</p><a class="intro-link" href="#archive">← Trở về thư viện</a></div>';
    document.title = 'Không tìm thấy hồ sơ — Hồ Sơ Đen';
    window.scrollTo(0, 0);
    return;
  }
  const key = `${record.id}/${tab}`;
  const keyChanged = key !== currentArticleKey;
  const tabHadFocus = document.activeElement?.matches('[data-article-tab]');
  const section = match[3];
  if (keyChanged) {
    activeRecord = record;
    currentArticleKey = key;
    currentArticleTab = tab;
    renderArticlePage(record, tab);
    document.title = `${record.title} — Hồ Sơ Đen`;
  }
  requestAnimationFrame(() => {
    if (section && articleSections.some(([key]) => key === section) && tab === 'read') {
      const target = document.getElementById(`section-${section}`);
      target?.scrollIntoView({ behavior: 'instant', block: 'start' });
      target?.focus({ preventScroll: true });
      markSection(section);
    } else if (keyChanged) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (tabHadFocus) document.querySelector(`#article-tab-${tab}`)?.focus({ preventScroll: true });
      else document.querySelector('.article-title')?.focus({ preventScroll: true });
    }
  });
}

function renderArticlePage(record, tab) {
  contentsObserver?.disconnect();
  const r = record;
  const title = articleTabs.find(([key]) => key === tab)[1];
  document.querySelector('#article-view').innerHTML = `
    <div class="article-breadcrumb"><a href="#archive">Thư viện</a><span>/</span><span>${r.category}</span><span>/</span><span>${r.id}</span><span class="breadcrumb-end">BẢN THIẾT KẾ II · TƯ LIỆU HƯ CẤU</span></div>
    <div class="wiki-layout">
      <aside class="wiki-contents" aria-label="Mục lục hồ sơ"><div class="contents-title">NỘI DUNG <span>≡</span></div>${contentsMarkup(r.id)}<div class="contents-aside"><p>“Một nguồn dẫn tốt<br>mở ra một câu hỏi tốt hơn.”</p><button class="text-button" data-action="contribute">Bổ sung tư liệu ↗</button><button class="text-button" data-action="principles">Nguyên tắc biên tập ↗</button></div><div class="sidebar-edition">HỒ SƠ ĐEN<br>THE OPEN CASE ARCHIVE<br>——<br>ẤN BẢN / 2026</div></aside>
      <article class="wiki-article" aria-labelledby="article-title">
        <div class="article-kicker">HỒ SƠ MINH HỌA / ${r.category.toUpperCase()}</div>
        <h1 class="article-title" id="article-title" tabindex="-1">${r.title}</h1>
        <p class="article-subtitle">Từ Hồ Sơ Đen, thư viện mở của những dấu vết.<br>Mã ${r.id} · Bản biên tập mẫu 1.2 · Cập nhật ${r.date.split('-').reverse().join('.')}</p>
        <div class="article-tools"><div class="article-tabs" role="tablist" aria-label="Các trang hồ sơ">${articleTabs.map(([key, label]) => `<button id="article-tab-${key}" role="tab" aria-controls="article-panel" aria-selected="${key === tab}" tabindex="${key === tab ? 0 : -1}" class="${key === tab ? 'selected' : ''}" data-article-tab="${key}">${label}</button>`).join('')}</div><button class="copy-link" data-action="copy-record" aria-label="Sao chép liên kết hồ sơ" title="Sao chép liên kết hồ sơ">↗</button></div>
        <div class="article-notice"><span aria-hidden="true">※</span><div><b>Đây là một hồ sơ hư cấu.</b>Nội dung, nguồn dẫn và phiên bản dùng để trải nghiệm thiết kế; không phản ánh một vụ án có thật.</div></div>
        ${tab === 'read' ? `<details class="mobile-contents"><summary>Mục lục hồ sơ · 6 phần</summary>${contentsMarkup(r.id)}</details>` : ''}
        <div class="reading-body" id="article-panel" role="tabpanel" aria-labelledby="article-tab-${tab}" tabindex="0">${articlePanel(r, tab)}</div>
        <div class="reading-end"><span>${r.id} / ${title.toUpperCase()}<br>KHÔNG PHẢI TÀI LIỆU PHÁP LÝ</span><span>HỒ SƠ ĐEN<br>GHI CHÉP ĐỂ KHÔNG LÃNG QUÊN.</span></div>
      </article>
      <aside class="wiki-info" aria-label="Thông tin nhanh và dấu vết phiên bản">
        <section class="info-box"><div class="info-box-heading"><span>PHIẾU LƯU TRỮ / VIỆT NAM</span><strong>${r.id}</strong></div><div class="info-illustration case-art art-${r.art}" aria-hidden="true">${r.illustration}</div><div class="info-caption">Hình minh họa dựng bằng đồ họa.<br>Không phải tư liệu hiện trường.</div><dl><div><dt>Chủ đề</dt><dd>${r.category}</dd></div><div><dt>Phạm vi</dt><dd>Việt Nam · giả định</dd></div><div><dt>Trạng thái mẫu</dt><dd>${r.status}</dd></div><div><dt>Nguồn / tư liệu</dt><dd>${r.sources} / ${r.files} (số liệu mẫu)</dd></div><div><dt>Phiên bản</dt><dd>1.2 · Bản thiết kế</dd></div><div><dt>Cập nhật mẫu</dt><dd>${r.date.split('-').reverse().join('.')}</dd></div></dl><div class="info-stamp">HỒ SƠ MINH HỌA<small>FICTIONAL RECORD / DESIGN ONLY</small></div></section>
        <section class="proof-box"><h3>Dấu vết phiên bản</h3><div class="kv"><span>Blockchain dự kiến</span><span>Solana</span></div><div class="kv"><span>Giao dịch</span><span>Chưa phát sinh</span></div><div class="kv"><span>IPFS / CID</span><span>Chưa công bố</span></div><p>Kiểm tra dấu vết dữ liệu, không xác nhận tính đúng đắn của nội dung.</p><button class="text-button" data-article-tab="proof">Đối chiếu tính toàn vẹn <span>→</span></button><button class="text-button" data-action="support">Duy trì thư viện <span>↗</span></button><p>Thanh toán qua Cryptomus.</p></section>
        <div class="right-note">Mực có thể phai.<br>Nguồn dẫn cần còn lại.<small>GHI CHÚ BÊN LỀ / 01</small></div>
      </aside>
    </div>`;
  if (tab === 'read') {
    markSection('overview');
    contentsObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) markSection(visible[0].target.id.replace('section-', ''));
    }, { rootMargin: '-5% 0px -60% 0px', threshold: 0 });
    document.querySelectorAll('.reading-body section[id]').forEach((section) => contentsObserver.observe(section));
  }
  if (tab === 'discussion') setupDiscussion(r.id);
}

function citation(number) {
  return `<button class="reference" data-source="${number}" aria-label="Xem nguồn minh họa ${number}">[${number}]</button>`;
}
function sectionStart(id, index, label) {
  return `<section id="section-${id}" tabindex="-1"><h2><span>${index}</span>${label}</h2>`;
}
function articlePanel(r, tab) {
  const note = dossierNotes[r.id];
  if (tab === 'read') return `
    <section id="section-overview" tabindex="-1"><p class="lead"><strong>${r.title}</strong> là hồ sơ minh họa về ${note.focus}. Trang này sắp xếp các mốc sự kiện, tư liệu và câu hỏi chưa được giải đáp để người đọc có thể lần theo từng nguồn.${citation(1)}</p><p>Bộ tư liệu giả định gồm ${note.materials}. Các nhận định được trình bày tách biệt với nội dung ghi nhận trong tài liệu; thông tin chưa đủ cơ sở được giữ ở trạng thái cần đối chiếu.${citation(2)}</p><blockquote class="document-quote"><p>“${note.quote}”</p><cite>TRÍCH ĐOẠN BIÊN TẬP HƯ CẤU · NGUỒN [1]</cite></blockquote><div class="editor-note"><strong>LƯU Ý BIÊN TẬP</strong>Hồ sơ tổ chức thông tin theo tài liệu, không suy đoán danh tính và không thay thế kết luận của cơ quan có thẩm quyền.</div></section>
    ${sectionStart('timeline', '01', 'Diễn biến')}<p>Ba mốc dưới đây minh họa cách một hồ sơ được tổ chức. Đây không phải lịch sử của một vụ việc thật.</p><div class="wiki-timeline"><div><small>MỐC I / TIẾP NHẬN</small><h3>Tập hợp các tài liệu ban đầu ${citation(1)}</h3><p>Ghi nhận tài liệu, xuất xứ dự kiến và phạm vi có thể công bố. Bản gốc được tách khỏi bản dùng để đọc công khai.</p></div><div><small>MỐC II / ĐỐI CHIẾU</small><h3>Nhận diện những điểm chưa thống nhất ${citation(2)}</h3><p>Đặt các phiên bản cạnh nhau, kiểm tra mốc thời gian và đánh dấu thông tin cần thêm nguồn độc lập.</p></div><div><small>MỐC III / BIÊN TẬP</small><h3>Công bố bản đọc và ghi nhận thay đổi ${citation(3)}</h3><p>Tóm tắt có dẫn nguồn, giữ lại câu hỏi mở và bổ sung lịch sử chỉnh sửa để người đọc theo dõi.</p></div></div></section>
    ${sectionStart('materials', '02', 'Tư liệu')}<p>Mỗi tài liệu cần có nguồn gốc, quyền sử dụng và phiên bản công khai riêng. Hai ô dưới đây là bản minh họa, chưa chứa tệp thực.</p><div class="evidence-pair"><button class="evidence-preview" data-source="1"><span class="mini-document" aria-hidden="true"><span class="mini-sheet"><i></i><i></i><i></i><i></i></span></span><span>01 / Bản ghi nhận tư liệu<small>VĂN BẢN MẪU · CHƯA CÓ TỆP</small></span></button><button class="evidence-preview" data-source="2"><span class="mini-video" aria-hidden="true">▷</span><span>02 / Tư liệu đối chiếu<small>KHUNG XEM MẪU · CHƯA CÓ VIDEO</small></span></button></div></section>
    ${sectionStart('proceedings', '03', 'Thông tin tố tụng')}<p>Nhãn “${r.status}” trong phiếu lưu trữ là trạng thái dùng để kiểm tra bố cục. Không có số bản án, cơ quan xét xử hay phán quyết thật gắn với hồ sơ này.</p><p>Trong bản vận hành, mỗi giai đoạn tố tụng sẽ liên kết đến văn bản tương ứng; trạng thái kháng cáo và hiệu lực pháp luật được ghi riêng.${citation(3)}</p></section>
    ${sectionStart('questions', '04', 'Điểm còn tranh chấp')}<p>Những câu hỏi sau minh họa cách giữ lại sự chưa chắc chắn thay vì đi đến kết luận sớm.</p><div class="open-question"><span>01 /</span>${note.question}</div><div class="open-question"><span>02 /</span>Nguồn độc lập nào có thể xác nhận hoặc bác bỏ cách diễn giải hiện tại?</div><div class="open-question"><span>03 /</span>Thông tin nào cần bổ sung trước khi xuất bản phiên bản tiếp theo?</div></section>
    ${sectionStart('references', '05', 'Nguồn tham khảo')}<p class="fine">Ba nguồn hư cấu dưới đây dùng để thử tương tác chú thích. Không phải tài liệu đã xác thực. Số đếm trong phiếu lưu trữ là số liệu thiết kế.</p><ol class="references-list"><li><button class="source-link" data-source="1">Bản ghi nhận tư liệu ban đầu.</button> Tài liệu mẫu [A], phiên bản 1.0.</li><li><button class="source-link" data-source="2">Phiếu đối chiếu thông tin.</button> Tài liệu mẫu [B], phiên bản 1.1.</li><li><button class="source-link" data-source="3">Nhật ký biên tập và đính chính.</button> Tài liệu mẫu [C], phiên bản 1.2.</li></ol><button class="text-button source-link" data-article-tab="sources">Xem danh mục nguồn →</button></section>`;
  if (tab === 'sources') return `<h2>Danh mục nguồn</h2><p>Ba mục mẫu cho hồ sơ ${r.id}. Mọi nguồn dưới đây đều hư cấu, chưa có tài liệu gốc hoặc URL để đối chiếu.</p><div class="source-register">${sourceData(r).map((source, i) => `<article><span class="source-type">[${i + 1}] / ${source.type}</span><h3>${source.title}</h3><p>${source.description}</p><div class="fine">Tình trạng: nội dung minh họa · Không có tệp đính kèm</div><button class="text-button" data-source="${i + 1}">Đọc trích đoạn mẫu ↗</button></article>`).join('')}</div>`;
  if (tab === 'history') return `<h2>Lịch sử phiên bản</h2><p>Nhật ký mô phỏng. Các phiên bản bên dưới không phải giao dịch blockchain hoặc lịch sử biên tập thực tế.</p><div class="history-entry"><div><span class="version">v1.2</span><br><small>HIỆN TẠI · MẪU</small></div><div><h3>Làm rõ mức độ chắc chắn</h3><p>Bổ sung cách diễn đạt thận trọng và liên kết nguồn tương ứng.</p><details class="diff-toggle"><summary>Xem đối chiếu thay đổi</summary><del class="diff-line deleted">− Thông tin đã được xác nhận.</del><ins class="diff-line added">+ Thông tin được ghi nhận trong tài liệu mẫu, chưa có nguồn độc lập xác nhận.</ins></details></div></div><div class="history-entry"><div><span class="version">v1.1</span><br><small>PHIÊN BẢN MẪU</small></div><div><h3>Bổ sung nguồn và câu hỏi mở</h3><p>Thêm phiếu đối chiếu [2], phân biệt dữ kiện và nhận định.</p></div></div><div class="history-entry"><div><span class="version">v1.0</span><br><small>PHIÊN BẢN MẪU</small></div><div><h3>Tạo cấu trúc hồ sơ</h3><p>Lập mục lục, ghi nhận danh mục tài liệu và khởi tạo bản tóm tắt.</p></div></div><div class="editor-note"><strong>NGUYÊN TẮC</strong>Đính chính là một phần của hồ sơ. Nội dung được thay thế cần có lý do và dấu vết phiên bản.</div>`;
  if (tab === 'discussion') return `<h2>Thảo luận biên tập</h2><p>Nơi trao đổi về nguồn dẫn và cách trình bày. Đây là khu vực xem thử, không gửi nội dung đến máy chủ.</p><div class="discussion-thread"><div class="discussion-meta"><span>GHI CHÚ MẪU / BIÊN TẬP</span><span>01</span></div><p>Phần diễn biến nên ghi riêng những mốc được tài liệu hỗ trợ và những mốc đang chờ nguồn độc lập.</p></div><div id="session-comments" aria-live="polite"></div><form class="discussion-form" id="discussion-form"><label class="form-label" for="discussion-input">Thêm ghi chú thử</label><textarea id="discussion-input" class="form-input" maxlength="1000" required placeholder="Ví dụ: Nên đưa chú thích nguồn ngay sau mốc thời gian…"></textarea><p class="fine">Chỉ dùng nội dung giả. Ghi chú giữ trong bộ nhớ của tab hiện tại và mất khi tải lại.</p><button class="button-primary" type="submit">Thêm ghi chú demo <span>→</span></button><div id="discussion-status" class="status-message" role="status"></div></form>`;
  return `<h2>Đối chiếu tính toàn vẹn</h2><p>Trang này minh họa quy trình xác minh phiên bản hồ sơ trên Solana. Hiện chưa có dữ liệu on-chain để thực hiện kiểm tra.</p><div class="kv"><span>Mạng dự kiến</span><span>Solana / Devnet khi thử nghiệm</span></div><div class="kv"><span>Chữ ký giao dịch</span><span>Chưa phát sinh</span></div><div class="kv"><span>Hash manifest</span><span>Chưa tạo</span></div><div class="kv"><span>IPFS CID</span><span>Chưa công bố</span></div><div class="proof-step"><span>01</span><div><h3>Đọc manifest của phiên bản</h3><p>Lấy bản kê tài liệu công khai và thuật toán hash được chỉ định.</p></div></div><div class="proof-step"><span>02</span><div><h3>Đối chiếu dấu vết trên Solana</h3><p>So sánh hash, bên xuất bản và trạng thái phiên bản đã ghi nhận.</p></div></div><div class="proof-step"><span>03</span><div><h3>Kiểm tra tài liệu và đính chính</h3><p>Kiểm tra từng tệp, đồng thời xem phiên bản đã bị thay thế hoặc rút lại hay chưa.</p></div></div><button class="button-primary full" data-action="verify-demo">Thử kiểm tra điều kiện <span>→</span></button><div id="verify-result" class="check-result" role="status"></div><div class="editor-note"><strong>PHẠM VI CỦA VIỆC XÁC MINH</strong>Hash khớp cho biết dữ liệu khớp với bản được ghi nhận. Không chứng minh tài liệu là thật hoặc một cáo buộc là đúng.</div>`;
}

function sourceData(record) {
  return [
    { title: 'Bản ghi nhận tư liệu ban đầu', type: 'VĂN BẢN MẪU / A', description: `Danh mục giả định cho ${dossierNotes[record.id].focus}.`, quote: dossierNotes[record.id].quote },
    { title: 'Phiếu đối chiếu thông tin', type: 'TƯ LIỆU MẪU / B', description: 'Khung đối chiếu các nguồn và đánh dấu những điểm chưa thống nhất.', quote: 'Nội dung chưa có nguồn độc lập cần được ghi rõ mức độ chắc chắn và phạm vi diễn giải.' },
    { title: 'Nhật ký biên tập và đính chính', type: 'NHẬT KÝ MẪU / C', description: 'Mẫu ghi nhận lý do chỉnh sửa giữa các phiên bản đọc.', quote: 'Phiên bản mới bổ sung nguồn dẫn và làm rõ những thông tin còn đang chờ đối chiếu.' }
  ];
}
function openSource(number) {
  if (!activeRecord) return;
  const source = sourceData(activeRecord)[number - 1];
  if (!source) return;
  openModal(`<div class="detail-tags">CHÚ THÍCH [${number}] / ${activeRecord.id}</div><h2 id="modal-title">${source.title}</h2><p>${source.description}</p><blockquote class="dialog-quote">“${source.quote}”</blockquote><div class="kv"><span>Loại nguồn</span><span>${source.type}</span></div><div class="kv"><span>Tác giả / Đơn vị ban hành</span><span>Không có · dữ liệu hư cấu</span></div><div class="kv"><span>Tệp gốc / URL</span><span>Chưa có</span></div><div class="notice">Trích đoạn được viết cho prototype, không phải trích dẫn từ tài liệu thật.</div><button class="button-primary full" data-action="close">Trở lại bài đọc <span>↩</span></button>`);
}
function setupDiscussion(id) {
  const container = document.querySelector('#session-comments');
  const appendComment = (text, index) => {
    const thread = document.createElement('div');
    thread.className = 'discussion-thread';
    const meta = document.createElement('div');
    meta.className = 'discussion-meta';
    meta.textContent = `BẠN / GHI CHÚ DEMO ${index + 1} · CHỈ TRONG TAB NÀY`;
    const body = document.createElement('p');
    body.textContent = text;
    thread.append(meta, body);
    container.append(thread);
  };
  (sessionComments.get(id) || []).forEach(appendComment);
  document.querySelector('#discussion-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#discussion-input');
    const text = input.value.trim();
    if (!text) { document.querySelector('#discussion-status').textContent = 'Hãy nhập nội dung ghi chú.'; return; }
    const comments = sessionComments.get(id) || [];
    appendComment(text, comments.length);
    comments.push(text);
    sessionComments.set(id, comments);
    input.value = '';
    document.querySelector('#discussion-status').textContent = 'Đã thêm ghi chú vào bản xem thử. Không gửi lên máy chủ.';
  });
}

async function copyRecordLink() {
  if (!activeRecord) return;
  const url = new URL(location.href);
  url.hash = articleHref(activeRecord.id, currentArticleTab);
  let copied = false;
  try { await navigator.clipboard.writeText(url.href); copied = true; } catch { /* Provide a selectable fallback. */ }
  const hint = location.protocol === 'file:' ? 'Đường dẫn file cục bộ chỉ hoạt động trên máy có bộ prototype này.' : ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? 'Đây là liên kết local, chỉ hoạt động trên thiết bị đang chạy bản xem thử.' : 'Liên kết mở đúng trang trong bản preview này; hồ sơ vẫn là dữ liệu minh họa.';
  openModal(`<h2 id="modal-title">${copied ? 'Đã sao chép liên kết.' : 'Liên kết hồ sơ'}</h2><p>Liên kết có thể mở lại đúng hồ sơ và tab hiện tại.</p><label class="form-label" for="record-url">Địa chỉ bản xem thử</label><input class="form-input copy-field" id="record-url" readonly><p class="fine">${hint}</p>`);
  document.querySelector('#record-url').value = url.href;
  if (!copied) { document.querySelector('#record-url').focus(); document.querySelector('#record-url').select(); }
}
