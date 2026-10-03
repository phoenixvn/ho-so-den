// SPDX-License-Identifier: AGPL-3.0-only
// This creates/removes only a uniquely named, disposable test Compose project.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const project = `hsd-smoke-${randomUUID().slice(0, 8)}`;
const community = process.argv.includes('--community');
const env = { ...process.env, PREVIEW_PORT: '0', COMMUNITY_PORT: '0' };
const compose = (args, capture = false) => execFileSync('docker', ['compose', '-p', project, ...(community ? ['-f', 'compose.yaml', '-f', 'compose.community.yaml'] : []), ...args], { env, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', timeout: 180000 });
let cookie, csrf, origin;
async function api(path, method = 'GET', body, raw = false) {
  const response = await fetch(`${origin}/api${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { Origin: origin, 'X-HSD-Request': '1', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), 'Content-Type': raw ? 'application/octet-stream' : 'application/json' } : {}) }, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  return response;
}
try {
  compose(['up', '-d', '--build', '--wait', '--wait-timeout', '120']);
  origin = `http://${compose(['port', 'archive', '8080'], true).trim()}`;
  assert.equal((await (await api('/status')).json()).setupRequired, true, 'Smoke test expects a new empty instance.');
  const login = await api('/setup', 'POST', { username: 'smoke', password: `fictional-${randomUUID()}` });
  assert.equal(login.status, 200); csrf = (await login.json()).csrf;
  const created = await api('/records', 'POST', { title: 'Disposable Docker persistence test', body: 'Fixture only.' });
  assert.equal(created.status, 201); const record = await created.json();
  const uploaded = await api(`/records/${record.id}/attachments?name=fixture.txt`, 'POST', Buffer.from('container persistence fixture'), true);
  assert.equal(uploaded.status, 201); const file = await uploaded.json();
  compose(['restart', 'archive']);
  origin = `http://${compose(['port', 'archive', '8080'], true).trim()}`;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch(`${origin}/healthz`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const detail = await api(`/records/${record.id}`);
  assert.equal(detail.status, 200); assert.equal((await detail.json()).attachments.length, 1);
  assert.equal(await (await api(`/attachments/${file.id}`)).text(), 'container persistence fixture');
  const backup = await api('/backup'); assert.equal(backup.status, 200);
  assert.equal((await backup.json()).records.length, 1);
  if (community) {
    const local = { origin, cookie, csrf };
    origin = `http://${compose(['port', 'community', '8080'], true).trim()}`; cookie = undefined; csrf = undefined;
    const receiver = { origin };
    const setup = await api('/setup', 'POST', { username: 'reviewer', password: `fictional-${randomUUID()}` });
    assert.equal(setup.status, 200); csrf = (await setup.json()).csrf;
    Object.assign(receiver, { cookie, csrf });
    const issued = await api('/community/keys', 'POST', { label: 'Docker contributor' });
    assert.equal(issued.status, 201); const key = await issued.json();
    ({ origin, cookie, csrf } = local);
    const connected = await api('/connectors', 'POST', { label: 'Docker community', origin: 'http://community:8080', publicOrigin: receiver.origin, secret: key.secret });
    assert.equal(connected.status, 201); const connection = await connected.json();
    const prepared = await api('/outbox/prepare', 'POST', { connectorId: connection.id, recordId: record.id, revision: 2, attachmentIds: [file.id], includeBody: true, includeSources: true, credit: '', rights: 'Disposable fixture owned by the test.' });
    assert.equal(prepared.status, 201); const draft = await prepared.json();
    const sent = await api(`/outbox/${draft.id}/send`, 'POST', { confirm: true, hash: draft.hash });
    assert.equal(sent.status, 200, await sent.clone().text()); const receipt = await sent.json();
    ({ origin, cookie, csrf } = receiver);
    const reviewed = await (await api(`/community/submissions/${receipt.remote.id}`)).json();
    assert.equal((await api(`/community/submissions/${reviewed.id}/decision`, 'POST', { revision: 1, status: 'approved', feedback: 'Docker fixture approved.', publication: { record: reviewed.packet.record, fileIds: reviewed.packet.files.map(f => f.id), credit: '' } })).status, 200);
    assert.equal((await api(`/community/submissions/${reviewed.id}/decision`, 'POST', { revision: 2, status: 'published', feedback: 'Publish fixture.', confirm: true })).status, 200);
    ({ origin, cookie, csrf } = local);
    const status = await (await api(`/outbox/${draft.id}/refresh`, 'POST')).json();
    assert.equal(status.remote.status, 'published'); assert.ok(status.publicUrl.startsWith(receiver.origin));
    console.log('PASS: Docker private-network peer pairing, explicit send, review, publish and manual status refresh.');
  }
  console.log(`PASS: ${project} — private data/session/file survived container restart; backup is readable.`);
} finally {
  compose(['down', '-v']);
}
