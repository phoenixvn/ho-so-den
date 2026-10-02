// SPDX-License-Identifier: AGPL-3.0-only
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createPreviewServer } from './serve.mjs';

const directory = fileURLToPath(new URL('../docs/assets/', import.meta.url));
await mkdir(directory, { recursive: true });
const server = await createPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/ho-so/HS-0001/read`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.article-title').waitFor();
  await page.screenshot({ path: `${directory}/preview-paper.png` });
  await page.locator('#theme-toggle').click();
  await page.screenshot({ path: `${directory}/preview-ink.png` });
  console.log('Captured docs/assets/preview-paper.png and preview-ink.png.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
