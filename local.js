// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const date = value => new Date(value).toLocaleString('vi-VN');
  let csrf, setupRequired, authenticated = false, records = [], current, focused, routeCounter = 0, instanceMode = 'local';
  const contributionUI = window.HSDContributionUI.create({ api, showDialog, busy, escape, message, mode: () => instanceMode });
  function message(text) { $('#local-message').textContent = text; $('#local-message').hidden = !text; }
  function theme(value) {
    const ink = value === 'ink';
    document.documentElement.dataset.theme = ink ? 'ink' : 'paper';
    $('#local-theme').setAttribute('aria-pressed', String(ink));
    $('#local-theme').setAttribute('aria-label', ink ? 'Bật Trang giấy' : 'Bật Mực đêm');
    $('#local-theme span').textContent = ink ? 'Mực đêm' : 'Trang giấy';
    try { localStorage.setItem('hoso-reading-theme', ink ? 'ink' : 'paper'); } catch {}
  }
  try { theme(localStorage.getItem('hoso-reading-theme')); } catch { theme('paper'); }
  $('#local-theme').addEventListener('click', () => theme(document.documentElement.dataset.theme === 'ink' ? 'paper' : 'ink'));
  async function api(path, { method = 'GET', body, raw = false, download = false } = {}) {
    const headers = {};
    if (method !== 'GET') { headers['X-HSD-Request'] = '1'; if (csrf) headers['X-CSRF-Token'] = csrf; }
    if (body !== undefined) headers['Content-Type'] = raw ? 'application/octet-stream' : 'application/json';
    const response = await fetch(`/api${path}`, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Không thể đọc phản hồi server.' }));
      if (response.status === 401 && !['/login', '/setup'].includes(path)) {
        authenticated = false; csrf = null; $('#local-dialog').close(); authView();
      }
      throw new Error(error.error || `Lỗi HTTP ${response.status}`);
    }
    return download ? response.blob() : response.json();
  }
  function authView() {
    records = []; current = null; routeCounter++;
    $('#local-list').replaceChildren(); $('#local-detail').replaceChildren();
    $('#contribution-view').hidden = true; $('#contribution-view').replaceChildren();
    $('#local-auth').hidden = false; $('#local-workspace').hidden = true; $('#local-detail').hidden = true; $('#logout').hidden = true;
    $('#auth-title').textContent = setupRequired ? 'Bắt đầu kho lưu trữ riêng.' : 'Trở lại kho local.';
    $('#auth-description').textContent = setupRequired ? 'Tạo quản trị viên đầu tiên. Hồ sơ sẽ được lưu bằng SQLite và tệp riêng trên máy chủ này.' : 'Đăng nhập quản trị viên để đọc và quản lý hồ sơ riêng.';
    $('#auth-submit').textContent = setupRequired ? 'Tạo quản trị viên →' : 'Đăng nhập local →';
    $('#local-password').autocomplete = setupRequired ? 'new-password' : 'current-password';
    $('#connection-label').textContent = `SERVER ${instanceMode.toUpperCase()} · CHƯA ĐĂNG NHẬP`;
  }
  function showDialog(html) {
    focused = document.activeElement;
    $('#local-dialog-content').innerHTML = html;
    $('#local-dialog').showModal();
  }
  $('#local-dialog-close').addEventListener('click', () => $('#local-dialog').close());
  $('#local-dialog').addEventListener('close', () => focused?.isConnected && focused.focus());
  async function busy(button, fn, target) {
    button.disabled = true;
    if (target) target.textContent = '';
    try { await fn(); } catch (error) { if (target?.isConnected) target.textContent = error.message; else message(error.message); }
    finally { button.disabled = false; }
  }
  $('#local-auth-form').addEventListener('submit', event => {
    event.preventDefault();
    busy($('#auth-submit'), async () => {
      const result = await api(setupRequired ? '/setup' : '/login', { method: 'POST', body: { username: $('#local-username').value, password: $('#local-password').value } });
      csrf = result.csrf; authenticated = true; setupRequired = false; $('#local-password').value = ''; message(''); await route();
    });
  });
  $('#logout').addEventListener('click', () => busy($('#logout'), async () => {
    await api('/logout', { method: 'POST' }); authenticated = false; csrf = null; records = []; current = null;
    $('#local-list').replaceChildren(); $('#local-detail').replaceChildren(); location.hash = ''; authView(); message('Đã đăng xuất. Dữ liệu vẫn được lưu trên server local.');
  }));
  function renderList() {
    const query = normalized($('#local-search').value);
    const selected = records.filter(row => normalized(`${row.title} ${row.summary} ${row.category}`).includes(query));
    $('#local-count').textContent = String(records.length).padStart(2, '0');
    $('#local-list').innerHTML = selected.length ? selected.map(row => `<article class="local-row"><div><small>${escape(row.category)} / ${row.status === 'reviewed' ? 'Đã đối chiếu nội bộ' : 'Bản nháp'} · v${row.revision}</small><h2><a href="#record/${row.id}">${escape(row.title)}</a></h2><p>${escape(row.summary.slice(0, 350))}</p><small>${row.file_count} tệp · ${escape(date(row.updated_at))}</small></div><a class="text-button" href="#record/${row.id}" aria-label="Mở ${escape(row.title)}">↗</a></article>`).join('') : '<div class="empty">Chưa có hồ sơ phù hợp. Tạo hồ sơ mới hoặc thay từ khóa tìm kiếm.</div>';
  }
  $('#local-search').addEventListener('input', renderList);
  async function route() {
    if (!authenticated) return;
    const generation = ++routeCounter;
    $('#local-auth').hidden = true; $('#logout').hidden = false;
    $('#connection-label').textContent = `${instanceMode.toUpperCase()} · KHÔNG TỰ ĐỘNG GỬI HỒ SƠ`;
    $('#contribution-nav').textContent = instanceMode === 'community' ? 'Bàn biên tập' : 'Đóng góp / Kết nối';
    $('#contribution-view').hidden = location.hash !== '#contributions';
    if (location.hash === '#contributions') {
      $('#local-workspace').hidden = true; $('#local-detail').hidden = true;
      try { await contributionUI.load(); } catch (error) { message(error.message); }
      return;
    }
    const match = location.hash.match(/^#record\/([a-f\d-]+)$/i);
    try {
      if (match) {
        const row = await api(`/records/${match[1]}`);
        if (generation !== routeCounter || !authenticated) return;
        current = row; $('#local-workspace').hidden = true; $('#local-detail').hidden = false; detail(row);
      } else {
        const result = await api('/records');
        if (generation !== routeCounter || !authenticated) return;
        records = result.records; current = null; $('#local-detail').hidden = true; $('#local-workspace').hidden = false; renderList();
      }
    } catch (error) { message(error.message); if (authenticated && match) location.hash = ''; }
  }
  function detail(row) {
    $('#local-detail').innerHTML = `<a class="local-back" href="#">← Kho của tôi</a><div class="local-detail-heading"><div><div class="eyebrow">HỒ SƠ RIÊNG / ${escape(row.category)}</div><h1>${escape(row.title)}</h1><small>v${row.revision} · ${escape(date(row.updated_at))} · ${row.status === 'reviewed' ? 'Đã đối chiếu nội bộ' : 'Bản nháp'}</small></div><div class="local-detail-actions"><button class="button-quiet" id="edit-record">Chỉnh sửa</button><button class="button-quiet local-delete" id="delete-record">Xóa hồ sơ</button></div></div><div class="local-detail-layout"><div><h2>Tổng quan</h2><p class="local-prose">${escape(row.summary || 'Chưa có tóm tắt.')}</p><h2>Nội dung ghi chép</h2><div class="local-prose">${escape(row.body || 'Chưa có nội dung.')}</div><h2>Nguồn dẫn</h2>${row.sources.length ? row.sources.map((source, i) => `<div class="local-source">[${i + 1}] ${source.url ? `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)} ↗</a>` : escape(source.title)}<p>${escape(source.note)}</p></div>`).join('') : '<p class="local-muted">Chưa thêm nguồn dẫn.</p>'}<h2>Tư liệu (${row.attachments.length})</h2><div>${row.attachments.map(file => `<div class="attachment-row"><div><a href="/api/attachments/${file.id}" download>${escape(file.name)} ↓</a><small>${(file.size / 1024).toFixed(1)} KiB · SHA-256<br>${file.sha256}</small></div><button data-delete-file="${file.id}" aria-label="Xóa ${escape(file.name)}">×</button></div>`).join('') || '<p class="local-muted">Chưa có tệp đính kèm.</p>'}</div><form id="upload-form" class="local-upload-form"><label class="form-label" for="upload-file">Thêm tệp riêng · tối đa 25 MiB</label><input type="file" id="upload-file" class="local-file-input" required><button class="button-primary" type="submit">Lưu tệp vào kho ↑</button><p class="fine">Tệp được tải xuống dưới dạng attachment, không tự chạy hoặc nhúng. Chưa có quét mã độc hoặc chuyển mã video.</p><div class="local-form-error" id="upload-error" role="status"></div></form></div><aside><h2>Lịch sử nội dung</h2><p class="local-muted">Các phiên bản lưu nội dung và nguồn dẫn. Tệp đã xóa không được giữ lại trong lịch sử.</p>${row.versions.map(version => `<div class="local-history"><button data-version="${version.revision}">v${version.revision} / ${escape(version.reason)}</button><small>${escape(date(version.created_at))}</small></div>`).join('')}<h2>Phạm vi công bố</h2><p class="local-muted">Chỉ lưu trên instance của bạn. Trạng thái “đã đối chiếu nội bộ” không phải chứng nhận pháp lý. Chưa gửi lên máy chủ cộng đồng, IPFS hoặc Solana.</p></aside></div>`;
    $('#edit-record').addEventListener('click', () => editor(row));
    contributionUI.addRecordButton(row);
    $('#delete-record').addEventListener('click', () => confirmDelete(row));
    $('#upload-form').addEventListener('submit', event => {
      event.preventDefault();
      busy($('#upload-form button'), async () => {
        const file = $('#upload-file').files[0];
        if (!file || file.size < 1 || file.size > 25 * 1024 * 1024) throw new Error('Chọn tệp từ 1 byte đến 25 MiB.');
        await api(`/records/${row.id}/attachments?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file, raw: true });
        await route(); message('Đã lưu tệp và SHA-256 vào kho riêng.');
      }, $('#upload-error'));
    });
    $('#local-detail').querySelectorAll('[data-delete-file]').forEach(button => button.addEventListener('click', () => {
      const file = row.attachments.find(file => file.id === button.dataset.deleteFile);
      confirmAction('Xóa tư liệu?', `Tệp “${file.name}” sẽ bị gỡ khỏi hồ sơ. Bản đã tải về hoặc backup trước đó không bị thay đổi.`, async () => { await api(`/attachments/${file.id}`, { method: 'DELETE' }); await route(); });
    }));
    $('#local-detail').querySelectorAll('[data-version]').forEach(button => button.addEventListener('click', () => busy(button, async () => {
      const version = await api(`/records/${row.id}/versions/${button.dataset.version}`);
      showDialog(`<h2 id="local-dialog-title">Phiên bản ${version.revision}</h2><p>${escape(version.reason)} · ${escape(date(version.created_at))}</p><h3>${escape(version.snapshot.title)}</h3><p class="local-dialog-prose">${escape(version.snapshot.summary)}</p><div class="local-dialog-prose">${escape(version.snapshot.body)}</div><h3>Nguồn dẫn</h3>${version.snapshot.sources.map(source => `<p>${escape(source.title)}<br>${escape(source.url)}<br>${escape(source.note)}</p>`).join('') || '<p>Chưa có nguồn.</p>'}`);
    })));
  }
  function editor(row) {
    showDialog(`<h2 id="local-dialog-title">${row ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ riêng'}</h2><form class="local-editor" id="record-form"><div><label class="form-label" for="edit-title">Tên hồ sơ</label><input class="form-input" id="edit-title" maxlength="200" required></div><div class="local-editor-pair"><div><label class="form-label" for="edit-category">Chủ đề</label><input class="form-input" id="edit-category" maxlength="80" required></div><div><label class="form-label" for="edit-status">Trạng thái biên tập</label><select id="edit-status"><option value="draft">Bản nháp</option><option value="reviewed">Đã đối chiếu nội bộ</option></select></div></div><div><label class="form-label" for="edit-summary">Tóm tắt</label><textarea class="form-input" id="edit-summary" maxlength="3000"></textarea></div><div><label class="form-label" for="edit-body">Nội dung (văn bản thuần)</label><textarea class="form-input" id="edit-body" maxlength="100000"></textarea></div><div><label class="form-label" for="edit-sources">Nguồn dẫn · mỗi dòng: Tên | URL | Ghi chú</label><textarea class="form-input" id="edit-sources" placeholder="Tài liệu tham khảo | https://example.com | Ghi chú nguồn"></textarea><p class="fine">Có thể bỏ trống URL. Không dùng dấu | trong tên hoặc ghi chú ở bản alpha.</p></div>${row ? '<div><label class="form-label" for="edit-reason">Lý do chỉnh sửa</label><input class="form-input" id="edit-reason" maxlength="500" required value="Cập nhật nội dung"></div>' : ''}<button class="button-primary" type="submit">Lưu hồ sơ →</button><div id="editor-error" class="local-form-error" role="status"></div></form>`);
    $('#local-dialog').classList.add('local-dialog-wide');
    $('#edit-title').value = row?.title || ''; $('#edit-category').value = row?.category || 'Khác'; $('#edit-status').value = row?.status || 'draft';
    $('#edit-summary').value = row?.summary || ''; $('#edit-body').value = row?.body || '';
    $('#edit-sources').value = (row?.sources || []).map(source => `${source.title} | ${source.url} | ${source.note}`).join('\n');
    $('#record-form').addEventListener('submit', event => {
      event.preventDefault();
      busy($('#record-form button'), async () => {
        const sources = $('#edit-sources').value.split('\n').filter(line => line.trim()).map(line => {
          const parts = line.split('|');
          if (parts.length > 3) throw new Error('Mỗi nguồn có tối đa 3 cột, ngăn bởi dấu |.');
          return { title: parts[0].trim(), url: (parts[1] || '').trim(), note: (parts[2] || '').trim() };
        });
        const saved = await api(row ? `/records/${row.id}` : '/records', { method: row ? 'PUT' : 'POST', body: {
          title: $('#edit-title').value, category: $('#edit-category').value, status: $('#edit-status').value, summary: $('#edit-summary').value, body: $('#edit-body').value, sources,
          ...(row ? { revision: row.revision, reason: $('#edit-reason').value } : {})
        } });
        $('#local-dialog').close(); message('Đã lưu hồ sơ trên server local.');
        if (location.hash === `#record/${saved.id}`) await route(); else location.hash = `#record/${saved.id}`;
      }, $('#editor-error'));
    });
  }
  function confirmAction(title, description, action) {
    showDialog(`<h2 id="local-dialog-title">${escape(title)}</h2><p>${escape(description)}</p><button class="button-primary full" id="confirm-action">Xác nhận →</button><div class="local-form-error" id="confirm-error" role="status"></div>`);
    $('#confirm-action').addEventListener('click', () => busy($('#confirm-action'), async () => { await action(); $('#local-dialog').close(); }, $('#confirm-error')));
  }
  function confirmDelete(row) { confirmAction('Xóa hồ sơ và tư liệu?', `Xóa “${row.title}” cùng lịch sử và tệp của hồ sơ. Hãy tạo backup nếu còn cần dữ liệu.`, async () => { await api(`/records/${row.id}`, { method: 'DELETE', body: { revision: row.revision } }); location.hash = ''; message('Đã xóa hồ sơ khỏi kho.'); }); }
  $('#new-record').addEventListener('click', () => editor());
  $('#backup-download').addEventListener('click', () => busy($('#backup-download'), async () => {
    const blob = await api('/backup', { download: true });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `ho-so-den-${new Date().toISOString().slice(0, 10)}.hsd.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    message('Đã tạo backup hồ sơ, lịch sử và tư liệu hiện tại. File không mã hóa; không chứa tài khoản, khóa kết nối, outbox, hàng đợi hoặc bản công bố cộng đồng.');
  }));
  $('#restore-open').addEventListener('click', () => {
    showDialog('<h2 id="local-dialog-title">Khôi phục vào kho trống</h2><p>Chọn file .hsd.json được xuất từ Hồ Sơ Đen. Server kiểm tra cấu trúc và SHA-256 trước khi nhập. Tài khoản quản trị hiện tại được giữ nguyên.</p><form id="restore-form"><input class="local-file-input" type="file" id="restore-file" accept=".json" required><label class="form-label"><input type="checkbox" id="restore-confirm" required> Tôi muốn nhập nội dung backup vào instance này.</label><button class="button-primary full" type="submit">Kiểm tra và khôi phục ↑</button><p class="fine">Chỉ hỗ trợ kho trống; file backup tối đa 100 MiB và tổng tư liệu tối đa 60 MiB. Backup phải là dữ liệu bạn có quyền sử dụng.</p><div id="restore-error" class="local-form-error" role="status"></div></form>');
    $('#restore-form').addEventListener('submit', event => {
      event.preventDefault();
      busy($('#restore-form button'), async () => {
        const file = $('#restore-file').files[0];
        if (!file || file.size > 100 * 1024 * 1024) throw new Error('Backup tối đa 100 MiB.');
        let input;
        try { input = JSON.parse(await file.text()); } catch { throw new Error('File không phải JSON hợp lệ.'); }
        const result = await api('/restore', { method: 'POST', body: input });
        $('#local-dialog').close(); await route(); message(`Đã khôi phục ${result.records} hồ sơ, ${result.attachments} tệp và ${result.versions} phiên bản.`);
      }, $('#restore-error'));
    });
  });
  window.addEventListener('hashchange', route);
  if (window.HSD_LOCAL !== true) { $('#connection-label').textContent = 'WEBSITE PREVIEW'; $('#local-unavailable').hidden = false; }
  else api('/status').then(status => {
    csrf = status.csrf; setupRequired = status.setupRequired; authenticated = status.authenticated; instanceMode = status.mode;
    if (authenticated) return route();
    authView();
  }).catch(error => { message(error.message); $('#connection-label').textContent = 'KHÔNG KẾT NỐI ĐƯỢC SERVER'; });
})();
