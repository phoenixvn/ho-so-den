// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
import { randomBytes, randomUUID } from 'node:crypto';
import { digest, fail, uuid, validateRecord } from './store.mjs';

export const contributionLimits = { wireBytes: 32 * 1024 * 1024, mediaBytes: 20 * 1024 * 1024, files: 50, retainedBytes: 256 * 1024 * 1024 };
const states = ['submitted', 'changes_requested', 'rejected', 'approved', 'published', 'withdrawn'];
const now = () => new Date().toISOString();
const string = (value, max, name, required = false) => {
  if (typeof value !== 'string' || value.length > max || value.includes('\0') || (required && !value.trim())) fail(400, `${name} không hợp lệ.`);
  return value.trim();
};
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(400, 'Gói chứa trường ngoài định dạng cho phép.');
}
function publicRecord(input) {
  keys(input, ['title', 'summary', 'body', 'category', 'sources']);
  if (!Array.isArray(input.sources)) fail(400, 'Nguồn phải là một danh sách.');
  for (const source of input.sources || []) keys(source, ['title', 'url', 'note']);
  const { status, ...record } = validateRecord(input);
  return record;
}
function originURL(value) {
  let url;
  try { url = new URL(value); } catch { fail(400, 'Địa chỉ instance không hợp lệ.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') fail(400, 'Nhập origin HTTP/HTTPS, không đường dẫn, query hoặc tài khoản.');
  return url;
}
function normalizePacket(input) {
  keys(input, ['format', 'version', 'id', 'createdAt', 'sourceRevision', 'record', 'files', 'credit', 'rights']);
  if (input.format !== 'ho-so-den.contribution' || input.version !== 1 || !uuid(input.id) || typeof input.createdAt !== 'string' || !Number.isFinite(Date.parse(input.createdAt)) || !Number.isSafeInteger(input.sourceRevision) || input.sourceRevision < 1) fail(400, 'Định dạng đóng góp không hợp lệ.');
  if (!Array.isArray(input.files) || input.files.length > contributionLimits.files) fail(400, 'Tối đa 50 tệp trong một gói.');
  const seen = new Set(); let total = 0;
  const files = input.files.map(file => {
    keys(file, ['id', 'name', 'size', 'sha256', 'data']);
    if (!uuid(file.id) || seen.has(file.id) || !/^[a-f\d]{64}$/.test(file.sha256) || typeof file.data !== 'string') fail(400, 'Metadata tư liệu không hợp lệ.');
    seen.add(file.id);
    const name = string(file.name, 200, 'Tên tệp', true);
    if (/[\\/\x00-\x1f\x7f]/.test(name) || name === '.' || name === '..') fail(400, 'Tên tư liệu không hợp lệ.');
    const bytes = Buffer.from(file.data, 'base64');
    total += bytes.length;
    if (total > contributionLimits.mediaBytes) fail(413, 'Gói đóng góp tối đa 20 MiB tư liệu.');
    if (!bytes.length || file.size !== bytes.length || bytes.toString('base64') !== file.data || digest(bytes) !== file.sha256) fail(400, 'Tư liệu không khớp kích thước hoặc SHA-256.');
    return { id: file.id, name, size: bytes.length, sha256: file.sha256, data: file.data };
  });
  return { format: input.format, version: 1, id: input.id, createdAt: input.createdAt, sourceRevision: input.sourceRevision,
    record: publicRecord(input.record), files, credit: string(input.credit, 200, 'Tên ghi nhận'), rights: string(input.rights, 2000, 'Quyền công bố', true) };
}
const redactPacket = packet => ({ ...packet, files: packet.files.map(({ data, ...file }) => file) });

export function createContributions(store, { mode = 'local', allowHttpPeers = [] } = {}) {
  const db = store.db;
  const guard = expected => { if (mode !== expected) fail(404, 'Chức năng không có trong chế độ instance này.'); };
  const transaction = fn => { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  const connector = id => {
    const row = db.prepare('SELECT * FROM connectors WHERE id=?').get(id);
    if (!row) fail(404, 'Chưa cấu hình kết nối này.');
    return row;
  };
  const submission = id => {
    const row = db.prepare('SELECT * FROM submissions WHERE id=?').get(id);
    if (!row) fail(404, 'Không tìm thấy đóng góp.');
    return row;
  };
  const receipt = row => {
    const publication = db.prepare('SELECT id FROM publications WHERE submission_id=? AND withdrawn_at IS NULL').get(row.id);
    return { id: row.id, clientId: row.client_id, hash: row.payload_hash, status: row.status, feedback: row.feedback,
      updatedAt: row.updated_at, publicPath: publication && row.status === 'published' ? `/community.html#publication/${publication.id}` : null };
  };
  const viewOutbox = row => {
    const packet = JSON.parse(row.payload), target = connector(row.connector_id), remote = row.receipt ? JSON.parse(row.receipt) : null;
    return { id: row.id, recordId: row.record_id, title: packet.record.title, connectorId: row.connector_id, target: target.origin,
      state: row.state, hash: row.payload_hash, remote, createdAt: row.created_at,
      publicUrl: remote?.publicPath ? `${target.public_origin}${remote.publicPath}` : null };
  };
  const outbox = id => { const row = db.prepare('SELECT * FROM outbox WHERE id=?').get(id); if (!row) fail(404, 'Không tìm thấy gói đã chọn.'); return row; };
  const peerURL = value => {
    const url = originURL(value);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !allowHttpPeers.includes(url.origin)) fail(400, 'HTTP chỉ dùng cho loopback hoặc peer được operator cho phép; dùng HTTPS cho Internet.');
    return url;
  };
  async function contact(target, path, method, payload) {
    peerURL(target.origin);
    let response;
    try {
      response = await fetch(`${target.origin}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${target.secret}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) }, body: payload });
      if (!response.ok) { await response.body?.cancel(); fail(502, `Instance cộng đồng trả HTTP ${response.status}. Kiểm tra khóa, dung lượng và trạng thái máy nhận.`); }
      const reader = response.body.getReader(); const chunks = []; let size = 0;
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 65536) { await reader.cancel(); fail(502, 'Phản hồi cộng đồng quá lớn.'); } chunks.push(Buffer.from(part.value)); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) { if (error.status) throw error; fail(502, 'Chưa xác nhận được kết quả từ máy nhận. Có thể thử lại cùng gói, không tạo gói mới.'); }
  }
  function checkReceipt(value, row) {
    if (!value || !uuid(value.id) || value.clientId !== row.id || value.hash !== row.payload_hash || !states.includes(value.status) || typeof value.feedback !== 'string' || value.feedback.length > 2000 || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) fail(502, 'Biên nhận không khớp gói đã gửi.');
    if (value.publicPath !== null && (value.status !== 'published' || !/^\/community\.html#publication\/[a-f\d-]{36}$/.test(value.publicPath))) fail(502, 'Liên kết công bố không hợp lệ.');
    return { id: value.id, clientId: value.clientId, hash: value.hash, status: value.status, feedback: value.feedback, updatedAt: value.updatedAt, publicPath: value.publicPath };
  }
  return {
    mode,
    connectors() { guard('local'); return db.prepare('SELECT id,label,origin,public_origin,created_at FROM connectors ORDER BY created_at').all(); },
    connect(input) {
      guard('local'); keys(input, ['label', 'origin', 'publicOrigin', 'secret']);
      const url = peerURL(input.origin);
      const publicOrigin = originURL(input.publicOrigin || url.origin).origin;
      if (!/^[a-f\d]{64}$/.test(input.secret)) fail(400, 'Khóa đóng góp phải gồm 64 ký tự hex.');
      const id = randomUUID();
      db.prepare('INSERT INTO connectors VALUES (?,?,?,?,?,?)').run(id, string(input.label, 100, 'Tên kết nối', true), url.origin, publicOrigin, input.secret, now());
      return { id };
    },
    disconnect(id) {
      guard('local'); connector(id);
      if (db.prepare('SELECT 1 FROM outbox WHERE connector_id=?').get(id)) fail(409, 'Xóa các bản sao gói gửi thuộc kết nối trước khi gỡ khóa.');
      db.prepare('DELETE FROM connectors WHERE id=?').run(id); return { ok: true };
    },
    async prepare(input) {
      guard('local'); keys(input, ['connectorId', 'recordId', 'revision', 'attachmentIds', 'includeBody', 'includeSources', 'credit', 'rights']);
      connector(input.connectorId);
      const row = store.detail(input.recordId);
      if (row.revision !== input.revision) fail(409, 'Hồ sơ đã thay đổi. Tải lại và chọn gói mới.');
      if (typeof input.includeBody !== 'boolean' || typeof input.includeSources !== 'boolean' || !Array.isArray(input.attachmentIds) || input.attachmentIds.length > contributionLimits.files || new Set(input.attachmentIds).size !== input.attachmentIds.length) fail(400, 'Lựa chọn nội dung không hợp lệ.');
      const selected = input.attachmentIds.map(id => { const file = row.attachments.find(file => file.id === id); if (!file) fail(400, 'Chỉ chọn tệp thuộc hồ sơ này.'); return file; });
      if (selected.reduce((sum, file) => sum + file.size, 0) > contributionLimits.mediaBytes) fail(413, 'Gói tối đa 20 MiB tư liệu.');
      const files = [];
      for (const file of selected) {
        const content = await store.download(file.id);
        files.push({ id: randomUUID(), name: file.name, size: file.size, sha256: file.sha256, data: content.bytes.toString('base64') });
      }
      const packet = normalizePacket({ format: 'ho-so-den.contribution', version: 1, id: randomUUID(), createdAt: now(), sourceRevision: row.revision,
        record: { title: row.title, summary: row.summary, category: row.category, body: input.includeBody ? row.body : '', sources: input.includeSources ? row.sources : [] },
        files, credit: input.credit, rights: input.rights });
      const payload = JSON.stringify(packet), hash = digest(payload);
      if (Buffer.byteLength(payload) > contributionLimits.wireBytes) fail(413, 'Gói JSON vượt giới hạn 32 MiB.');
      const retained = db.prepare('SELECT coalesce(sum(length(CAST(payload AS BLOB))),0) AS size FROM outbox').get().size;
      if (retained + Buffer.byteLength(payload) > contributionLimits.retainedBytes) fail(413, 'Outbox vượt 256 MiB. Xóa các bản sao gói không còn cần.');
      db.prepare('INSERT INTO outbox VALUES (?,?,?,?,?,?,?,?,?)').run(packet.id, input.connectorId, row.id, payload, hash, 'draft', null, packet.createdAt, packet.createdAt);
      return { ...viewOutbox(outbox(packet.id)), packet: redactPacket(packet), byteCount: Buffer.byteLength(payload) };
    },
    outbox() { guard('local'); return db.prepare('SELECT * FROM outbox ORDER BY created_at DESC').all().map(viewOutbox); },
    draft(id) { guard('local'); const row = outbox(id); return { ...viewOutbox(row), packet: redactPacket(JSON.parse(row.payload)), byteCount: Buffer.byteLength(row.payload) }; },
    forget(id) { guard('local'); outbox(id); db.prepare('DELETE FROM outbox WHERE id=?').run(id); return { ok: true }; },
    async deliver(id, confirmation) {
      guard('local'); const row = outbox(id);
      if (confirmation?.confirm !== true || confirmation.hash !== row.payload_hash) fail(400, 'Phải xác nhận đúng hash của gói xem trước.');
      try {
        const value = checkReceipt(await contact(connector(row.connector_id), '/api/intake', 'POST', row.payload), row);
        db.prepare('UPDATE outbox SET state=?,receipt=?,updated_at=? WHERE id=?').run('received', JSON.stringify(value), now(), id);
      } catch (error) { db.prepare('UPDATE outbox SET state=?,updated_at=? WHERE id=?').run('delivery_unknown', now(), id); throw error; }
      return viewOutbox(outbox(id));
    },
    async refresh(id) {
      guard('local'); const row = outbox(id);
      if (!row.receipt) fail(409, 'Chưa có biên nhận. Dùng gửi/thử lại cùng gói để xác nhận.');
      const prior = JSON.parse(row.receipt);
      const value = checkReceipt(await contact(connector(row.connector_id), `/api/intake/${prior.id}`, 'GET'), row);
      db.prepare('UPDATE outbox SET receipt=?,updated_at=? WHERE id=?').run(JSON.stringify(value), now(), id);
      return viewOutbox(outbox(id));
    },
    keys() { guard('community'); return db.prepare('SELECT id,label,revoked,created_at FROM contribution_keys ORDER BY created_at').all(); },
    issueKey(input) {
      guard('community'); const secret = randomBytes(32).toString('hex'), id = randomUUID();
      db.prepare('INSERT INTO contribution_keys VALUES (?,?,?,0,?)').run(id, string(input?.label, 100, 'Tên người gửi', true), digest(secret), now());
      return { id, secret };
    },
    revokeKey(id) { guard('community'); db.prepare('UPDATE contribution_keys SET revoked=1 WHERE id=?').run(id); return { ok: true }; },
    authenticate(header) {
      guard('community'); const match = typeof header === 'string' && header.match(/^Bearer ([a-f\d]{64})$/);
      const key = match && db.prepare('SELECT id FROM contribution_keys WHERE token_hash=? AND revoked=0').get(digest(match[1]));
      if (!key) fail(401, 'Khóa đóng góp không hợp lệ hoặc đã thu hồi.');
      return key.id;
    },
    receive(keyId, input) {
      guard('community');
      if (!db.prepare('SELECT 1 FROM contribution_keys WHERE id=? AND revoked=0').get(keyId)) fail(401, 'Khóa đã bị thu hồi.');
      const packet = normalizePacket(input), payload = JSON.stringify(packet), hash = digest(payload);
      const prior = db.prepare('SELECT * FROM submissions WHERE key_id=? AND client_id=?').get(keyId, packet.id);
      if (prior) { if (prior.payload_hash !== hash) fail(409, 'Submission ID đã tồn tại với nội dung khác.'); return receipt(prior); }
      const retained = db.prepare('SELECT coalesce(sum(length(CAST(payload AS BLOB))),0) AS size FROM submissions').get().size;
      if (retained + Buffer.byteLength(payload) > contributionLimits.retainedBytes) fail(413, 'Hàng đợi chạm giới hạn lưu trữ alpha.');
      if (db.prepare('SELECT count(*) AS n FROM submissions WHERE key_id=?').get(keyId).n >= 50) fail(429, 'Khóa đã đạt giới hạn 50 gói của bản alpha.');
      return transaction(() => {
        const id = randomUUID(), time = now();
        db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,1,NULL,?,?,?)').run(id, keyId, packet.id, payload, hash, 'submitted', '', time, time);
        db.prepare('INSERT INTO submission_events(submission_id,status,feedback,created_at) VALUES (?,?,?,?)').run(id, 'submitted', '', time);
        return receipt(submission(id));
      });
    },
    status(keyId, id) {
      guard('community'); const row = db.prepare('SELECT * FROM submissions WHERE id=? AND key_id=?').get(id, keyId);
      if (!row) fail(404, 'Không tìm thấy đóng góp thuộc khóa này.');
      return receipt(row);
    },
    queue() {
      guard('community'); return db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all().map(row => ({ id: row.id, title: JSON.parse(row.payload).record.title, status: row.status, revision: row.revision, createdAt: row.created_at }));
    },
    review(id) {
      guard('community'); const row = submission(id);
      return { id: row.id, status: row.status, revision: row.revision, hash: row.payload_hash, packet: redactPacket(JSON.parse(row.payload)), publication: row.review ? JSON.parse(row.review) : null,
        feedback: row.feedback, events: db.prepare('SELECT status,feedback,created_at FROM submission_events WHERE submission_id=? ORDER BY id').all(id) };
    },
    privateFile(id, fileId) {
      guard('community'); const packet = JSON.parse(submission(id).payload), file = packet.files.find(file => file.id === fileId);
      if (!file) fail(404, 'Không có tệp này.'); return { name: file.name, bytes: Buffer.from(file.data, 'base64') };
    },
    decide(id, input) {
      guard('community'); const row = submission(id);
      if (input?.revision !== row.revision) fail(409, 'Hàng đợi đã thay đổi. Tải lại trước khi duyệt.');
      const transitions = { submitted: ['approved', 'changes_requested', 'rejected'], changes_requested: ['approved', 'rejected'], approved: ['published', 'changes_requested', 'rejected'], published: ['withdrawn'] };
      if (!transitions[row.status]?.includes(input.status)) fail(409, 'Chuyển trạng thái không hợp lệ.');
      const feedback = string(input.feedback, 2000, 'Lý do (người gửi nhìn thấy)', true);
      const packet = JSON.parse(row.payload); let review = row.review;
      if (input.status === 'approved') {
        keys(input.publication, ['record', 'fileIds', 'credit']);
        const files = input.publication.fileIds;
        if (!Array.isArray(files) || new Set(files).size !== files.length || files.some(id => !packet.files.some(file => file.id === id))) fail(400, 'Chỉ công bố tư liệu có trong gói gửi.');
        review = JSON.stringify({ record: publicRecord(input.publication.record), fileIds: files, credit: string(input.publication.credit, 200, 'Tên ghi nhận công khai') });
      }
      if (input.status === 'published' && input.confirm !== true) fail(400, 'Cần xác nhận công bố công khai bản đã duyệt.');
      return transaction(() => {
        if (input.status === 'published') {
          const approved = JSON.parse(review);
          const content = { record: approved.record, credit: approved.credit, files: packet.files.filter(file => approved.fileIds.includes(file.id)) };
          db.prepare('INSERT INTO publications VALUES (?,?,?,?,NULL)').run(randomUUID(), id, JSON.stringify(content), now());
        }
        if (input.status === 'withdrawn') db.prepare('UPDATE publications SET withdrawn_at=? WHERE submission_id=?').run(now(), id);
        db.prepare('UPDATE submissions SET status=?,revision=revision+1,review=?,feedback=?,updated_at=? WHERE id=?').run(input.status, review, feedback, now(), id);
        db.prepare('INSERT INTO submission_events(submission_id,status,feedback,created_at) VALUES (?,?,?,?)').run(id, input.status, feedback, now());
        return this.review(id);
      });
    },
    publicList() {
      guard('community'); return db.prepare('SELECT id,content,created_at FROM publications WHERE withdrawn_at IS NULL ORDER BY created_at DESC').all().map(row => ({ id: row.id, title: JSON.parse(row.content).record.title, createdAt: row.created_at }));
    },
    publicItem(id, fileId) {
      guard('community'); const row = db.prepare('SELECT * FROM publications WHERE id=? AND withdrawn_at IS NULL').get(id);
      if (!row) fail(404, 'Bản công bố không tồn tại hoặc đã rút lại.');
      const content = JSON.parse(row.content);
      if (fileId) { const file = content.files.find(file => file.id === fileId); if (!file) fail(404, 'Tệp không được công bố.'); return { name: file.name, bytes: Buffer.from(file.data, 'base64') }; }
      return { id: row.id, record: content.record, credit: content.credit, files: content.files.map(({ data, ...file }) => file), createdAt: row.created_at };
    }
  };
}
