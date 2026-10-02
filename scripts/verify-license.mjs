// SPDX-License-Identifier: AGPL-3.0-only
import { readFile } from 'node:fs/promises';
const response = await fetch('https://raw.githubusercontent.com/spdx/license-list-data/main/text/AGPL-3.0-only.txt');
if (!response.ok) throw new Error(`Cannot verify license: HTTP ${response.status}`);
const normalize = text => text.replace(/\s+/g, ' ').trim();
const local = normalize(await readFile(new URL('../LICENSE', import.meta.url), 'utf8'));
const official = normalize(await response.text());
if (local !== official) {
  let index = 0;
  while (local[index] === official[index] && index < local.length) index++;
  throw new Error(`License mismatch at ${index}: expected ${JSON.stringify(official.slice(index, index + 120))}, received ${JSON.stringify(local.slice(index, index + 120))}`);
}
console.log('LICENSE matches the SPDX AGPL-3.0-only text (ignoring whitespace).');
