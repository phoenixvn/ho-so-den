// SPDX-License-Identifier: AGPL-3.0-only
import { mkdir, cp, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const out = join(root, 'release');
await mkdir(out, { recursive: true });
await cp(join(root, 'dist'), join(out, 'site'), { recursive: true, force: true });
execFileSync('tar', ['-czf', join(out, `ho-so-den-${version}-preview.tar.gz`), '-C', join(root, 'dist'), '.'], { stdio: 'inherit' });
console.log(`Release preview: release/ho-so-den-${version}-preview.tar.gz. Publish alongside the matching source tag.`);
