// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const limits = { fileBytes: 25 * 1024 * 1024, backupBytes: 100 * 1024 * 1024, archiveBytes: 60 * 1024 * 1024 };
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export const digest = value => createHash('sha256').update(value).digest('hex');
export const uuid = value => typeof value === 'string' && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const now = () => new Date().toISOString();
const text = (value, max, name, required = false) => {
  if (typeof value !== 'string' || value.length > max || value.includes('\0') || (required && !value.trim())) fail(400, `${name} không hợp lệ.`);
  return value.trim();
};
export function validateRecord(input) {
  if (!input || typeof input !== 'object') fail(400, 'Hồ sơ không hợp lệ.');
  const title = text(input.title, 200, 'Tên hồ sơ', true);
  const summary = text(input.summary ?? '', 3000, 'Tóm tắt');
  const body = text(input.body ?? '', 100000, 'Nội dung');
  const category = text(input.category ?? 'Khác', 80, 'Chủ đề', true);
  const status = input.status ?? 'draft';
  if (!['draft', 'reviewed'].includes(status)) fail(400, 'Trạng thái không hợp lệ.');
  if (!Array.isArray(input.sources ?? []) || (input.sources ?? []).length > 100) fail(400, 'Tối đa 100 nguồn.');
  const sources = (input.sources ?? []).map(source => {
    if (!source || typeof source !== 'object') fail(400, 'Nguồn không hợp lệ.');
    const url = text(source.url ?? '', 2000, 'Địa chỉ nguồn');
    if (url) {
      let parsed;
      try { parsed = new URL(url); } catch { fail(400, 'Địa chỉ nguồn phải là URL HTTP/HTTPS.'); }
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) fail(400, 'Địa chỉ nguồn phải là URL HTTP/HTTPS không chứa tài khoản.');
    }
    return { title: text(source.title, 300, 'Tên nguồn', true), url, note: text(source.note ?? '', 2000, 'Ghi chú nguồn') };
  });
  return { title, summary, body, category, status, sources };
}
function recordRow(row) { return row ? { ...row, sources: JSON.parse(row.sources) } : undefined; }
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)); }

