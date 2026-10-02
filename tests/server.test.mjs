// SPDX-License-Identifier: AGPL-3.0-only
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createPreviewServer } from '../scripts/serve.mjs';

let server;
let origin;
before(async () => {
  server = await createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

test('serves the preview and explicit design-preview health status', async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /HỒ SƠ ĐEN/);
  const health = await fetch(`${origin}/healthz`);
  assert.deepEqual(await health.json(), { status: 'ok', mode: 'design-preview' });
});

test('supports HEAD without a body and exposes restrictive response headers', async () => {
  const response = await fetch(`${origin}/article.js`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

test('does not accept submissions or payments through pretend APIs', async () => {
  for (const path of ['/api/submissions', '/api/otp', '/api/payments', '/']) {
    const response = await fetch(`${origin}${path}`, { method: 'POST', body: 'fictional demo' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
});

function rawGet(path) {
  return new Promise((resolve, reject) => {
    const req = request(`${origin}/`, { path }, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
}
test('blocks repo files, dotfiles, traversal, encoded separators and invalid escapes', async () => {
  for (const path of ['/package.json', '/scripts/serve.mjs', '/.env', '/.git/config', '/../README.md', '/%2e%2e/README.md', '/%2e%2e%5cREADME.md', '/%00', '/fonts/']) {
    assert.equal(await rawGet(path), 404, path);
  }
  assert.equal(await rawGet('/%not-a-valid-escape'), 400);
});

test('ships full notices and font assets with no external CSS imports', async () => {
  for (const path of ['/LICENSE', '/NOTICE', '/THIRD_PARTY_NOTICES.md', '/font-licenses/be-vietnam-pro.txt', '/font-licenses/noto-serif.txt', '/font-licenses/ibm-plex-mono.txt']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 100, path);
  }
  const license = await (await fetch(`${origin}/LICENSE`)).text();
  assert.match(license, /13\. Remote Network Interaction/);
  for (const file of ['styles.css', 'wiki.css', 'fonts.css']) {
    const content = await readFile(new URL(`../dist/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(content, /@import\s+url\(['"]?https?:/);
    assert.doesNotMatch(content, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  }
  const fonts = await readdir(new URL('../dist/fonts/', import.meta.url));
  assert.ok(fonts.length > 0);
  const font = await fetch(`${origin}/fonts/${fonts[0]}`);
  assert.equal(font.status, 200);
  assert.equal(font.headers.get('content-type'), 'font/woff2');
  const css = await readFile(new URL('../dist/fonts.css', import.meta.url), 'utf8');
  for (const [, path] of css.matchAll(/url\(['"]?(\.\/fonts\/[^)'"\s]+)['"]?\)/g)) {
    assert.ok(fonts.includes(path.split('/').at(-1)), `Missing bundled font ${path}`);
  }
});
