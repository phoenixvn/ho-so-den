// SPDX-License-Identifier: AGPL-3.0-only
import { test, expect } from '@playwright/test';

test('library searches Vietnamese without accents, filters and sorts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.case-card')).toHaveCount(6);
  await page.locator('#search').fill('dong tien');
  await expect(page.locator('.case-card')).toHaveCount(1);
  await page.locator('#search').fill('');
  await page.getByRole('button', { name: 'Công nghệ', exact: true }).click();
  await expect(page.locator('.case-card')).toHaveCount(2);
  await page.locator('[data-filter="all"]').click();
  await page.locator('#sort').selectOption('sources');
  await expect(page.locator('.case-card').first()).toContainText('HS-0005');
  await page.locator('#search').fill('no such fictional dossier');
  await expect(page.locator('.empty')).toBeVisible();
});

test('dossier routes, references, history and keyboard navigation', async ({ page }) => {
  await page.goto('/#/ho-so/HS-0001/read');
  await expect(page.locator('.article-title')).toContainText('Dòng tiền');
  await page.locator('.reference').first().click();
  await expect(page.locator('#modal-title')).toHaveText('Bản ghi nhận tư liệu ban đầu');
  await page.keyboard.press('Escape');
  await expect(page.locator('.reference').first()).toBeFocused();
  await page.locator('.wiki-contents [data-section="questions"]').click();
  await expect(page.locator('#section-questions')).toBeFocused();
  await page.getByRole('tab', { name: 'Lịch sử', exact: true }).click();
  await page.locator('.diff-toggle summary').click();
  await expect(page.locator('.diff-line.added')).toBeVisible();
  await page.getByRole('tab', { name: 'Đọc', exact: true }).click();
  await page.getByRole('tab', { name: 'Đọc', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Nguồn', exact: true })).toBeFocused();
  await expect(page.locator('.source-register')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#section-overview')).toBeVisible();
  await page.reload();
  await expect(page.locator('.article-title')).toContainText('Dòng tiền');
});

test('discussion is text-only and transient; proofs never pretend to succeed', async ({ page }) => {
  await page.goto('/#/ho-so/HS-0002/discussion');
  const text = '<img src=x onerror=alert(1)> fictional note';
  await page.locator('#discussion-input').fill(text);
  await page.locator('#discussion-form button').click();
  await expect(page.locator('#session-comments p')).toHaveText(text);
  await expect(page.locator('#session-comments img')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Xác minh', exact: true }).click();
  await page.locator('[data-action="verify-demo"]').click();
  await expect(page.locator('#verify-result')).toContainText('Chưa thể xác minh');
  await page.getByRole('tab', { name: 'Thảo luận', exact: true }).click();
  await expect(page.locator('#session-comments p')).toHaveText(text);
  await page.reload();
  await expect(page.locator('#session-comments p')).toHaveCount(0);
});

test('theme persists and both themes fit mobile and desktop widths', async ({ page }) => {
  await page.goto('/#/ho-so/HS-0001/read');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await page.locator('#theme-toggle').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink');
  for (const theme of ['ink', 'paper']) {
    if (theme === 'paper') await page.locator('#theme-toggle').click();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-contents summary').click();
  await page.locator('.mobile-contents [data-section="materials"]').click();
  await expect(page.locator('#section-materials')).toBeFocused();
  await page.locator('.evidence-preview').first().click();
  await expect(page.locator('#modal')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('OTP and Cryptomus remain demonstrably simulated', async ({ page }) => {
  const requests = [];
  page.on('request', req => { if (req.method() !== 'GET') requests.push(req.url()); });
  await page.goto('/');
  await page.locator('.login').click();
  await page.locator('#email').fill('fictional@example.com');
  await page.locator('#email-form button').click();
  await page.locator('#otp').fill('000000');
  await page.locator('#otp-form button').click();
  await expect(page.locator('#otp-status')).toContainText('chưa đúng');
  await page.locator('#otp').fill('123456');
  await page.locator('#otp-form button').click();
  await expect(page.locator('#modal-title')).toHaveText('Chào mừng bạn.');
  await page.keyboard.press('Escape');
  await page.locator('.support [data-action="support"]').click();
  await page.locator('[data-amount="25"]').click();
  await page.locator('[data-action="checkout"]').click();
  await expect(page.locator('#modal-content')).toContainText('25 USD');
  await expect(page.locator('#modal-content')).toContainText('Chưa tạo thanh toán');
  expect(requests).toEqual([]);
});

test('runtime has no external requests, missing assets or JavaScript errors', async ({ page }) => {
  const errors = [];
  const external = [];
  const failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:4173') && !req.url().startsWith('data:')) external.push(req.url()); });
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.featured-reading a').click();
  await expect(page.locator('.article-title')).toBeVisible();
  await page.locator('[data-action="license"]').click();
  await expect(page.locator('#modal-content')).toContainText('AGPL-3.0-only');
  expect(external).toEqual([]);
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

test('missing dossier recovers to the library and footer exposes source/license', async ({ page }) => {
  await page.goto('/#/ho-so/not-found/read');
  await expect(page.locator('.empty-route')).toBeVisible();
  await page.locator('.empty-route a').click();
  await expect(page.locator('#search')).toBeVisible();
  await expect(page.locator('.footer-links a').first()).toHaveAttribute('href', 'https://github.com/phoenixvn/ho-so-den');
  await expect(page.locator('.footer-links a').nth(1)).toHaveAttribute('href', 'LICENSE');
});