export async function openStore(dataDirectory) {
  const root = resolve(dataDirectory);
  const blobs = join(root, 'blobs');
  await mkdir(blobs, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(root, 'archive.sqlite'), { timeout: 5000 });
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const schema = db.prepare('PRAGMA user_version').get().user_version;
  if (schema > 2) { db.close(); fail(500, 'Database mới hơn phiên bản phần mềm này.'); }
  if (schema === 0) db.exec(`
    BEGIN;
    CREATE TABLE admin (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL) STRICT;
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL) STRICT;
    CREATE TABLE records (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, body TEXT NOT NULL,
      category TEXT NOT NULL, status TEXT NOT NULL, sources TEXT NOT NULL, revision INTEGER NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
    CREATE TABLE versions (record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE, revision INTEGER NOT NULL,
      snapshot TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(record_id,revision)) STRICT;
    CREATE TABLE attachments (id TEXT PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      name TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
    CREATE INDEX attachments_record ON attachments(record_id);
    PRAGMA user_version=1;
    COMMIT;
  `);
  if (schema < 2) db.exec(`
    BEGIN;
    CREATE TABLE instance_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    INSERT INTO instance_meta VALUES ('cookie_namespace',lower(hex(randomblob(8))));
    CREATE TABLE connectors (id TEXT PRIMARY KEY, label TEXT NOT NULL, origin TEXT NOT NULL,
      public_origin TEXT NOT NULL, secret TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
    CREATE TABLE outbox (id TEXT PRIMARY KEY, connector_id TEXT NOT NULL REFERENCES connectors(id),
      record_id TEXT NOT NULL, payload TEXT NOT NULL, payload_hash TEXT NOT NULL, state TEXT NOT NULL,
      receipt TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
    CREATE TABLE contribution_keys (id TEXT PRIMARY KEY, label TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      revoked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL) STRICT;
    CREATE TABLE submissions (id TEXT PRIMARY KEY, key_id TEXT NOT NULL REFERENCES contribution_keys(id),
      client_id TEXT NOT NULL, payload TEXT NOT NULL, payload_hash TEXT NOT NULL, status TEXT NOT NULL,
      revision INTEGER NOT NULL, review TEXT, feedback TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, UNIQUE(key_id,client_id)) STRICT;
    CREATE TABLE submission_events (id INTEGER PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
      status TEXT NOT NULL, feedback TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
    CREATE TABLE publications (id TEXT PRIMARY KEY, submission_id TEXT NOT NULL UNIQUE REFERENCES submissions(id),
      content TEXT NOT NULL, created_at TEXT NOT NULL, withdrawn_at TEXT) STRICT;
    PRAGMA user_version=2;
    COMMIT;
  `);
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const get = id => {
    const row = recordRow(db.prepare('SELECT * FROM records WHERE id=?').get(id));
    if (!row) fail(404, 'Không tìm thấy hồ sơ.');
    return row;
  };
  const files = id => db.prepare('SELECT * FROM attachments WHERE record_id=? ORDER BY created_at,id').all(id);
  const snapshot = (row, reason) => db.prepare('INSERT INTO versions VALUES (?,?,?,?,?)').run(row.id, row.revision, JSON.stringify(row), reason, row.updated_at);
  const insert = row => db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?,?,?,?)').run(row.id, row.title, row.summary, row.body, row.category, row.status, JSON.stringify(row.sources), row.revision, row.created_at, row.updated_at);
  const bump = (id, reason) => {
    db.prepare('UPDATE records SET revision=revision+1,updated_at=? WHERE id=?').run(now(), id);
    snapshot(get(id), reason);
  };
  const writeBlob = async (hash, bytes) => {
    const path = join(blobs, hash);
    try {
      const existing = await readFile(path);
      if (digest(existing) === hash) return;
      fail(409, 'Tệp trên ổ đĩa không khớp hash; cần kiểm tra lưu trữ.');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const temp = join(blobs, `pending-${randomUUID()}`);
    try { await writeFile(temp, bytes, { flag: 'wx', mode: 0o600 }); await rename(temp, path); }
    finally { await unlink(temp).catch(() => {}); }
  };
  const collect = async hashes => {
    for (const hash of new Set(hashes)) if (!db.prepare('SELECT 1 FROM attachments WHERE sha256=?').get(hash)) await unlink(join(blobs, hash)).catch(() => {});
  };
  return {
    db, root,
    close() { db.close(); },
    list() { return db.prepare('SELECT id,title,summary,category,status,revision,created_at,updated_at,(SELECT count(*) FROM attachments a WHERE a.record_id=records.id) AS file_count FROM records ORDER BY updated_at DESC,id').all(); },
    detail(id) { return { ...get(id), attachments: files(id), versions: db.prepare('SELECT revision,reason,created_at FROM versions WHERE record_id=? ORDER BY revision DESC').all(id) }; },
    version(id, revision) {
      const value = db.prepare('SELECT * FROM versions WHERE record_id=? AND revision=?').get(id, revision);
      if (!value) fail(404, 'Không tìm thấy phiên bản.');
      return { ...value, snapshot: JSON.parse(value.snapshot) };
    },
    create(input) {
      const fields = validateRecord(input);
      return transaction(() => {
        const row = { ...fields, id: randomUUID(), revision: 1, created_at: now(), updated_at: now() };
        insert(row); snapshot(row, 'Tạo hồ sơ'); return row;
      });
    },
    update(id, input) {
      const fields = validateRecord(input);
      return transaction(() => {
        const current = get(id);
        if (input.revision !== current.revision) fail(409, 'Hồ sơ đã thay đổi. Tải lại trước khi lưu để tránh ghi đè.');
        const row = { ...current, ...fields, revision: current.revision + 1, updated_at: now() };
        db.prepare('UPDATE records SET title=?,summary=?,body=?,category=?,status=?,sources=?,revision=?,updated_at=? WHERE id=?').run(row.title, row.summary, row.body, row.category, row.status, JSON.stringify(row.sources), row.revision, row.updated_at, id);
        snapshot(row, text(input.reason ?? 'Cập nhật nội dung', 500, 'Lý do', true));
        return row;
      });
    },
    async remove(id, revision) {
      const row = get(id);
      if (revision !== row.revision) fail(409, 'Phiên bản đã thay đổi. Tải lại trước khi xóa.');
      const hashes = files(id).map(file => file.sha256);
      db.prepare('DELETE FROM records WHERE id=?').run(id);
      await collect(hashes);
    },
    async attach(id, name, bytes) {
      get(id);
      name = text(name, 200, 'Tên tệp', true);
      if (/[\\/\x00-\x1f\x7f]/.test(name) || name === '.' || name === '..') fail(400, 'Tên tệp không hợp lệ.');
      if (!bytes.length || bytes.length > limits.fileBytes) fail(413, 'Tệp phải lớn hơn 0 và không quá 25 MiB.');
      const hash = digest(bytes);
      await writeBlob(hash, bytes);
      try {
        return transaction(() => {
          const row = { id: randomUUID(), record_id: id, name, size: bytes.length, sha256: hash, created_at: now() };
          db.prepare('INSERT INTO attachments VALUES (?,?,?,?,?,?)').run(row.id, id, name, row.size, hash, row.created_at);
          bump(id, `Thêm tư liệu: ${name}`); return row;
        });
      } catch (error) { await collect([hash]); throw error; }
    },
    async download(id) {
      const file = db.prepare('SELECT * FROM attachments WHERE id=?').get(id);
      if (!file) fail(404, 'Không tìm thấy tệp.');
      const bytes = await readFile(join(blobs, file.sha256));
      if (digest(bytes) !== file.sha256 || bytes.length !== file.size) fail(409, 'Tệp không khớp hash đã lưu.');
      return { ...file, bytes };
    },
    async removeAttachment(id) {
      const file = db.prepare('SELECT * FROM attachments WHERE id=?').get(id);
      if (!file) fail(404, 'Không tìm thấy tệp.');
      transaction(() => { db.prepare('DELETE FROM attachments WHERE id=?').run(id); bump(file.record_id, `Xóa tư liệu: ${file.name}`); });
      await collect([file.sha256]);
    },
    async backup() {
      const records = db.prepare('SELECT * FROM records ORDER BY id').all().map(recordRow);
      const versions = db.prepare('SELECT * FROM versions ORDER BY record_id,revision').all().map(row => ({ ...row, snapshot: JSON.parse(row.snapshot) }));
      const attachments = db.prepare('SELECT * FROM attachments ORDER BY id').all();
      if ([records, versions, attachments].some(rows => rows.length > 10000)) fail(413, 'Backup vượt giới hạn 10.000 mục của bản alpha.');
      const total = attachments.reduce((sum, file) => sum + file.size, 0);
      if (total > limits.archiveBytes) fail(413, 'Backup trình duyệt hỗ trợ tối đa 60 MiB tư liệu. Dùng sao lưu toàn thư mục data khi dừng server.');
      for (const file of attachments) {
        const bytes = await readFile(join(blobs, file.sha256));
        if (bytes.length !== file.size || digest(bytes) !== file.sha256) fail(409, 'Có tệp bị thiếu hoặc không khớp hash; backup chưa được tạo.');
        file.data = bytes.toString('base64');
      }
      const bytes = Buffer.from(JSON.stringify({ format: 'ho-so-den.archive', version: 1, created_at: now(), records, versions, attachments }));
      if (bytes.length > limits.backupBytes) fail(413, 'Backup vượt giới hạn 100 MiB của bản alpha.');
      return bytes;
    },
    async restore(input) {
      if (db.prepare('SELECT 1 FROM records LIMIT 1').get()) fail(409, 'Chỉ khôi phục vào kho trống. Dữ liệu hiện tại không bị ghi đè.');
      if (!input || input.format !== 'ho-so-den.archive' || input.version !== 1) fail(400, 'Định dạng backup không được hỗ trợ.');
      for (const field of ['records', 'versions', 'attachments']) if (!Array.isArray(input[field]) || input[field].length > 10000) fail(400, 'Cấu trúc backup không hợp lệ.');
      const ids = new Set();
      const records = input.records.map(row => {
        if (!row || typeof row !== 'object') fail(400, 'Hồ sơ backup không hợp lệ.');
        if (!uuid(row.id) || ids.has(row.id) || !Number.isSafeInteger(row.revision) || row.revision < 1 || !validDate(row.created_at) || !validDate(row.updated_at)) fail(400, 'Metadata hồ sơ không hợp lệ.');
        ids.add(row.id);
        return { ...validateRecord(row), id: row.id, revision: row.revision, created_at: row.created_at, updated_at: row.updated_at };
      });
      const seenVersions = new Map();
      const versions = input.versions.map(row => {
        if (!row || typeof row !== 'object') fail(400, 'Phiên bản backup không hợp lệ.');
        if (!ids.has(row.record_id) || !Number.isSafeInteger(row.revision) || row.revision < 1 || !validDate(row.created_at) || !row.snapshot) fail(400, 'Lịch sử không hợp lệ.');
        const key = `${row.record_id}/${row.revision}`;
        if (seenVersions.has(key)) fail(400, 'Phiên bản bị trùng.');
        const owner = records.find(record => record.id === row.record_id);
        if (row.revision > owner.revision || row.snapshot.id !== row.record_id || row.snapshot.revision !== row.revision || !validDate(row.snapshot.created_at) || row.snapshot.updated_at !== row.created_at) fail(400, 'Lịch sử không khớp hồ sơ.');
        const value = { record_id: row.record_id, revision: row.revision, reason: text(row.reason, 500, 'Lý do', true), created_at: row.created_at,
          snapshot: { ...validateRecord(row.snapshot), id: row.record_id, revision: row.revision, created_at: row.snapshot.created_at, updated_at: row.snapshot.updated_at } };
        seenVersions.set(key, value.snapshot);
        return value;
      });
      for (const row of records) {
        if (JSON.stringify(seenVersions.get(`${row.id}/${row.revision}`)) !== JSON.stringify(row)) fail(400, 'Thiếu hoặc sai phiên bản hiện tại.');
        for (let revision = 1; revision <= row.revision; revision++) if (!seenVersions.has(`${row.id}/${revision}`)) fail(400, 'Lịch sử phiên bản không liên tục.');
      }
      const attachmentIds = new Set();
      let total = 0;
      const attachments = input.attachments.map(row => {
        if (!row || typeof row !== 'object') fail(400, 'Tệp backup không hợp lệ.');
        if (!uuid(row.id) || attachmentIds.has(row.id) || !ids.has(row.record_id) || !validDate(row.created_at) || !/^[a-f\d]{64}$/.test(row.sha256)) fail(400, 'Metadata tệp không hợp lệ.');
        attachmentIds.add(row.id);
        const name = text(row.name, 200, 'Tên tệp', true);
        if (/[\\/\x00-\x1f\x7f]/.test(name) || name === '.' || name === '..' || typeof row.data !== 'string') fail(400, 'Tên hoặc nội dung tệp không hợp lệ.');
        const bytes = Buffer.from(row.data, 'base64');
        if (!bytes.length || bytes.length > limits.fileBytes || bytes.toString('base64') !== row.data || bytes.length !== row.size || digest(bytes) !== row.sha256) fail(400, 'Tệp backup không khớp kích thước hoặc SHA-256.');
        total += bytes.length;
        if (total > limits.archiveBytes) fail(413, 'Backup vượt giới hạn 60 MiB tư liệu.');
        return { id: row.id, record_id: row.record_id, name, size: bytes.length, sha256: row.sha256, created_at: row.created_at, bytes };
      });
      try {
        for (const file of attachments) await writeBlob(file.sha256, file.bytes);
        transaction(() => {
          if (db.prepare('SELECT 1 FROM records LIMIT 1').get()) fail(409, 'Kho không còn trống.');
          for (const row of records) insert(row);
          for (const row of versions) db.prepare('INSERT INTO versions VALUES (?,?,?,?,?)').run(row.record_id, row.revision, JSON.stringify(row.snapshot), row.reason, row.created_at);
          for (const row of attachments) db.prepare('INSERT INTO attachments VALUES (?,?,?,?,?,?)').run(row.id, row.record_id, row.name, row.size, row.sha256, row.created_at);
        });
      } catch (error) { await collect(attachments.map(row => row.sha256)); throw error; }
      return { records: records.length, attachments: attachments.length, versions: versions.length };
    }
  };
}
