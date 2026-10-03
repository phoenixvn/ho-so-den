// SPDX-License-Identifier: AGPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { createLocalServer } from '../scripts/local.mjs';
import { openStore } from '../server/store.mjs';

const password = 'fictional-test-password-2026';
const sample = { title: 'Hồ sơ nội bộ <script>', category: 'Nghiên cứu', summary: 'Bản ghi local.', body: 'Nội dung riêng\nKhông tự gửi đi.', sources: [{ title: 'Nguồn thử', url: 'https://example.com', note: 'Chỉ là fixture' }] };
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'hsd-test-'));
  let server, origin, cookie, csrf;
  const start = async () => { server = await createLocalServer({ dataDirectory: directory }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`; };
  await start();
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  async function request(path, { method = 'GET', body, raw, auth = true, headers = {} } = {}) {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: { ...(auth && cookie ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { Origin: origin, 'X-HSD-Request': '1', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) } : {}), ...(body !== undefined ? { 'Content-Type': raw ? 'application/octet-stream' : 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
    const value = response.headers.get('set-cookie');
    if (value) cookie = value.split(';')[0];
    return response;
  }
  const setup = async () => { const response = await request('/api/setup', { method: 'POST', body: { username: 'admin', password } }); assert.equal(response.status, 200); csrf = (await response.json()).csrf; };
  const create = async () => { const response = await request('/api/records', { method: 'POST', body: sample }); assert.equal(response.status, 201); return response.json(); };
  return { request, setup, create, directory, csrf: () => csrf, origin: () => origin,
    restart: async () => { await new Promise(resolve => server.close(resolve)); await start(); },
    login: async () => { const response = await request('/api/login', { method: 'POST', body: { username: 'admin', password } }); assert.equal(response.status, 200); csrf = (await response.json()).csrf; }
  };
}

test('local setup is one-time, password/session data is not exposed and auth is required', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/records')).status, 401);
  assert.equal((await (await f.request('/api/status')).json()).setupRequired, true);
  await f.setup();
  assert.equal((await f.request('/api/setup', { method: 'POST', body: { username: 'other', password } })).status, 409);
  const state = await (await f.request('/api/status')).json();
  assert.equal(state.authenticated, true); assert.equal(state.setupRequired, false);
  assert.equal(state.csrf.length, 64);
  assert.equal((await f.request('/data/archive.sqlite')).status, 404);
  const localPage = await (await f.request('/')).text();
  assert.match(localPage, /local-auth-form/);
  assert.match(await (await f.request('/runtime.js')).text(), /HSD_LOCAL = true/);
  assert.equal((await f.request('/api/records', { auth: false })).status, 401);
});

test('origin, Host, CSRF and weak-credential protections reject writes', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/setup', { method: 'POST', body: { username: 'admin', password: 'short' } })).status, 400);
  assert.equal((await f.request('/api/setup', { method: 'POST', body: { username: 'admin', password }, headers: { Origin: 'https://attacker.invalid' } })).status, 403);
  const hostileHostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(`${f.origin()}/api/status`, { headers: { Host: 'attacker.invalid' } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    req.on('error', reject); req.end();
  });
  assert.equal(hostileHostStatus, 403);
  await f.setup();
  assert.equal((await f.request('/api/records', { method: 'POST', body: sample, headers: { 'X-CSRF-Token': 'wrong' } })).status, 403);
  assert.equal((await f.request('/api/records', { method: 'POST', body: sample, headers: { 'X-HSD-Request': '' } })).status, 403);
  assert.equal((await f.request('/api/records', { method: 'POST', body: { ...sample, sources: [{ title: 'Unsafe', url: 'javascript:alert(1)' }] } })).status, 400);
  assert.deepEqual((await (await f.request('/api/records')).json()).records, []);
});

test('records, revision conflicts and private files survive restart', async t => {
  const f = await fixture(t); await f.setup();
  const row = await f.create();
  const updated = await f.request(`/api/records/${row.id}`, { method: 'PUT', body: { ...sample, title: 'Đã cập nhật', revision: 1 } });
  assert.equal(updated.status, 200);
  assert.equal((await f.request(`/api/records/${row.id}`, { method: 'PUT', body: { ...sample, revision: 1 } })).status, 409);
  const upload = await f.request(`/api/records/${row.id}/attachments?name=ghi-chu.txt`, { method: 'POST', body: Buffer.from('private test bytes'), raw: true });
  assert.equal(upload.status, 201);
  const file = await upload.json();
  assert.equal((await f.request(`/api/attachments/${file.id}`, { auth: false })).status, 401);
  await f.restart();
  const detail = await (await f.request(`/api/records/${row.id}`)).json();
  assert.equal(detail.title, 'Đã cập nhật'); assert.equal(detail.revision, 3); assert.equal(detail.versions.length, 3); assert.equal(detail.attachments.length, 1);
  const first = await (await f.request(`/api/records/${row.id}/versions/1`)).json();
  assert.equal(first.snapshot.title, sample.title);
  const downloaded = await f.request(`/api/attachments/${file.id}`);
  assert.match(downloaded.headers.get('content-disposition'), /^attachment;/);
  assert.equal(await downloaded.text(), 'private test bytes');
  assert.equal((await f.request(`/api/records/${row.id}/attachments?name=..%2Fsecret`, { method: 'POST', body: Buffer.from('x'), raw: true })).status, 400);
  assert.equal((await f.request(`/api/records/${row.id}`, { method: 'DELETE', body: { revision: 1 } })).status, 409);
});

test('portable backup restores records, sources, revisions and attachments into a fresh instance', async t => {
  const source = await fixture(t); await source.setup(); const row = await source.create();
  const uploaded = await source.request(`/api/records/${row.id}/attachments?name=fixture.bin`, { method: 'POST', body: Buffer.from([0, 1, 2, 255]), raw: true });
  const file = await uploaded.json();
  const backup = await (await source.request('/api/backup')).json();
  assert.equal(backup.format, 'ho-so-den.archive');
  assert.equal(JSON.stringify(backup).includes(password), false);
  assert.equal('sessions' in backup, false); assert.equal('admin' in backup, false);
  const target = await fixture(t); await target.setup();
  const response = await target.request('/api/restore', { method: 'POST', body: backup });
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  assert.deepEqual(await response.json(), { records: 1, attachments: 1, versions: 2 });
  await target.restart();
  const restored = await (await target.request(`/api/records/${row.id}`)).json();
  assert.equal(restored.body, sample.body); assert.deepEqual(restored.sources, sample.sources);
  assert.deepEqual(Buffer.from(await (await target.request(`/api/attachments/${file.id}`)).arrayBuffer()), Buffer.from([0, 1, 2, 255]));
  assert.equal((await target.request('/api/restore', { method: 'POST', body: backup })).status, 409);
});

test('corrupt/unsupported backups leave the target archive empty', async t => {
  const source = await fixture(t); await source.setup(); const row = await source.create();
  await source.request(`/api/records/${row.id}/attachments?name=note.txt`, { method: 'POST', body: Buffer.from('original'), raw: true });
  const backup = await (await source.request('/api/backup')).json();
  const target = await fixture(t); await target.setup();
  const corrupt = structuredClone(backup); corrupt.attachments[0].data = Buffer.from('modified').toString('base64');
  assert.equal((await target.request('/api/restore', { method: 'POST', body: corrupt })).status, 400);
  const corruptHistory = structuredClone(backup); corruptHistory.versions.at(-1).snapshot.title = 'Different';
  assert.equal((await target.request('/api/restore', { method: 'POST', body: corruptHistory })).status, 400);
  assert.equal((await target.request('/api/restore', { method: 'POST', body: { ...backup, version: 99 } })).status, 400);
  assert.equal((await target.request('/api/restore', { method: 'POST', body: { ...backup, records: [null] } })).status, 400);
  assert.deepEqual((await (await target.request('/api/records')).json()).records, []);
});

test('deleting one attachment does not remove a shared blob used by another case', async t => {
  const f = await fixture(t); await f.setup();
  const a = await f.create(), b = await f.create();
  const bytes = Buffer.from('shared bytes');
  const first = await (await f.request(`/api/records/${a.id}/attachments?name=a.txt`, { method: 'POST', body: bytes, raw: true })).json();
  const second = await (await f.request(`/api/records/${b.id}/attachments?name=b.txt`, { method: 'POST', body: bytes, raw: true })).json();
  assert.equal(first.sha256, second.sha256);
  assert.equal((await f.request(`/api/attachments/${first.id}`, { method: 'DELETE' })).status, 200);
  assert.equal(await (await f.request(`/api/attachments/${second.id}`)).text(), bytes.toString());
  assert.equal((await f.request(`/api/records/${b.id}`, { method: 'DELETE', body: { revision: 2 } })).status, 200);
  await assert.rejects(readFile(join(f.directory, 'blobs', second.sha256)), { code: 'ENOENT' });
});

test('logout revokes the persisted session and repeated bad logins are throttled', async t => {
  const f = await fixture(t); await f.setup();
  assert.equal((await f.request('/api/logout', { method: 'POST' })).status, 200);
  assert.equal((await f.request('/api/records')).status, 401);
  await f.login();
  await f.request('/api/logout', { method: 'POST' });
  for (let i = 0; i < 10; i++) assert.equal((await f.request('/api/login', { method: 'POST', body: { username: 'admin', password: 'wrong-password-at-least-12' } })).status, 401);
  assert.equal((await f.request('/api/login', { method: 'POST', body: { username: 'admin', password } })).status, 429);
});

test('rejects placing private data inside the public directory', async () => {
  await assert.rejects(createLocalServer({ dataDirectory: new URL('../dist/', import.meta.url) }), /outside the public web root/);
});

test('schema v1 upgrades to v2 without changing existing records, versions or blob bytes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'hsd-migration-'));
  let store = await openStore(directory);
  t.after(async () => { store.close(); await rm(directory, { recursive: true, force: true }); });
  const row = store.create(sample);
  const file = await store.attach(row.id, 'migration.txt', Buffer.from('preserve these bytes'));
  const before = store.detail(row.id);
  store.db.exec('DROP TABLE publications; DROP TABLE submission_events; DROP TABLE submissions; DROP TABLE outbox; DROP TABLE connectors; DROP TABLE contribution_keys; DROP TABLE instance_meta; PRAGMA user_version=1;');
  store.close(); store = await openStore(directory);
  assert.equal(store.db.prepare('PRAGMA user_version').get().user_version, 2);
  assert.deepEqual(store.detail(row.id), before);
  assert.equal((await store.download(file.id)).bytes.toString(), 'preserve these bytes');
  assert.equal(store.db.prepare("SELECT value FROM instance_meta WHERE key='cookie_namespace'").get().value.length, 16);
});
