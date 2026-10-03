// SPDX-License-Identifier: AGPL-3.0-only
import { test, expect } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLocalServer } from '../scripts/local.mjs';

test('local admin creates, edits, uploads, exports and restores a persistent private archive', async ({ page }, testInfo) => {
  const directories = [], servers = [];
  const start = async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hsd-ui-')); directories.push(directory);
    const server = await createLocalServer({ dataDirectory: directory }); servers.push(server);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  };
  const setup = async origin => {
    await page.goto(origin);
    await expect(page.locator('#auth-title')).toHaveText('Bắt đầu kho lưu trữ riêng.');
    await page.locator('#local-username').fill('admin');
    await page.locator('#local-password').fill('fictional-ui-password-2026');
    await page.locator('#auth-submit').click();
    await expect(page.locator('#local-workspace')).toBeVisible();
  };
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:') && !req.url().startsWith('blob:') && !req.url().startsWith('data:')) external.push(req.url()); });
  try {
    const origin = await start();
    await setup(origin);
    await page.locator('#new-record').click();
    await page.locator('#edit-title').fill('Tư liệu local <img src=x onerror=alert(1)>');
    await page.locator('#edit-summary').fill('Tóm tắt lưu trên SQLite.');
    await page.locator('#edit-body').fill('Ghi chép nội bộ.\nDòng thứ hai.');
    await page.locator('#edit-sources').fill('Nguồn minh họa | https://example.com | Không phải hồ sơ thật');
    await page.locator('#record-form button[type=submit]').click();
    await expect(page.locator('.local-detail-heading h1')).toContainText('<img');
    await expect(page.locator('#local-detail img')).toHaveCount(0);
    await page.locator('#edit-record').click();
    await page.locator('#edit-title').fill('Hồ sơ đã chỉnh sửa');
    await page.locator('#edit-reason').fill('Làm rõ tên hồ sơ');
    await page.locator('#record-form button[type=submit]').click();
    await expect(page.locator('.local-detail-heading h1')).toHaveText('Hồ sơ đã chỉnh sửa');
    await page.locator('#upload-file').setInputFiles({ name: 'ghi-chu.txt', mimeType: 'text/plain', buffer: Buffer.from('local-only attachment') });
    await page.locator('#upload-form button').click();
    await expect(page.locator('.attachment-row a')).toHaveText('ghi-chu.txt ↓');
    await page.reload();
    await expect(page.locator('.attachment-row a')).toHaveText('ghi-chu.txt ↓');
    await page.locator('[data-version="1"]').click();
    await expect(page.locator('#local-dialog-content')).toContainText('Tư liệu local <img');
    await page.keyboard.press('Escape');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth).map(el => `${el.tagName}.${el.className}`).slice(0, 8) }));
      expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: testInfo.outputPath('local-detail.png'), fullPage: true });
    await page.locator('.local-back').click();
    await page.locator('#local-search').fill('ho so');
    await expect(page.locator('.local-row')).toHaveCount(1);
    const pendingDownload = page.waitForEvent('download');
    await page.locator('#backup-download').click();
    const download = await pendingDownload;
    const backupBytes = await readFile(await download.path());
    const target = await start();
    await setup(target);
    await page.locator('#restore-open').click();
    await page.locator('#restore-file').setInputFiles({ name: 'backup.hsd.json', mimeType: 'application/json', buffer: backupBytes });
    await page.locator('#restore-confirm').check();
    await page.locator('#restore-form button').click();
    await expect(page.locator('#local-message')).toContainText('Đã khôi phục 1 hồ sơ, 1 tệp và 3 phiên bản');
    await page.locator('.local-row h2 a').click();
    await expect(page.locator('.attachment-row a')).toContainText('ghi-chu.txt');
    await page.locator('#logout').click();
    await expect(page.locator('#local-auth')).toBeVisible();
    await page.locator('#local-username').fill('admin');
    await page.locator('#local-password').fill('fictional-ui-password-2026');
    await page.locator('#auth-submit').click();
    await expect(page.locator('#local-workspace')).toBeVisible();
    expect(errors).toEqual([]); expect(external).toEqual([]);
  } finally {
    await page.goto('about:blank');
    for (const server of servers) await new Promise(resolve => server.close(resolve));
    for (const directory of directories) await rm(directory, { recursive: true, force: true });
  }
});

test('static local page explains self-hosting without probing any API', async ({ page }) => {
  const calls = [];
  page.on('request', request => { if (request.url().includes('/api/')) calls.push(request.url()); });
  await page.goto('/local.html');
  await expect(page.locator('#local-unavailable')).toBeVisible();
  await expect(page.locator('#local-auth')).toBeHidden();
  expect(calls).toEqual([]);
});
