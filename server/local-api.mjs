// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { openStore, digest, fail, limits, uuid } from './store.mjs';
import { createContributions, contributionLimits } from './contributions.mjs';
const scrypt = promisify(scryptCallback);
const sessionAge = 7 * 24 * 60 * 60;
const token = () => randomBytes(32).toString('hex');

async function readBody(request, maxBytes) {
  if (Number(request.headers['content-length']) > maxBytes) fail(413, 'Dữ liệu gửi vượt giới hạn.');
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) fail(413, 'Dữ liệu gửi vượt giới hạn.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function jsonBody(request, maxBytes = 512 * 1024) {
  if (!request.headers['content-type']?.startsWith('application/json')) fail(415, 'Yêu cầu application/json.');
  const bytes = await readBody(request, maxBytes);
  try { return JSON.parse(bytes.toString('utf8')); } catch { fail(400, 'JSON không hợp lệ.'); }
}
const credentials = input => {
  if (!input || typeof input.username !== 'string' || !/^[a-zA-Z0-9_.-]{3,40}$/.test(input.username) || typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128) fail(400, 'Tên đăng nhập 3–40 ký tự a-z, số, _, . hoặc -. Mật khẩu 12–128 ký tự.');
  return { username: input.username.toLowerCase(), password: input.password };
};

