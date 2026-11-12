// Security regression tests. Each describe block maps to one item of the pre-launch checklist.
// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const KEY = 'agentmash.v1';
const XSS = '<img src=x onerror="window.__xss=1"><svg onload="window.__xss=1"></svg>"\'><script>window.__xss=1</script>';
const CLAUDE_URL = 'https://claude.ai/chat/3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab';

/** Seed storage once per page, install spies, collect CSP violations. */
async function open(page, lib = {}, { seed = true } = {}) {
  await page.addInitScript(([key, lib, seed]) => {
    window.__xss = 0;
    window.__violations = [];
    window.__opened = [];
    window.__appLinks = [];
    document.addEventListener('securitypolicyviolation', e => window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`));
    window.open = (u) => { window.__opened.push(String(u)); return { opener: null }; };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) return click.call(this);            // let real downloads through
      window.__appLinks.push(this.href);                      // never hand app links to the OS in tests
    };
    if (seed && !sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, JSON.stringify({ settings: { welcomed: true, themeV2: true, theme: 'dark' }, ...lib }));
      sessionStorage.setItem('seeded', '1');
    }
  }, [KEY, lib, seed]);
  await page.goto('/');
  await expect(page.locator('#grid')).toBeVisible();
}
const stored = async page => { const d = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY); return { chats: [], customProviders: {}, ...d }; };
const toastText = page => page.locator('#toastMsg').textContent();
async function importFile(page, name, content) {
  await page.setInputFiles('#importFile', { name, mimeType: 'application/json', buffer: Buffer.from(content) });
  await page.waitForTimeout(150);
}
async function expectNoInjection(page) {
  expect(await page.evaluate(() => window.__xss)).toBe(0);
  expect(await page.locator('img[src="x"], [onerror], [onload], [onmouseover], [onfocus]').count()).toBe(0);
  expect(await page.locator('script').count()).toBe(2);   // theme.js and app.js only
  const v = await page.evaluate(() => window.__violations);
  expect(v.filter(x => /script-src|trusted-types/.test(x))).toEqual([]);
}

test.describe('1. Malicious HTML in imported text renders as plain text', () => {
  test('every text field of a backup stays inert', async ({ page }) => {
    await open(page);
    const backup = {
      chats: [{ url: 'https://chatgpt.com/c/xss', title: 'T' + XSS, summary: 'S' + XSS, notes: 'N' + XSS, folder: 'F' + XSS.replace(/\//g, ''),
        tags: ['t' + XSS.slice(0, 30)], keywords: ['k' + XSS.slice(0, 50)], context: 'Me: ' + XSS, provider: 'x-evil' }],
      customProviders: { 'x-evil': { name: 'E' + XSS.slice(0, 30), color: '#123456', hosts: ['evil.example.com'] } },
      folders: ['G' + XSS.replace(/\//g, '').slice(0, 150)],
    };
    await importFile(page, 'xss.json', JSON.stringify(backup));
    expect(await toastText(page)).toContain('Restored 1');
    await expect(page.locator('.card .card-t b')).toContainText('<img src=x');

    // Exercise every rendering path: search (highlight + snippet), context menu, editor, combobox, settings.
    await page.fill('#q', 'img');
    await page.locator('.card').first().click({ button: 'right' });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await page.fill('#q', '');
    await page.locator('.card [data-act=edit]').first().click();
    await page.locator('#cancelEdit').click();
    await page.fill('#provAdd', 'E');
    await page.locator('#provAdd').blur();
    await page.locator('#openSettings').click();
    for (const tab of ['apps', 'ai', 'privacy', 'backup', 'general']) await page.locator(`#setTabs [data-tab=${tab}]`).click();
    await page.locator('#closeSet').click();
    await expectNoInjection(page);
  });

  test('a provider color that tries to break out of its attribute is rejected', async ({ page }) => {
    await open(page);
    await importFile(page, 'color.json', JSON.stringify({ chats: [], customProviders: { 'x-e': { name: 'E', color: 'red" onmouseover="window.__xss=1', hosts: ['e.example.com'] } } }));
    expect(await toastText(page)).toContain('rejected');
    await expectNoInjection(page);
  });
});

