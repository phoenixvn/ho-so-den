// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Ho So Den contributors
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['index.html', 'app.js', 'article.js', 'styles.css', 'wiki.css', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) {
  await cp(join(root, name), join(out, name));
}

// Fontsource supplies unmodified OFL fonts and their license notices.
// Copy only the Latin/Vietnamese subsets used by this preview; all requests
// remain on the same origin after the one-time dependency installation.
const families = [
  { name: 'be-vietnam-pro', family: 'Be Vietnam Pro', weights: [400, 500, 600, 700, 800], styles: ['normal'] },
  { name: 'noto-serif', family: 'Noto Serif', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
  { name: 'ibm-plex-mono', family: 'IBM Plex Mono', weights: [400, 500, 600], styles: ['normal'] }
];
const fontRules = ['/* Unmodified Fontsource fonts, OFL-1.1. See font-licenses/. */'];
const fontDir = join(out, 'fonts');
await mkdir(fontDir);
await mkdir(join(out, 'font-licenses'));
for (const config of families) {
  const packageDir = join(root, 'node_modules', '@fontsource', config.name);
  const entries = await readdir(join(packageDir, 'files'));
  const selected = new Set();
  for (const weight of config.weights) {
    for (const style of config.styles) {
      for (const subset of ['latin', 'latin-ext', 'vietnamese']) {
        const name = `${config.name}-${subset}-${weight}-${style}.woff2`;
        if (!entries.includes(name)) throw new Error(`Missing font: ${name}`);
        selected.add(name);
      }
      const cssPath = style === 'normal' ? `${weight}.css` : `${weight}-${style}.css`;
      const css = await readFile(join(packageDir, cssPath), 'utf8');
      const rules = css.match(/@font-face\s*\{[^}]+\}/g) || [];
      const relevant = rules.filter(rule => [...selected].some(name => rule.includes(name)));
      if (!relevant.length) throw new Error(`Missing font CSS for ${config.name}/${cssPath}`);
      for (const rule of relevant) {
        fontRules.push(rule.replaceAll('./files/', './fonts/').replace(/,\s*url\([^)]*\.woff['"]?\)\s*format\(['"]woff['"]\)/g, ''));
      }
    }
  }
  for (const name of selected) await cp(join(packageDir, 'files', name), join(fontDir, name));
  await cp(join(packageDir, 'LICENSE'), join(out, 'font-licenses', `${config.name}.txt`));
}
await writeFile(join(out, 'fonts.css'), `${fontRules.join('\n\n')}\n`);
await writeFile(join(out, '.nojekyll'), '');
await writeFile(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('Built dist/: self-contained preview, bundled fonts and license notices.');