export async function createLocalApi({ dataDirectory, origin, mode = 'local', allowHttpPeers = [], intakeHosts = [] } = {}) {
  if (!['local', 'community'].includes(mode)) throw new Error('HSD_MODE must be local or community.');
  const store = await openStore(dataDirectory);
  const contributions = createContributions(store, { mode, allowHttpPeers });
  const cookieName = `hsd_${store.db.prepare("SELECT value FROM instance_meta WHERE key='cookie_namespace'").get().value}`;
  let queue = Promise.resolve();
  const serial = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  const configuredOrigin = origin ? new URL(origin).origin : null;
  if (origin && (!['http:', 'https:'].includes(new URL(origin).protocol) || origin !== configuredOrigin)) { store.close(); throw new Error('HSD_ORIGIN must be an exact http(s) origin without a trailing slash.'); }
  const attempts = new Map();
  const send = (response, status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(data));
  };
  const session = request => {
    const value = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!value || !/^[a-f\d]{64}$/.test(value)) return null;
    return store.db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(digest(value), Date.now()) || null;
  };
  const cookie = value => `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value ? sessionAge : 0}${configuredOrigin?.startsWith('https:') ? '; Secure' : ''}`;
  const createSession = response => {
    const raw = token(), csrf = token();
    store.db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    store.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(raw), csrf, Date.now() + sessionAge * 1000);
    response.setHeader('Set-Cookie', cookie(raw));
    return csrf;
  };
  const sendFile = (response, file) => {
    response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(file.name).replaceAll("'", '%27')}`, 'Content-Length': file.bytes.length });
    response.end(file.bytes);
  };
  function checkOrigin(request, { intake = false, publicRead = false } = {}) {
    const host = request.headers.host;
    if (typeof host !== 'string') fail(403, 'Host không hợp lệ.');
    let current;
    try { current = new URL(`http://${host}`); } catch { fail(403, 'Host không hợp lệ.'); }
    if (current.host !== host || current.username || current.password) fail(403, 'Host không hợp lệ.');
    if (intake && intakeHosts.includes(current.host)) {
      // Explicit private-network alias for server-to-server intake only.
    } else if (configuredOrigin) {
      if (current.host !== new URL(configuredOrigin).host) fail(403, 'Host không nằm trong HSD_ORIGIN.');
    } else if (!['127.0.0.1', 'localhost', '[::1]'].includes(current.hostname)) fail(403, 'Chỉ cho phép localhost; cấu hình HSD_ORIGIN để dùng địa chỉ khác.');
    const expected = configuredOrigin || current.origin;
    if (publicRead) return;
    if (intake) {
      if (request.headers.origin || request.headers.cookie) fail(403, 'Intake chỉ nhận server-to-server bằng khóa đóng góp, không dùng cookie.');
      return;
    }
    if (request.headers.origin && request.headers.origin !== expected) fail(403, 'Origin không được phép.');
    if (request.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Yêu cầu khác nguồn bị từ chối.');
    if (!['GET', 'HEAD'].includes(request.method) && (request.headers.origin !== expected || request.headers['x-hsd-request'] !== '1')) fail(403, 'Thiếu xác nhận yêu cầu cùng nguồn.');
  }
  return {
    store,
    async close() { await queue; store.close(); },
    async handle(request, response) {
      try {
        const path = new URL(request.url, 'http://localhost').pathname;
        const intake = mode === 'community' && (path === '/api/intake' || path.startsWith('/api/intake/'));
        const publicRead = mode === 'community' && request.method === 'GET' && (path === '/community.html' || path === '/community.js' || path.startsWith('/api/publications'));
        checkOrigin(request, { intake, publicRead });
        if (!path.startsWith('/api/')) return false;
        response.setHeader('Cache-Control', 'no-store');
        const method = request.method;
        if (intake) {
          contributions.authenticate(request.headers.authorization);
          const input = path === '/api/intake' && method === 'POST' ? await jsonBody(request, contributionLimits.wireBytes) : undefined;
          await serial(() => {
            const keyId = contributions.authenticate(request.headers.authorization);
            if (path === '/api/intake' && method === 'POST') { send(response, 200, contributions.receive(keyId, input)); return; }
            const match = path.match(/^\/api\/intake\/([a-f\d-]{36})$/);
            if (match && method === 'GET') { send(response, 200, contributions.status(keyId, match[1])); return; }
            fail(404, 'Không có endpoint tiếp nhận này.');
          }); return true;
        }
        if (publicRead && path.startsWith('/api/publications')) {
          await serial(() => {
            if (path === '/api/publications') { send(response, 200, { publications: contributions.publicList() }); return; }
            const match = path.match(/^\/api\/publications\/([a-f\d-]{36})(?:\/files\/([a-f\d-]{36}))?$/);
            if (!match) fail(404, 'Không tìm thấy bản công bố.');
            const value = contributions.publicItem(match[1], match[2]);
            if (match[2]) sendFile(response, value); else send(response, 200, value);
          }); return true;
        }
        if (path === '/api/status' && method === 'GET') {
          const auth = session(request);
          send(response, 200, { mode, setupRequired: !store.db.prepare('SELECT 1 FROM admin').get(), authenticated: Boolean(auth), csrf: auth?.csrf ?? null, limits, contributionLimits }); return true;
        }
        if (['/api/setup', '/api/login'].includes(path) && method === 'POST') {
          const ip = request.socket.remoteAddress;
          let rate = attempts.get(ip);
          if (!rate || Date.now() - rate.since > 15 * 60 * 1000) { rate = { since: Date.now(), count: 0 }; attempts.set(ip, rate); }
          if (++rate.count > 10) fail(429, 'Quá nhiều lần đăng nhập. Thử lại sau 15 phút.');
          const input = credentials(await jsonBody(request, 4096));
          await serial(async () => {
            const admin = store.db.prepare('SELECT * FROM admin').get();
            if (path === '/api/setup') {
              if (admin) fail(409, 'Đã thiết lập quản trị viên.');
              const salt = token();
              const hash = (await scrypt(input.password, salt, 64)).toString('hex');
              store.db.prepare('INSERT INTO admin VALUES (1,?,?,?)').run(input.username, salt, hash);
            } else {
              const hash = await scrypt(input.password, admin?.salt || 'missing-admin-dummy-salt', 64);
              if (!admin || input.username !== admin.username || !timingSafeEqual(hash, Buffer.from(admin.password_hash, 'hex'))) fail(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
            }
            attempts.delete(ip);
            send(response, 200, { authenticated: true, csrf: createSession(response) });
          }); return true;
        }
        const auth = session(request);
        if (!auth) fail(401, 'Cần đăng nhập local.');
        if (!['GET', 'HEAD'].includes(method) && request.headers['x-csrf-token'] !== auth.csrf) fail(403, 'Phiên xác nhận không hợp lệ. Tải lại trang.');
        await serial(async () => {
          // Recheck sessions after queued logout, not just on arrival.
          if (!session(request)) fail(401, 'Phiên đăng nhập đã kết thúc.');
          if (path === '/api/logout' && method === 'POST') {
            store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(auth.token_hash);
            response.setHeader('Set-Cookie', cookie('')); send(response, 200, { ok: true }); return;
          }
          if (path === '/api/connectors') {
            if (method === 'GET') { send(response, 200, { connectors: contributions.connectors() }); return; }
            if (method === 'POST') { send(response, 201, contributions.connect(await jsonBody(request))); return; }
          }
          const connectionMatch = path.match(/^\/api\/connectors\/([a-f\d-]{36})$/);
          if (connectionMatch && method === 'DELETE') { send(response, 200, contributions.disconnect(connectionMatch[1])); return; }
          if (path === '/api/outbox' && method === 'GET') { send(response, 200, { packages: contributions.outbox() }); return; }
          if (path === '/api/outbox/prepare' && method === 'POST') { send(response, 201, await contributions.prepare(await jsonBody(request))); return; }
          const outgoing = path.match(/^\/api\/outbox\/([a-f\d-]{36})(?:\/(send|refresh))?$/);
          if (outgoing) {
            if (!outgoing[2] && method === 'GET') { send(response, 200, contributions.draft(outgoing[1])); return; }
            if (!outgoing[2] && method === 'DELETE') { send(response, 200, contributions.forget(outgoing[1])); return; }
            if (outgoing[2] === 'send' && method === 'POST') { send(response, 200, await contributions.deliver(outgoing[1], await jsonBody(request))); return; }
            if (outgoing[2] === 'refresh' && method === 'POST') { send(response, 200, await contributions.refresh(outgoing[1])); return; }
          }
          if (path === '/api/community/keys') {
            if (method === 'GET') { send(response, 200, { keys: contributions.keys() }); return; }
            if (method === 'POST') { send(response, 201, contributions.issueKey(await jsonBody(request))); return; }
          }
          const keyMatch = path.match(/^\/api\/community\/keys\/([a-f\d-]{36})$/);
          if (keyMatch && method === 'DELETE') { send(response, 200, contributions.revokeKey(keyMatch[1])); return; }
          if (path === '/api/community/submissions' && method === 'GET') { send(response, 200, { submissions: contributions.queue() }); return; }
          const reviewMatch = path.match(/^\/api\/community\/submissions\/([a-f\d-]{36})(?:\/(decision|files)(?:\/([a-f\d-]{36}))?)?$/);
          if (reviewMatch) {
            if (!reviewMatch[2] && method === 'GET') { send(response, 200, contributions.review(reviewMatch[1])); return; }
            if (reviewMatch[2] === 'decision' && method === 'POST') { send(response, 200, contributions.decide(reviewMatch[1], await jsonBody(request))); return; }
            if (reviewMatch[2] === 'files' && reviewMatch[3] && method === 'GET') { sendFile(response, contributions.privateFile(reviewMatch[1], reviewMatch[3])); return; }
          }
          if (path === '/api/records') {
            if (method === 'GET') { send(response, 200, { records: store.list() }); return; }
            if (method === 'POST') { send(response, 201, store.create(await jsonBody(request))); return; }
          }
          const recordMatch = path.match(/^\/api\/records\/([^/]+)(?:\/(attachments|versions)(?:\/(\d+))?)?$/);
          if (recordMatch && uuid(recordMatch[1])) {
            const [, id, child, revision] = recordMatch;
            if (!child && method === 'GET') { send(response, 200, store.detail(id)); return; }
            if (!child && method === 'PUT') { send(response, 200, store.update(id, await jsonBody(request))); return; }
            if (!child && method === 'DELETE') { await store.remove(id, (await jsonBody(request)).revision); send(response, 200, { ok: true }); return; }
            if (child === 'versions' && revision && method === 'GET') { send(response, 200, store.version(id, Number(revision))); return; }
            if (child === 'attachments' && !revision && method === 'POST') {
              const name = new URL(request.url, 'http://localhost').searchParams.get('name');
              const bytes = await readBody(request, limits.fileBytes);
              send(response, 201, await store.attach(id, name, bytes)); return;
            }
          }
          const fileMatch = path.match(/^\/api\/attachments\/([^/]+)$/);
          if (fileMatch && uuid(fileMatch[1])) {
            if (method === 'GET') {
              const file = await store.download(fileMatch[1]);
              response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(file.name).replaceAll("'", '%27')}`, 'Content-Length': file.size });
              response.end(file.bytes); return;
            }
            if (method === 'DELETE') { await store.removeAttachment(fileMatch[1]); send(response, 200, { ok: true }); return; }
          }
          if (path === '/api/backup' && method === 'GET') {
            const bytes = await store.backup();
            response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="ho-so-den-backup.hsd.json"', 'Content-Length': bytes.length });
            response.end(bytes); return;
          }
          if (path === '/api/restore' && method === 'POST') { send(response, 200, await store.restore(await jsonBody(request, limits.backupBytes))); return; }
          fail(404, 'Không có endpoint này.');
        });
        return true;
      } catch (error) {
        if (!response.headersSent && !response.destroyed) send(response, error.status || 500, { error: error.status ? error.message : 'Lỗi lưu trữ. Kiểm tra log server và bản sao lưu.' });
        if (!error.status) console.error('Local API error:', error.code || error.message);
        return true;
      }
    }
  };
}
