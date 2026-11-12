// End-to-end walkthrough of the everyday flow: save, search, refresh, back up, restore.
// Run against the live site with BASE_URL=https://agent-mash.pages.dev npx playwright test tests/smoke.spec.js
// @ts-check
const { test, expect } = require('@playwright/test');

test('save a chat, search it, refresh, back up and restore', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await page.goto('/');
  await page.locator('#welcomeStart').click();                     // first visit shows the welcome sheet

  await page.locator('#addBtn').click();
  await page.fill('#f-url', 'https://claude.ai/chat/3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab');
  await expect(page.locator('#f-prov')).toHaveValue('Claude');     // provider detected from the link
  await page.fill('#f-title', 'Investor update email draft');
  await page.fill('#f-folder', 'Work/Startup');
  await page.fill('#f-tags', 'fundraising, email');
  await page.fill('#f-notes', 'Q3 metrics and the ask');
  await page.locator('#editForm button[value=ok]').click();
  await expect(page.locator('.card')).toHaveCount(1);

  await page.fill('#q', 'metrics');
  await expect(page.locator('.card mark')).toHaveText('metrics');
  await page.fill('#q', 'nothing-like-this');
  await expect(page.locator('.card')).toHaveCount(0);
  await page.fill('#q', '');

  await page.reload();
  await expect(page.locator('.card .card-t b')).toHaveText('Investor update email draft');
  await expect(page.locator('#nav-folders')).toContainText('Startup');

  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#backupItem').click()]);
  const file = await download.path();
  await expect(page.locator('#backupState')).toHaveText('Today');

  await page.locator('#openSettings').click();
  await page.locator('#setTabs [data-tab=privacy]').click();
  await page.locator('#eraseAll').click();
  await expect(page.locator('.card')).toHaveCount(0);

  await page.setInputFiles('#importFile', file);
  await expect(page.locator('#toastMsg')).toContainText('Restored 1');
  await page.reload();
  const card = page.locator('.card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Investor update email draft');
  await expect(card).toContainText('#fundraising');
  await expect(card).toContainText('Work/Startup');
});
