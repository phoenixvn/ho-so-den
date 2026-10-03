// Copyright (C) 2026 Ho So Den contributors. SPDX-License-Identifier: AGPL-3.0-only
import { resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { realpath, mkdir } from 'node:fs/promises';
import { createPreviewServer } from './serve.mjs';
import { createLocalApi } from '../server/local-api.mjs';

export async function createLocalServer({ dataDirectory = fileURLToPath(new URL('../data/', import.meta.url)), root = fileURLToPath(new URL('../dist/', import.meta.url)), origin, mode = 'local', allowHttpPeers = [], intakeHosts = [] } = {}) {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const publicPath = await realpath(root);
  const dataPath = await realpath(dataDirectory);
  if (dataPath === publicPath || dataPath.startsWith(`${publicPath}${sep}`)) throw new Error('Data directory must be outside the public web root.');
  const api = await createLocalApi({ dataDirectory: dataPath, origin, mode, allowHttpPeers, intakeHosts });
  const server = await createPreviewServer({ root, localMode: true, runtimeMode: mode, handleRequest: (req, res) => api.handle(req, res) });
  server.on('close', () => { void api.close(); });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  const mode = process.env.HSD_MODE || 'local';
  const server = await createLocalServer({ dataDirectory: process.env.HSD_DATA_DIR, origin: process.env.HSD_ORIGIN, mode,
    allowHttpPeers: (process.env.HSD_ALLOW_HTTP_PEERS || '').split(',').filter(Boolean), intakeHosts: (process.env.HSD_INTAKE_HOSTS || '').split(',').filter(Boolean) });
  server.listen(port, host, () => console.log(`Ho So Den ${mode.toUpperCase()}: http://${host}:${port}/local.html — contributions require explicit actions.`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