test.describe('2. Unapproved URLs cannot execute', () => {
  for (const url of ['javascript:window.__xss=1', 'data:text/html,<script>1</script>', 'vbscript:msgbox', 'http://example.com/c/1', 'https://user:pass@example.com/c/1', 'file:///etc/passwd']) {
    test(`backup with ${url.split(':')[0]}: link is rejected`, async ({ page }) => {
      await open(page);
      await importFile(page, 'u.json', JSON.stringify({ chats: [{ url, title: 'x' }] }));
      expect(await toastText(page)).toContain('rejected');
      expect((await stored(page)).chats).toHaveLength(0);
    });
  }

  test('bad links already in storage are dropped and can never be opened', async ({ page }) => {
    await open(page, { chats: [
      { id: 'aaaaaa1', url: 'javascript:window.__xss=1', title: 'bad', provider: 'other', openIn: 'web', order: 0 },
      { id: 'aaaaaa2', url: 'https://chatgpt.com/c/good', title: 'good', provider: 'chatgpt', openIn: 'web', order: 1 },
      { id: 'aaaaaa3', url: CLAUDE_URL, title: 'claude', provider: 'claude', openIn: 'app', order: 2 },
    ] });
    await expect(page.locator('.card')).toHaveCount(2);
    await page.locator('.card', { hasText: 'good' }).click();
    await page.locator('.card', { hasText: 'claude' }).click();
    expect(await page.evaluate(() => window.__opened)).toEqual(['https://chatgpt.com/c/good']);
    expect(await page.evaluate(() => window.__appLinks)).toEqual(['claude://claude.ai/chat/3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab']);
    await expectNoInjection(page);
  });

  test('the editor refuses non-https links', async ({ page }) => {
    await open(page);
    await page.locator('#addBtn').click();
    await page.fill('#f-url', 'javascript:alert(1)');
    await page.fill('#f-title', 'x');
    await page.locator('#editForm button[value=ok]').click();
    await expect(page.locator('#editDlg')).toBeVisible();
    expect((await stored(page)).chats).toHaveLength(0);
  });
});

test.describe('3. Malformed, oversized and prototype-polluting backups are rejected', () => {
  const cases = {
    'not JSON': ['{nope', 'valid JSON'],
    'top-level __proto__': ['{"chats":[],"__proto__":{"polluted":true}}', 'rejected'],
    'nested __proto__': ['{"chats":[{"url":"https://a.example.com/c/1","title":"x","__proto__":{"polluted":true}}]}', 'rejected'],
    'constructor key': ['{"chats":[{"url":"https://a.example.com/c/1","title":"x","constructor":{"prototype":{"polluted":true}}}]}', 'rejected'],
    'unknown field': ['{"chats":[{"url":"https://a.example.com/c/1","title":"x","onload":"y"}]}', 'rejected'],
    'title too long': [JSON.stringify({ chats: [{ url: 'https://a.example.com/c/1', title: 'y'.repeat(301) }] }), 'rejected'],
    'tags not a list': [JSON.stringify({ chats: [{ url: 'https://a.example.com/c/1', title: 'x', tags: 'a,b' }] }), 'rejected'],
    'chats not a list': ['{"chats":{"0":{}}}', 'rejected'],
    'too many chats': [JSON.stringify({ chats: Array.from({ length: 10001 }, (_, i) => ({ url: `https://a.example.com/c/${i}`, title: 'x' })) }), 'rejected'],
    'one bad record among good ones': [JSON.stringify({ chats: [{ url: 'https://a.example.com/c/1', title: 'ok' }, { url: 'javascript:1', title: 'bad' }] }), 'rejected'],
  };
  for (const [name, [content, expected]] of Object.entries(cases)) {
    test(name, async ({ page }) => {
      await open(page, { chats: [{ id: 'keep001', url: 'https://chatgpt.com/c/keep', title: 'Keep', provider: 'chatgpt', order: 0 }] });
      const before = JSON.stringify(await stored(page));
      await importFile(page, 'bad.json', content);
      expect(await toastText(page)).toContain(expected);
      expect(JSON.stringify(await stored(page))).toBe(before);   // all-or-nothing
      expect(await page.evaluate(() => ({}).polluted)).toBeUndefined();
    });
  }

  test('files over 20 MB are refused before parsing', async ({ page }) => {
    await open(page);
    await importFile(page, 'big.json', '{"chats":[],"x":"' + 'a'.repeat(21 * 1024 * 1024) + '"}');
    expect(await toastText(page)).toContain('too large');
  });
});

