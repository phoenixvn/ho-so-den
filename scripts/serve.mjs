// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Ho So Den contributors
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, sep, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'";

export async function createPreviewServer({ root = defaultRoot } = {}) {
  const publicRoot = await realpath(root);
  return createServer(async (request, response) => {
    response.setHeader('Content-Security-Policy', csp);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Cache-Control', 'no-cache');
    const send = (code, body, type = 'text/plain; charset=utf-8') => {
      response.statusCode = code;
      response.setHeader('Content-Type', type);
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, 'This preview does not accept submissions.');
      return;
    }
    let path;
    try { path = decodeURIComponent((request.url || '/').split('?')[0]); }
    catch { send(400, 'Invalid request path.'); return; }
    if (!path.startsWith('/') || /[\\\0]/.test(path) || path.split('/').some(part => part.startsWith('.'))) {
      send(404, 'Not found.'); return;
    }
    if (path === '/healthz') { send(200, '{"status":"ok","mode":"design-preview"}', 'application/json'); return; }
    if (path === '/') path = '/index.html';
    try {
      const fullPath = await realpath(resolve(publicRoot, `.${path}`));
      const rel = relative(publicRoot, fullPath);
      if (rel.startsWith(`..${sep}`) || rel === '..' || resolve(publicRoot, rel) !== fullPath) { send(404, 'Not found.'); return; }
      const info = await stat(fullPath);
      if (!info.isFile()) { send(404, 'Not found.'); return; }
      send(200, await readFile(fullPath), types[extname(fullPath)] || 'text/plain; charset=utf-8');
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) send(404, 'Not found.');
      else { console.error('Preview server failed to serve a file:', error.code); send(500, 'Unable to serve file.'); }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const server = await createPreviewServer();
  server.listen(port, host, () => console.log(`Ho So Den design preview: http://${host}:${port} (no archive backend)`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
