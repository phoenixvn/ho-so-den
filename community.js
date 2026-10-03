// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let generation = 0;
  try { document.documentElement.dataset.theme = localStorage.getItem('hoso-reading-theme') === 'ink' ? 'ink' : 'paper'; } catch {}
  async function get(path) {
    const response = await fetch(path, { credentials: 'omit', cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không thể đọc bản công bố.');
    return result;
  }
  async function render() {
    const current = ++generation;
    $('#public-content').replaceChildren(); $('#public-error').hidden = true;
    try {
      const id = location.hash.match(/^#publication\/([a-f\d-]{36})$/)?.[1];
      if (!id) {
        const result = await get('/api/publications'); if (current !== generation) return;
        $('#public-content').innerHTML = '<h1 class="article-title">Thư viện công bố</h1>' + (result.publications.length ? result.publications.map(row => `<article class="local-row"><a href="#publication/${row.id}">${escape(row.title)}</a><small>${escape(row.createdAt)}</small></article>`).join('') : '<p class="local-muted">Chưa có hồ sơ công bố.</p>');
      } else {
        const value = await get(`/api/publications/${id}`); if (current !== generation) return;
        $('#public-content').innerHTML = `<a class="local-back" href="#">← Thư viện công bố</a><h1 class="article-title">${escape(value.record.title)}</h1><p class="local-muted">${escape(value.record.category)} · ${escape(value.createdAt)}${value.credit ? ` · Ghi nhận: ${escape(value.credit)}` : ''}</p><h2>Tổng quan</h2><p class="local-prose">${escape(value.record.summary)}</p><h2>Nội dung</h2><div class="local-prose">${escape(value.record.body)}</div><h2>Nguồn</h2>${value.record.sources.map(source => `<div class="local-source">${source.url ? `<a href="${escape(source.url)}" rel="noreferrer">${escape(source.title)} ↗</a>` : escape(source.title)}<p>${escape(source.note)}</p></div>`).join('') || '<p>Không có nguồn trong bản công bố.</p>'}<h2>Tư liệu công bố (${value.files.length})</h2>${value.files.map(file => `<div class="attachment-row"><div><a href="/api/publications/${id}/files/${file.id}" download>${escape(file.name)} ↓</a><small>${file.size} bytes · SHA-256<br>${file.sha256}</small></div></div>`).join('')}`;
      }
    } catch (error) { if (current === generation) { $('#public-error').textContent = error.message; $('#public-error').hidden = false; } }
  }
  if (!window.HSD_LOCAL) $('#public-content').innerHTML = '<h1 class="article-title">Chưa có community server.</h1><p>Đây là website preview tĩnh. Thư viện công bố chạy trên instance bật HSD_MODE=community.</p>';
  else get('/api/status').then(status => {
    if (status.mode !== 'community') { $('#public-content').textContent = 'Instance này là kho local, chưa bật chế độ cộng đồng.'; return; }
    window.addEventListener('hashchange', render); return render();
  }).catch(error => { $('#public-error').textContent = error.message; $('#public-error').hidden = false; });
})();