test.describe('4. API keys never reach storage, backups or URLs', () => {
  test('key stays in memory only', async ({ page }) => {
    const secret = 'sk-ant-api03-TESTSECRET-' + Date.now();
    await open(page, { chats: [{ id: 'aaaaaa1', url: 'https://chatgpt.com/c/one', title: 'One', provider: 'chatgpt', order: 0 }] });
    await page.locator('#openSettings').click();
    await page.locator('#setTabs [data-tab=ai]').click();
    await page.fill('#s-key', secret);
    await page.locator('#s-key').blur();
    await page.locator('#closeSet').click();
    await expect(page.locator('#privacyText')).toHaveText('Local · Claude AI on');

    await page.locator('.card [data-act=pin]').click();
    await page.locator('.card [data-act=edit]').click();
    await page.fill('#f-title', 'One edited');
    await page.locator('#editForm button[value=ok]').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#backupItem').click()]);
    const backup = fs.readFileSync(await download.path(), 'utf8');

    const allStorage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(allStorage).not.toContain(secret);
    expect(backup).not.toContain(secret);
    expect(page.url()).not.toContain(secret);

    await page.reload();
    await page.locator('#openSettings').click();
    await page.locator('#setTabs [data-tab=ai]').click();
    await expect(page.locator('#s-key')).toHaveValue('');
  });

  test('a key saved by an old version is purged on load', async ({ page }) => {
    await open(page, { settings: { welcomed: true, themeV2: true, apiKey: 'sk-ant-api03-OLDKEY' }, chats: [] });
    expect(JSON.stringify(await stored(page))).not.toContain('OLDKEY');
    await expect(page.locator('#toastMsg')).toContainText('revoke');
  });
});

test.describe('5. No chat content leaves the browser without explicit approval', () => {
  test('capture, save and search make no outside requests; Claude runs only on click', async ({ page }) => {
    const outside = [];
    await page.route('**/*', route => {
      const url = route.request().url();
      if (!url.startsWith('http://localhost:4173')) outside.push(url);
      if (url.startsWith('https://api.anthropic.com')) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
      }
      return url.startsWith('http://localhost:4173') ? route.continue() : route.abort();
    });
    await open(page);
    await page.locator('#openSettings').click();
    await page.locator('#setTabs [data-tab=ai]').click();
    await page.fill('#s-key', 'sk-ant-test');
    await page.locator('#s-key').blur();
    await page.locator('#closeSet').click();

    // Capture through the clipboard paste flow.
    await page.goto('/#capture');
    await expect(page.locator('#captureDlg')).toBeVisible();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'AGENTMASH-CAPTURE-1\n' + JSON.stringify({ url: 'https://chatgpt.com/c/cap', title: 'Captured - ChatGPT', text: 'Me: secret plans\n\nAI: ok' }));
      document.querySelector('#pasteZone').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.locator('#editDlg')).toBeVisible();
    await expect(page.locator('#f-context')).toHaveValue(/secret plans/);
    expect(page.url()).not.toContain('secret');
    await page.locator('#editForm button[value=ok]').click();
    await page.fill('#q', 'secret plans');
    await page.waitForTimeout(300);
    expect(outside).toEqual([]);

    // Only an explicit click sends anything, and only to Anthropic.
    await page.locator('.card [data-act=edit]').click();
    await page.locator('#aiRun').click();
    await expect(page.locator('#aiBarText')).toContainText('rejected');
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.every(u => u.startsWith('https://api.anthropic.com/'))).toBe(true);
  });

  test('forged or legacy captures are not accepted as-is', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'AGENTMASH-CAPTURE-1\n{"url":"javascript:alert(1)","title":"x","text":"y"}');
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.locator('#editDlg')).toBeHidden();
    await page.goto('/#add=' + encodeURIComponent('https://chatgpt.com/c/old') + '&title=Old&ctx=SECRET');
    await expect(page.locator('#editDlg')).toBeVisible();
    await expect(page.locator('#f-context')).toHaveValue('');
    expect(page.url()).not.toContain('SECRET');
  });
});

test.describe('6. A failed storage write never reports success', () => {
  test('editor stays open, keeps the text, and nothing changes', async ({ page }) => {
    await open(page, { chats: [{ id: 'aaaaaa1', url: 'https://chatgpt.com/c/one', title: 'Original', provider: 'chatgpt', order: 0 }] });
    await page.locator('.card [data-act=edit]').click();
    await page.fill('#f-title', 'Unsaved change');
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; });
    await page.locator('#editForm button[value=ok]').click();
    await expect(page.locator('#editDlg')).toBeVisible();
    await expect(page.locator('#saveError')).toBeVisible();
    await expect(page.locator('#f-title')).toHaveValue('Unsaved change');
    await expect(page.locator('.card .card-t b')).toHaveText('Original');
    await page.reload();
    await expect(page.locator('.card .card-t b')).toHaveText('Original');
  });
});

