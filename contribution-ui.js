// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
'use strict';
window.HSDContributionUI = {
  create({ api, showDialog, busy, escape, message, mode }) {
    const $ = selector => document.querySelector(selector);
    const labels = { draft: 'Chưa gửi', delivery_unknown: 'Chưa rõ kết quả — có thể thử lại', received: 'Đã nhận biên nhận', submitted: 'Chờ duyệt riêng', changes_requested: 'Cần bổ sung', rejected: 'Từ chối', approved: 'Đã duyệt · chưa công khai', published: 'Đã công bố', withdrawn: 'Đã rút lại' };
    const close = () => $('#local-dialog').close();
    const actionForm = html => `${html}<div id="contribution-error" class="local-form-error" role="status"></div>`;
    function previewRecord(record) {
      return `<h3>${escape(record.title)}</h3><p class="local-muted">${escape(record.category)}</p><p class="local-dialog-prose">${escape(record.summary)}</p><div class="local-dialog-prose">${escape(record.body || '(Không gửi nội dung ghi chép)')}</div><h4>Nguồn gửi kèm</h4>${record.sources.map(source => `<p class="local-dialog-prose">${escape(source.title)}<br>${escape(source.url)}<br>${escape(source.note)}</p>`).join('') || '<p>Không có nguồn gửi kèm.</p>'}`;
    }
    async function load() {
      const community = mode() === 'community';
      $('#contribution-view').innerHTML = `<a href="#" class="local-back">← Kho riêng của instance</a><div class="local-heading"><div><div class="eyebrow">${community ? 'COMMUNITY / TIẾP NHẬN RIÊNG' : 'LOCAL / CHỦ ĐỘNG GỬI BẢN SAO'}</div><h1>${community ? 'Bàn biên tập' : 'Đóng góp cộng đồng'}</h1></div><button class="button-primary" id="new-connection">${community ? 'Cấp khóa đóng góp' : 'Thêm kết nối'} ＋</button></div><p class="local-muted">${community ? 'Gói mới luôn nằm trong hàng đợi riêng. Duyệt và công bố là hai thao tác tách biệt. Một quản trị viên; SQLite alpha, chưa có OTP nhiều người dùng.' : 'Lưu kết nối không gửi dữ liệu. Chỉ gói đã chọn và xác nhận mới được gửi. Cập nhật trạng thái cũng là thao tác chủ động.'}</p>${community ? '<p><a class="source-link" href="community.html" target="_blank" rel="noopener noreferrer">Mở thư viện công bố ↗</a></p>' : ''}<h2>${community ? 'Khóa người gửi' : 'Instance đã cấu hình'}</h2><div id="peer-list"></div><h2>${community ? 'Hàng đợi đóng góp' : 'Các bản sao đã chọn'}</h2><div id="contribution-list"></div><div class="local-boundary"><p>Backup .hsd.json chỉ chứa hồ sơ local, không gồm khóa, outbox, hàng đợi hoặc bản công bố. Sao lưu toàn bộ data khi dừng server để giữ đầy đủ trạng thái instance.</p></div>`;
      const peers = await api(community ? '/community/keys' : '/connectors');
      const items = community ? peers.keys : peers.connectors;
      $('#peer-list').innerHTML = items.length ? items.map(peer => `<div class="peer-row"><div><strong>${escape(peer.label)}</strong><small>${community ? peer.revoked ? 'Đã thu hồi' : 'Đang có hiệu lực' : escape(peer.origin)}</small></div>${!community || !peer.revoked ? `<button class="button-quiet" data-remove-peer="${peer.id}">${community ? 'Thu hồi' : 'Gỡ kết nối'}</button>` : ''}</div>`).join('') : '<p class="local-muted">Chưa có kết nối/khóa.</p>';
      $('#new-connection').addEventListener('click', () => community ? keyForm() : connectionForm());
      $('#peer-list').querySelectorAll('[data-remove-peer]').forEach(button => button.addEventListener('click', () => {
        showDialog(actionForm(`<h2 id="local-dialog-title">${community ? 'Thu hồi khóa đóng góp?' : 'Gỡ kết nối khỏi local?'}</h2><p>${community ? 'Chặn gửi và xem trạng thái bằng khóa này. Các gói đã nhận vẫn được lưu riêng để xử lý.' : 'Chỉ gỡ kết nối khi không còn bản sao trong outbox dùng khóa này. Không tác động đến dữ liệu trên máy nhận.'}</p><button id="confirm-peer-remove" class="button-primary">Xác nhận</button>`));
        $('#confirm-peer-remove').addEventListener('click', () => busy($('#confirm-peer-remove'), async () => { await api(`${community ? '/community/keys' : '/connectors'}/${button.dataset.removePeer}`, { method: 'DELETE' }); close(); await load(); }, $('#contribution-error')));
      }));
      const result = await api(community ? '/community/submissions' : '/outbox');
      const entries = community ? result.submissions : result.packages;
      $('#contribution-list').innerHTML = entries.length ? entries.map(row => `<article class="peer-row"><div><strong>${escape(row.title)}</strong><small>${escape(labels[row.status || row.remote?.status || row.state])}${!community ? ` · ${escape(row.target)}` : ''}</small>${row.remote?.feedback ? `<p class="local-muted">${escape(row.remote.feedback)}</p>` : ''}${row.publicUrl ? `<a class="source-link" href="${escape(row.publicUrl)}" target="_blank" rel="noopener noreferrer">Bản công bố ↗</a>` : ''}</div><div class="peer-actions"><button class="button-quiet" data-open-package="${row.id}">${community ? 'Xem và duyệt' : 'Xem gói / Gửi'}</button>${!community && row.remote ? `<button class="button-quiet" data-refresh-package="${row.id}">Cập nhật trạng thái</button>` : ''}${!community ? `<button class="text-button" data-forget-package="${row.id}">Xóa bản sao local</button>` : ''}</div></article>`).join('') : '<p class="local-muted">Chưa có gói. Ở kho local, mở hồ sơ rồi chọn “Đóng góp”.</p>';
      $('#contribution-list').querySelectorAll('[data-open-package]').forEach(button => button.addEventListener('click', () => busy(button, () => community ? review(button.dataset.openPackage) : draft(button.dataset.openPackage))));
      $('#contribution-list').querySelectorAll('[data-refresh-package]').forEach(button => button.addEventListener('click', () => busy(button, async () => { await api(`/outbox/${button.dataset.refreshPackage}/refresh`, { method: 'POST' }); await load(); message('Đã chủ động cập nhật trạng thái từ máy nhận.'); })));
      $('#contribution-list').querySelectorAll('[data-forget-package]').forEach(button => button.addEventListener('click', () => {
        showDialog(actionForm('<h2 id="local-dialog-title">Xóa bản sao gói trên local?</h2><p>Không xóa hồ sơ gốc, không rút lại dữ liệu trên máy nhận. Bạn sẽ mất liên kết theo dõi trạng thái của gói này.</p><button class="button-primary" id="confirm-forget">Xóa bản sao</button>'));
        $('#confirm-forget').addEventListener('click', () => busy($('#confirm-forget'), async () => { await api(`/outbox/${button.dataset.forgetPackage}`, { method: 'DELETE' }); close(); await load(); }, $('#contribution-error')));
      }));
    }
    function connectionForm() {
      showDialog(actionForm('<h2 id="local-dialog-title">Kết nối instance cộng đồng</h2><form class="local-editor" id="connection-form"><label>Tên kết nối<input class="form-input" id="peer-label" required maxlength="100"></label><label>Origin máy nhận<input class="form-input" type="url" id="peer-origin" placeholder="https://archive.example.com" required></label><label>Origin để mở bản công bố (nếu khác)<input class="form-input" type="url" id="peer-public-origin" placeholder="Để trống nếu giống máy nhận"></label><label>Khóa đóng góp do máy nhận cấp<input class="form-input" type="password" id="peer-secret" required pattern="[a-f0-9]{64}" autocomplete="off"></label><p class="fine">Khóa được lưu trong database riêng của instance gửi để thực hiện thao tác bạn yêu cầu. Chưa có mã hóa khóa at rest. Lưu cấu hình không gọi máy nhận.</p><button class="button-primary" type="submit">Lưu kết nối</button></form>'));
      $('#connection-form').addEventListener('submit', event => {
        event.preventDefault(); busy($('#connection-form button'), async () => { await api('/connectors', { method: 'POST', body: { label: $('#peer-label').value, origin: $('#peer-origin').value, publicOrigin: $('#peer-public-origin').value, secret: $('#peer-secret').value } }); close(); await load(); }, $('#contribution-error'));
      });
    }
    function keyForm() {
      showDialog(actionForm('<h2 id="local-dialog-title">Cấp khóa cho một người gửi</h2><form id="key-form"><label class="form-label" for="key-label">Tên để quản trị viên nhận biết</label><input class="form-input" id="key-label" required maxlength="100"><button class="button-primary full" type="submit">Tạo khóa riêng</button></form>'));
      $('#key-form').addEventListener('submit', event => {
        event.preventDefault(); busy($('#key-form button'), async () => {
          const result = await api('/community/keys', { method: 'POST', body: { label: $('#key-label').value } });
          close(); await load();
          showDialog('<h2 id="local-dialog-title">Khóa chỉ hiển thị một lần</h2><p>Chuyển khóa này qua kênh riêng cho người gửi. Khóa chỉ cho phép gửi gói và đọc trạng thái của chính người gửi, không cho phép xuất bản.</p><label class="form-label" for="issued-key">Khóa đóng góp</label><input id="issued-key" class="form-input" readonly><p class="fine">Máy nhận chỉ lưu hash của khóa. Nếu mất, cấp khóa mới và thu hồi khóa cũ.</p>');
          $('#issued-key').value = result.secret; $('#issued-key').focus(); $('#issued-key').select();
        }, $('#contribution-error'));
      });
    }
    async function choose(row) {
      const { connectors } = await api('/connectors');
      if (!connectors.length) { message('Thêm kết nối và khóa máy nhận trong mục Đóng góp trước.'); location.hash = '#contributions'; return; }
      showDialog(actionForm(`<h2 id="local-dialog-title">Chọn bản sao gửi cộng đồng</h2><p>${escape(row.title)} · phiên bản ${row.revision}. Tên, tóm tắt và chủ đề được gửi; bạn chọn phần còn lại bên dưới.</p><form class="local-editor" id="prepare-form"><label>Máy nhận<select id="package-target">${connectors.map(peer => `<option value="${peer.id}">${escape(peer.label)} — ${escape(peer.origin)}</option>`).join('')}</select></label><label><input type="checkbox" id="include-body"> Gửi nội dung ghi chép</label><label><input type="checkbox" id="include-sources"> Gửi nguồn dẫn và ghi chú nguồn</label><fieldset class="package-files"><legend>Tệp gửi kèm — mặc định không chọn</legend>${row.attachments.map(file => `<label><input type="checkbox" name="package-file" value="${file.id}"> ${escape(file.name)} <small>${(file.size / 1024).toFixed(1)} KiB</small></label>`).join('') || '<p>Không có tệp.</p>'}</fieldset><label>Tên ghi nhận công khai (có thể để trống)<input class="form-input" id="package-credit" maxlength="200"></label><label>Căn cứ/quyền cho phép công bố<textarea class="form-input" id="package-rights" maxlength="2000" required placeholder="Mô tả nguồn và quyền công bố đối với nội dung/tệp đã chọn"></textarea></label><p class="fine">Tối đa 20 MiB tư liệu/gói. Bước này chỉ tạo bản sao trong outbox local; chưa gửi ra ngoài. Không gửi đường dẫn ổ đĩa, hồ sơ khác hoặc tài khoản quản trị.</p><button type="submit" class="button-primary">Tạo gói và xem trước →</button></form>`));
      $('#prepare-form').addEventListener('submit', event => {
        event.preventDefault(); busy($('#prepare-form button'), async () => {
          const prepared = await api('/outbox/prepare', { method: 'POST', body: { connectorId: $('#package-target').value, recordId: row.id, revision: row.revision,
            attachmentIds: [...document.querySelectorAll('[name="package-file"]:checked')].map(input => input.value), includeBody: $('#include-body').checked, includeSources: $('#include-sources').checked, credit: $('#package-credit').value, rights: $('#package-rights').value } });
          close(); await draft(prepared.id);
        }, $('#contribution-error'));
      });
    }
    async function draft(id) {
      const value = await api(`/outbox/${id}`), packet = value.packet;
      showDialog(actionForm(`<h2 id="local-dialog-title">Xem trước đúng gói sẽ gửi</h2><div class="notice">Đích: ${escape(value.target)}<br>Gói ${id}<br>${escape(labels[value.state])} · ${(value.byteCount / 1024).toFixed(1)} KiB</div>${previewRecord(packet.record)}<h4>Tệp đã chọn (${packet.files.length})</h4>${packet.files.map(file => `<p class="local-muted">${escape(file.name)} · ${file.size} bytes<br><span class="package-hash">${file.sha256}</span></p>`).join('') || '<p>Không gửi tệp.</p>'}<p>Tên ghi nhận: ${escape(packet.credit || '(Không ghi tên)')}</p><p class="local-dialog-prose">Quyền công bố: ${escape(packet.rights)}</p><p class="fine package-hash">SHA-256 gói: ${value.hash}</p><form id="send-package-form"><label class="form-label"><input id="send-package-confirm" type="checkbox" required> Tôi cho phép gửi đúng bản sao trên tới instance đã chọn.</label><button class="button-primary full" type="submit">${value.state === 'draft' ? 'Gửi vào hàng đợi riêng' : 'Thử lại cùng gói / nhận lại biên nhận'} →</button></form><p class="fine">Gửi không tự công khai, không đưa lên IPFS/Solana. Sửa hoặc xóa hồ sơ gốc sau này không thay đổi bản sao trong gói này.</p>`));
      $('#send-package-form').addEventListener('submit', event => {
        event.preventDefault(); busy($('#send-package-form button'), async () => {
          const result = await api(`/outbox/${id}/send`, { method: 'POST', body: { confirm: true, hash: value.hash } });
          close(); message(`Máy nhận xác nhận: ${labels[result.remote.status]}. Hồ sơ local không bị thay đổi.`);
          if (location.hash === '#contributions') await load(); else location.hash = '#contributions';
        }, $('#contribution-error'));
      });
    }
    async function review(id) {
      const value = await api(`/community/submissions/${id}`), packet = value.packet, editable = ['submitted', 'changes_requested'].includes(value.status);
      const selection = value.publication || { record: packet.record, fileIds: packet.files.map(file => file.id), credit: packet.credit };
      showDialog(actionForm(`<h2 id="local-dialog-title">Duyệt đóng góp riêng</h2><div class="notice">${escape(labels[value.status])} · revision ${value.revision}<br>Chưa công bố nếu trạng thái khác “Đã công bố”.</div><details><summary>Xem nguyên bản người gửi</summary>${previewRecord(packet.record)}<p class="local-dialog-prose">Quyền công bố do người gửi khai báo: ${escape(packet.rights)}</p></details><form class="local-editor" id="review-form"><label>Tiêu đề bản công bố<input id="review-title" class="form-input" maxlength="200" required ${editable ? '' : 'readonly'}></label><label>Tóm tắt công khai<textarea id="review-summary" class="form-input" maxlength="3000" ${editable ? '' : 'readonly'}></textarea></label><label>Nội dung công khai<textarea id="review-body" class="form-input" maxlength="100000" ${editable ? '' : 'readonly'}></textarea></label><label>Tên ghi nhận công khai<input id="review-credit" class="form-input" maxlength="200" ${editable ? '' : 'readonly'}></label><fieldset class="package-files"><legend>Tư liệu được chọn để công bố</legend>${packet.files.map(file => `<label><input type="checkbox" name="review-file" value="${file.id}" ${selection.fileIds.includes(file.id) ? 'checked' : ''} ${editable ? '' : 'disabled'}> ${escape(file.name)} <a href="/api/community/submissions/${id}/files/${file.id}" download>Tải riêng ↓</a></label>`).join('') || '<p>Không có tệp.</p>'}</fieldset><label>Lý do / phản hồi (người gửi nhìn thấy)<textarea id="review-feedback" class="form-input" maxlength="2000" required></textarea></label><div class="peer-actions">${editable ? '<button class="button-primary" type="submit" data-decision="approved">Duyệt bản này</button><button class="button-quiet" type="submit" data-decision="rejected">Từ chối</button>' : ''}${['submitted', 'approved'].includes(value.status) ? '<button class="button-quiet" type="submit" data-decision="changes_requested">Yêu cầu bổ sung</button>' : ''}${value.status === 'approved' ? '<label class="form-label"><input id="publish-confirm" type="checkbox"> Tôi đã kiểm tra và muốn công khai đúng bản đã duyệt.</label><button class="button-primary" type="submit" data-decision="published">Xuất bản công khai</button>' : ''}${value.status === 'published' ? '<button class="button-quiet local-delete" type="submit" data-decision="withdrawn">Rút bản công bố</button>' : ''}</div></form><p class="fine">Nguồn dẫn giữ theo bản người gửi; thay đổi tiêu đề/nội dung ở đây chỉ ảnh hưởng bản cộng đồng. Chưa có quét mã độc, tự che thông tin hoặc xác minh sự thật. Rút bản công bố không xóa bản sao đã tải về.</p><details><summary>Lịch sử xử lý</summary>${value.events.map(event => `<p>${escape(labels[event.status])} · ${escape(event.created_at)}<br>${escape(event.feedback)}</p>`).join('')}</details>`));
      $('#review-title').value = selection.record.title; $('#review-summary').value = selection.record.summary; $('#review-body').value = selection.record.body; $('#review-credit').value = selection.credit;
      $('#review-form').addEventListener('submit', event => {
        event.preventDefault(); const button = event.submitter; if (!button?.dataset.decision) return;
        busy(button, async () => {
          const status = button.dataset.decision;
          if (status === 'published' && !$('#publish-confirm').checked) throw new Error('Cần xác nhận bước công bố công khai.');
          const input = { status, revision: value.revision, feedback: $('#review-feedback').value, confirm: status === 'published' };
          if (status === 'approved') input.publication = { record: { ...selection.record, title: $('#review-title').value, summary: $('#review-summary').value, body: $('#review-body').value }, credit: $('#review-credit').value, fileIds: [...document.querySelectorAll('[name="review-file"]:checked')].map(input => input.value) };
          await api(`/community/submissions/${id}/decision`, { method: 'POST', body: input }); close(); await load(); message(`Đã chuyển trạng thái: ${labels[status]}.`);
        }, $('#contribution-error'));
      });
    }
    return {
      load,
      addRecordButton(row) {
        if (mode() !== 'local') return;
        const button = document.createElement('button'); button.className = 'button-quiet'; button.id = 'contribute-record'; button.textContent = 'Đóng góp ↗';
        button.addEventListener('click', () => busy(button, () => choose(row)));
        $('.local-detail-actions').prepend(button);
      }
    };
  }
};
