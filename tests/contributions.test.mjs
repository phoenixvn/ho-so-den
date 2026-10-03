// SPDX-License-Identifier: AGPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { createLocalServer } from '../scripts/local.mjs';

async function instance(t, mode = 'local') {
  const directory = await mkdtemp(join(tmpdir(), 'hsd-contrib-'));
  let server, origin, cookie, csrf;
  const start = async () => { server = await createLocalServer({ dataDirectory: directory, mode }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`; };
  await start();
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { force: true, recursive: true }); });
  const request = async (path, method = 'GET', body, { auth = true, raw = false } = {}) => {
    const response = await fetch(`${origin}/api${path}`, { method, headers: { ...(cookie && auth ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { Origin: origin, 'X-HSD-Request': '1', ...(csrf && auth ? { 'X-CSRF-Token': csrf } : {}) } : {}), ...(body !== undefined ? { 'Content-Type': raw ? 'application/octet-stream' : 'application/json' } : {}) }, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return response;
  };
  const ok = async (path, method = 'GET', body, options) => { const response = await request(path, method, body, options); const value = await response.json(); assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(value)}`); return value; };
  const setup = await ok('/setup', 'POST', { username: 'operator', password: 'fictional-community-test-password' }); csrf = setup.csrf;
  return { request, ok, origin: () => origin, cookie: () => cookie, restart: async () => { await new Promise(resolve => server.close(resolve)); await start(); } };
}
async function pair(t) {
  const local = await instance(t), remote = await instance(t, 'community');
  const key = await remote.ok('/community/keys', 'POST', { label: 'Fixture contributor' });
  const connection = await local.ok('/connectors', 'POST', { label: 'Fixture receiver', origin: remote.origin(), publicOrigin: remote.origin(), secret: key.secret });
  const row = await local.ok('/records', 'POST', { title: 'Selected case', summary: 'Public summary', body: 'PRIVATE BODY NEVER SENT', sources: [{ title: 'PRIVATE SOURCE', note: 'private note' }] });
  const selected = await local.ok(`/records/${row.id}/attachments?name=selected.txt`, 'POST', Buffer.from('selected bytes'), { raw: true });
  const privateFile = await local.ok(`/records/${row.id}/attachments?name=private.txt`, 'POST', Buffer.from('PRIVATE FILE NEVER SENT'), { raw: true });
  const detail = await local.ok(`/records/${row.id}`);
  const prepare = () => local.ok('/outbox/prepare', 'POST', { connectorId: connection.id, recordId: row.id, revision: detail.revision, attachmentIds: [selected.id], includeBody: false, includeSources: false, credit: 'Voluntary credit', rights: 'Fictional fixture owned by test contributor.' });
  const send = draft => local.ok(`/outbox/${draft.id}/send`, 'POST', { confirm: true, hash: draft.hash });
  return { local, remote, key, connection, row, selected, privateFile, detail, prepare, send };
}
function wire(remote, key, path, method = 'GET', body, extra = {}) {
  return fetch(`${remote.origin()}/api${path}`, { method, headers: { Authorization: `Bearer ${key.secret}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
}

test('selective preview makes no submission; frozen copy sends only selected content and retries idempotently', async t => {
  const f = await pair(t);
  assert.deepEqual((await f.remote.ok('/community/submissions')).submissions, []);
  const draft = await f.prepare();
  assert.equal(draft.packet.record.body, ''); assert.deepEqual(draft.packet.record.sources, []);
  assert.equal(draft.packet.files.length, 1); assert.equal(draft.packet.files[0].name, 'selected.txt');
  assert.equal('data' in draft.packet.files[0], false);
  assert.equal(JSON.stringify(draft.packet).includes(f.row.id), false);
  assert.deepEqual((await f.remote.ok('/community/submissions')).submissions, []);
  assert.equal((await f.local.request(`/outbox/${draft.id}/send`, 'POST', { confirm: true, hash: 'wrong' })).status, 400);
  await f.local.ok(`/records/${f.row.id}`, 'PUT', { ...f.detail, title: 'LOCAL CHANGED AFTER PREVIEW' });
  await f.local.ok(`/attachments/${f.selected.id}`, 'DELETE');
  const delivered = await f.send(draft), retried = await f.send(draft);
  assert.equal(delivered.remote.id, retried.remote.id);
  assert.equal((await f.remote.ok('/community/submissions')).submissions.length, 1);
  const review = await f.remote.ok(`/community/submissions/${delivered.remote.id}`);
  assert.equal(review.packet.record.title, 'Selected case');
  assert.equal(JSON.stringify(review).includes('PRIVATE BODY'), false);
  assert.equal(JSON.stringify(review).includes('private.txt'), false);
  const downloaded = await f.remote.request(`/community/submissions/${review.id}/files/${review.packet.files[0].id}`);
  assert.equal(await downloaded.text(), 'selected bytes');
  assert.equal((await f.local.ok(`/records/${f.row.id}`)).title, 'LOCAL CHANGED AFTER PREVIEW');
});

test('private intake, approve then publish, status refresh, and withdrawal do not change local records', async t => {
  const f = await pair(t), draft = await f.prepare(), sent = await f.send(draft);
  const id = sent.remote.id;
  assert.equal((await f.remote.request(`/community/submissions/${id}`, 'GET', undefined, { auth: false })).status, 401);
  assert.deepEqual((await f.remote.ok('/publications', 'GET', undefined, { auth: false })).publications, []);
  const review = await f.remote.ok(`/community/submissions/${id}`);
  assert.equal((await f.remote.request(`/community/submissions/${id}/decision`, 'POST', { revision: 1, status: 'published', feedback: 'Premature', confirm: true })).status, 409);
  const approved = await f.remote.ok(`/community/submissions/${id}/decision`, 'POST', { revision: 1, status: 'approved', feedback: 'Reviewed fixture', publication: { record: { ...review.packet.record, title: 'Community-edited title' }, fileIds: review.packet.files.map(file => file.id), credit: '' } });
  assert.equal(approved.status, 'approved');
  assert.deepEqual((await f.remote.ok('/publications', 'GET', undefined, { auth: false })).publications, []);
  assert.equal((await f.remote.request(`/community/submissions/${id}/decision`, 'POST', { revision: 2, status: 'published', feedback: 'Missing confirmation' })).status, 400);
  await f.remote.ok(`/community/submissions/${id}/decision`, 'POST', { revision: 2, status: 'published', feedback: 'Public release approved', confirm: true });
  const status = await f.local.ok(`/outbox/${draft.id}/refresh`, 'POST');
  assert.equal(status.remote.status, 'published'); assert.ok(status.publicUrl.startsWith(f.remote.origin()));
  const list = (await f.remote.ok('/publications', 'GET', undefined, { auth: false })).publications;
  assert.equal(list.length, 1);
  const publicItem = await f.remote.ok(`/publications/${list[0].id}`, 'GET', undefined, { auth: false });
  assert.equal(publicItem.record.title, 'Community-edited title'); assert.equal(publicItem.credit, '');
  assert.equal('rights' in publicItem, false); assert.equal('sourceRevision' in publicItem, false);
  assert.equal((await f.local.ok(`/records/${f.row.id}`)).title, 'Selected case');
  assert.equal((await f.local.ok(`/records/${f.row.id}`)).revision, f.detail.revision);
  const download = await f.remote.request(`/publications/${list[0].id}/files/${publicItem.files[0].id}`, 'GET', undefined, { auth: false });
  assert.equal(download.status, 200); assert.match(download.headers.get('content-disposition'), /attachment/);
  assert.equal((await f.remote.request(`/publications/${list[0].id}/files/${f.privateFile.id}`, 'GET', undefined, { auth: false })).status, 404);
  await f.remote.ok(`/community/submissions/${id}/decision`, 'POST', { revision: 3, status: 'withdrawn', feedback: 'Withdraw fixture' });
  assert.equal((await f.remote.request(`/publications/${list[0].id}`, 'GET', undefined, { auth: false })).status, 404);
  assert.equal((await f.remote.request(`/publications/${list[0].id}/files/${publicItem.files[0].id}`, 'GET', undefined, { auth: false })).status, 404);
  const withdrawn = await f.local.ok(`/outbox/${draft.id}/refresh`, 'POST');
  assert.equal(withdrawn.remote.status, 'withdrawn'); assert.equal(withdrawn.publicUrl, null);
});

test('key isolation and revocation protect intake and contributor status', async t => {
  const f = await pair(t), draft = await f.prepare(), sent = await f.send(draft);
  const other = await f.remote.ok('/community/keys', 'POST', { label: 'Other contributor' });
  assert.equal((await wire(f.remote, other, `/intake/${sent.remote.id}`)).status, 404);
  assert.equal((await wire(f.remote, f.key, `/intake/${sent.remote.id}`)).status, 200);
  assert.equal((await wire(f.remote, f.key, '/intake', 'POST', {}, { Cookie: f.remote.cookie() })).status, 403);
  const keys = await f.remote.ok('/community/keys');
  assert.equal(JSON.stringify(keys).includes(f.key.secret), false);
  assert.equal(JSON.stringify(await f.local.ok('/connectors')).includes(f.key.secret), false);
  await f.remote.ok(`/community/keys/${f.key.id}`, 'DELETE');
  assert.equal((await wire(f.remote, f.key, `/intake/${sent.remote.id}`)).status, 401);
  assert.equal((await f.local.request(`/outbox/${draft.id}/refresh`, 'POST')).status, 502);
  assert.equal((await f.remote.ok('/community/submissions')).submissions.length, 1);
});

test('rejection stays private; stale decisions and cross-record selections are refused', async t => {
  const f = await pair(t);
  const otherRecord = await f.local.ok('/records', 'POST', { title: 'Other private case' });
  const foreignFile = await f.local.ok(`/records/${otherRecord.id}/attachments?name=other.txt`, 'POST', Buffer.from('other'), { raw: true });
  assert.equal((await f.local.request('/outbox/prepare', 'POST', { connectorId: f.connection.id, recordId: f.row.id, revision: f.detail.revision, attachmentIds: [foreignFile.id], includeBody: false, includeSources: false, credit: '', rights: 'Test' })).status, 400);
  const draft = await f.prepare(), sent = await f.send(draft);
  await f.remote.ok(`/community/submissions/${sent.remote.id}/decision`, 'POST', { revision: 1, status: 'changes_requested', feedback: 'Need clearer source rights' });
  assert.equal((await f.remote.request(`/community/submissions/${sent.remote.id}/decision`, 'POST', { revision: 1, status: 'rejected', feedback: 'Stale review' })).status, 409);
  await f.remote.ok(`/community/submissions/${sent.remote.id}/decision`, 'POST', { revision: 2, status: 'rejected', feedback: 'Insufficient source rights' });
  const receipt = await f.send(draft);
  assert.equal(receipt.remote.status, 'rejected');
  assert.deepEqual((await f.remote.ok('/publications', 'GET', undefined, { auth: false })).publications, []);
  assert.equal((await f.local.request(`/connectors/${f.connection.id}`, 'DELETE')).status, 409);
  await f.local.ok(`/outbox/${draft.id}`, 'DELETE'); await f.local.ok(`/connectors/${f.connection.id}`, 'DELETE');
  assert.equal((await f.remote.ok('/community/submissions')).submissions.length, 1);
});

test('strict envelopes reject additional private fields, bad hashes and changed idempotency payload', async t => {
  const f = await pair(t);
  const packet = { format: 'ho-so-den.contribution', version: 1, id: '12345678-1234-1234-1234-123456789abc', createdAt: new Date().toISOString(), sourceRevision: 1,
    record: { title: 'Wire fixture', summary: '', body: '', category: 'Test', sources: [] }, files: [], credit: '', rights: 'Fixture rights' };
  assert.equal((await wire(f.remote, f.key, '/intake', 'POST', { ...packet, localDiskPath: '/private/archive' })).status, 400);
  assert.equal((await wire(f.remote, f.key, '/intake', 'POST', { ...packet, record: { ...packet.record, sources: {} } })).status, 400);
  assert.equal((await wire(f.remote, f.key, '/intake', 'POST', { ...packet, files: [{ id: packet.id, name: 'bad.txt', size: 1, sha256: '0'.repeat(64), data: 'eA==' }] })).status, 400);
  assert.equal((await wire(f.remote, f.key, '/intake', 'POST', packet)).status, 200);
  assert.equal((await wire(f.remote, f.key, '/intake', 'POST', { ...packet, record: { ...packet.record, title: 'Changed' } })).status, 409);
});

test('peer redirects are not followed and unresolved delivery keeps the same retryable package', async t => {
  const f = await pair(t);
  const redirect = createServer((req, res) => { req.resume(); res.writeHead(307, { Location: `${f.remote.origin()}/api/intake` }); res.end(); });
  await new Promise(resolve => redirect.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => redirect.close(resolve)));
  const connection = await f.local.ok('/connectors', 'POST', { label: 'Explicit redirect fixture', origin: `http://127.0.0.1:${redirect.address().port}`, secret: f.key.secret });
  const draft = await f.local.ok('/outbox/prepare', 'POST', { connectorId: connection.id, recordId: f.row.id, revision: f.detail.revision, attachmentIds: [], includeBody: false, includeSources: false, credit: '', rights: 'Test' });
  assert.equal((await f.local.request(`/outbox/${draft.id}/send`, 'POST', { confirm: true, hash: draft.hash })).status, 502);
  assert.equal((await f.local.ok(`/outbox/${draft.id}`)).state, 'delivery_unknown');
  assert.equal((await f.remote.ok('/community/submissions')).submissions.length, 0);
  assert.equal((await f.local.request('/connectors', 'POST', { label: 'Unsafe HTTP', origin: 'http://192.0.2.1', secret: f.key.secret })).status, 400);
});

test('outbox snapshots survive restart and portable backups exclude peer secrets and intake state', async t => {
  const f = await pair(t), draft = await f.prepare();
  await f.local.restart();
  const restoredDraft = await f.local.ok(`/outbox/${draft.id}`);
  assert.equal(restoredDraft.hash, draft.hash);
  await f.send(draft);
  await f.remote.restart();
  const queue = await f.remote.ok('/community/submissions'); assert.equal(queue.submissions.length, 1);
  const backup = await f.local.ok('/backup');
  assert.equal(JSON.stringify(backup).includes(f.key.secret), false);
  assert.equal('outbox' in backup, false); assert.equal('connectors' in backup, false);
  assert.notEqual(f.local.cookie().split('=')[0], f.remote.cookie().split('=')[0]);
});