test.describe('7. Records stay correct across backup, restore, refresh and tabs', () => {
  test('backup → erase → restore round trip', async ({ page }) => {
    const chats = [
      { id: 'aaaaaa1', url: 'https://chatgpt.com/c/one?model=x#t', title: 'One', provider: 'chatgpt', folder: 'Work/A', tags: ['x'], notes: 'n', summary: 's', context: 'Me: hi', order: 0 },
      { id: 'aaaaaa2', url: CLAUDE_URL, title: 'Two', provider: 'claude', openIn: 'app', pinned: true, order: 1 },
    ];
    await open(page, { chats, customProviders: { 'x-bot': { name: 'Bot', color: '#10a37f', hosts: ['bot.example.com'] } } });
    const pick = lib => lib.chats.map(({ url, title, provider, folder, tags, notes, summary, context, openIn, pinned }) => ({ url, title, provider, folder, tags, notes, summary, context, openIn, pinned }));
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#backupItem').click()]);
    const before = pick(await stored(page));   // read after the app has written its normalized copy
    const path = await download.path();
    page.on('dialog', d => d.accept());
    await page.locator('#openSettings').click();
    await page.locator('#setTabs [data-tab=privacy]').click();
    await page.locator('#eraseAll').click();
    await expect(page.locator('.card')).toHaveCount(0);
    await page.setInputFiles('#importFile', path);
    await expect(page.locator('.card')).toHaveCount(2);
    await page.reload();
    const after = pick(await stored(page));
    expect(after.sort((a, b) => a.url.localeCompare(b.url))).toEqual(before.sort((a, b) => a.url.localeCompare(b.url)));
    expect(Object.keys((await stored(page)).customProviders)).toEqual(['x-bot']);
  });

  test('two tabs: changes sync and an open editor does not overwrite the other tab', async ({ context }) => {
    const a = await context.newPage();
    await open(a, { chats: [
      { id: 'aaaaaa1', url: 'https://chatgpt.com/c/one', title: 'One', provider: 'chatgpt', order: 0 },
      { id: 'aaaaaa2', url: 'https://chatgpt.com/c/two', title: 'Two', provider: 'chatgpt', order: 1 },
    ] });
    const b = await context.newPage();
    await open(b, {}, { seed: false });
    await expect(b.locator('.card')).toHaveCount(2);

    await b.locator('.card', { hasText: 'Two' }).locator('[data-act=edit]').click();   // B starts editing Two
    await a.locator('.card', { hasText: 'One' }).locator('[data-act=edit]').click();   // A renames One
    await a.fill('#f-title', 'One from A');
    await a.locator('#editForm button[value=ok]').click();
    await expect(b.locator('.card', { hasText: 'One from A' })).toHaveCount(1);       // B sees it

    await b.fill('#f-title', 'Two from B');
    await b.locator('#editForm button[value=ok]').click();
    await a.reload();
    const titles = (await stored(a)).chats.map(c => c.title).sort();
    expect(titles).toEqual(['One from A', 'Two from B']);
  });
});

test.describe('8. The CSP blocks unauthorized scripts and network destinations', () => {
  test('policy is declared and enforced', async ({ page }) => {
    await open(page);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain('connect-src https://api.anthropic.com');
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);

    const fetchResult = await page.evaluate(() => fetch('https://example.com/steal').then(() => 'allowed', () => 'blocked'));
    expect(fetchResult).toBe('blocked');
    const htmlResult = await page.evaluate(() => { try { document.body.insertAdjacentHTML('beforeend', '<b>x</b>'); return 'allowed'; } catch { return 'blocked'; } });
    expect(htmlResult).toBe('blocked');   // Trusted Types: only setHTML() may create HTML

    // Loading an outside script is stopped twice over: Trusted Types refuses the src, and script-src 'self' would block the fetch.
    const scriptResult = await page.evaluate(() => {
      try { const s = document.createElement('script'); s.src = 'https://example.com/evil.js'; document.head.appendChild(s); return 'appended'; }
      catch { return 'blocked'; }
    });
    expect(scriptResult).toBe('blocked');
    const styleResult = await page.evaluate(async () => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://example.com/evil.css';
      const done = new Promise(r => { l.onload = () => r('loaded'); l.onerror = () => r('blocked'); });
      document.head.appendChild(l); return done;
    });
    expect(styleResult).toBe('blocked');
    const v = await page.evaluate(() => window.__violations);
    expect(v.some(x => x.startsWith('style-src') && x.includes('example.com'))).toBe(true);
  });

  test('the app refuses to render inside a frame', async ({ page }) => {
    await page.goto('/tests/fixtures/frame.html');
    const frame = page.frameLocator('#f');
    await expect(frame.locator('html')).toHaveCSS('display', 'none');
    await expect(frame.locator('.card, #grid .empty')).toHaveCount(0);
  });
});
