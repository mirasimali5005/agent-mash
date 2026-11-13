// Captures real screenshots of Agent Mash for the demo video.
// Run from demo-video/: node capture.mjs   (uses Playwright from the repo's dev dependencies)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(path.join(root, 'package.json'));
const { chromium } = require('playwright');
const OUT = path.join(here, 'public', 'shots');
mkdirSync(OUT, { recursive: true });

const now = Date.now(), h = 3600e3, d = 24 * h;
const chats = [
  { title: 'Investor update email draft', provider: 'claude', url: 'https://claude.ai/chat/3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab', folder: 'Work/Startup', tags: ['fundraising', 'email'], summary: 'Drafted the Q3 investor update: MRR growth, burn, hiring plan and the two asks.', openIn: 'app', pinned: true, lastOpened: now - 0.3 * h },
  { title: 'Pricing page copy and tiers', provider: 'chatgpt', url: 'https://chatgpt.com/c/68ab12-pricing', folder: 'Work/Startup', tags: ['pricing', 'copy'], summary: 'Three tiers with annual discount; rewrote the hero line and FAQ.', lastOpened: now - 3 * h },
  { title: 'Kyoto trip on a budget', provider: 'gemini', url: 'https://gemini.google.com/app/kyoto42', folder: 'Personal/Travel', tags: ['travel', 'japan'], summary: '4-day itinerary with temples, ramen spots and a cheap ryokan.',
    context: 'Me: Plan a 4 day Kyoto trip on a budget, I love ramen and temples\n\nAI: Day 1: Fushimi Inari at sunrise, then ramen near Kyoto Station. From Kansai airport take the Haruka express (75 min) and use an ICOCA card for the discount.', lastOpened: now - 1 * d },
  { title: 'Python scraper timeout fix', provider: 'chatgpt', url: 'https://chatgpt.com/c/68ab12-scraper', folder: 'Work/Code', tags: ['python'], notes: 'requests + retries with backoff', lastOpened: now - 2 * d },
  { title: 'Long PDF: attention paper notes', provider: 'kimi', url: 'https://www.kimi.com/chat/attn-notes', folder: 'Research', tags: ['papers', 'ml'], summary: 'Section-by-section notes on a 60-page paper, with the key equations explained.', lastOpened: now - 4 * h },
  { title: 'Database schema review', provider: 'deepseek', url: 'https://chat.deepseek.com/a/chat/s/schema-rev', folder: 'Work/Code', tags: ['postgres'], summary: 'Indexes for the events table and a safer migration order.', lastOpened: now - 6 * h },
  { title: 'Market sizing for AI notes apps', provider: 'perplexity', url: 'https://www.perplexity.ai/search/market-sizing', folder: 'Research', tags: ['market'], summary: 'TAM/SAM estimates with sources for knowledge-worker tools.', lastOpened: now - 3 * d },
  { title: 'Wedding speech, second draft', provider: 'claude', url: 'https://claude.ai/chat/9a8b7c6d-1111-4222-8333-444455556666', folder: 'Personal', tags: ['writing'], summary: 'Warmer opening, cut the inside jokes, ends on the toast.', openIn: 'app', lastOpened: now - 5 * d },
];
const lib = {
  settings: { welcomed: true, themeV2: true, theme: 'dark', lastBackup: now - 1 * d },
  bar: ['chatgpt', 'claude', 'gemini', 'kimi', 'deepseek'],
  chats: chats.map((c, i) => ({ id: 'demo' + String(i).padStart(4, '0'), openIn: 'web', pinned: false, created: now - (10 - i) * d, order: i, notes: '', summary: '', context: '', ...c })),
};

// Captures the live site by default (a fresh, isolated browser profile with sample data).
// LOCAL=1 node capture.mjs serves the repo locally instead.
const LOCAL = !!process.env.LOCAL;
const server = LOCAL ? spawn('python3', ['-m', 'http.server', '4180', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' }) : null;
if (server) await new Promise(r => setTimeout(r, 800));
const BASE = LOCAL ? 'http://localhost:4180/' : 'https://agent-mash.pages.dev/';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
await ctx.addInitScript(([key, lib]) => {
  if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, JSON.stringify(lib)); sessionStorage.setItem('seeded', '1'); }
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) return click.call(this); };   // never hand app links to the OS
  window.open = () => ({ opener: null });
}, ['agentmash.v1', lib]);
const page = await ctx.newPage();
const shot = async (name) => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('captured', name); };
const hideToast = () => page.evaluate(() => document.querySelector('#toast')?.classList.remove('on'));

await page.goto(BASE);
await page.waitForSelector('.card');
await hideToast();
await shot('library');

// folder view
await page.locator('#nav-folders [data-folder="Work"]').click();
await shot('folder-work');
await page.locator('#nav-lib [data-view="all"]').click();

// search inside the conversation text
await page.fill('#q', 'haruka');
await shot('search');
await page.fill('#q', '');

// provider type-ahead
await page.locator('#provAdd').click();
await page.keyboard.type('ki', { delay: 60 });
await shot('providers');
await page.keyboard.press('Escape');
await page.mouse.click(1300, 860);

// capture via clipboard paste
await page.goto(BASE + '#capture');
await page.waitForSelector('#captureDlg[open]');
await shot('capture-paste');
await page.evaluate(() => {
  const dt = new DataTransfer();
  dt.setData('text/plain', 'AGENTMASH-CAPTURE-1\n' + JSON.stringify({
    url: 'https://claude.ai/chat/0c1d2e3f-aaaa-4bbb-8ccc-ddddeeeeffff',
    title: 'Launch checklist for Agent Mash - Claude',
    text: 'Me: Help me write a launch checklist for a privacy-first web app\n\nAI: 1) Security headers and CSP. 2) Backups and export. 3) A clear privacy page. 4) A short demo video. 5) Post on Hacker News with a calm, honest tone.',
  }));
  document.querySelector('#pasteZone').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
});
await page.waitForSelector('#editDlg[open]');
await shot('capture-editor');
await page.locator('#cancelEdit').click();
await hideToast();

// drag to reorder (real pointer input, captured mid-drag)
const cards = page.locator('.card');
const a = await cards.nth(4).boundingBox(), b = await cards.nth(0).boundingBox();
await page.mouse.move(a.x + 120, a.y + 40);
await page.mouse.down();
await page.mouse.move(a.x + 140, a.y + 50, { steps: 4 });
await page.mouse.move(b.x + b.width * 0.42, b.y + 60, { steps: 18 });
await page.waitForTimeout(400);
await shot('drag');
await page.mouse.up();
await page.waitForTimeout(300);
await hideToast();
await shot('reordered');

// open a Claude chat in the desktop app
await page.locator('.card', { hasText: 'Investor update' }).click();
await page.waitForTimeout(150);
await shot('open-app');
await hideToast();

// privacy + backup
await page.locator('#privacyBadge').click();
await shot('privacy');
await page.locator('#setTabs [data-tab=backup]').click();
await shot('backup');
await page.locator('#closeSet').click();

// welcome sheet (first visit)
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('agentmash.v1')); s.settings.welcomed = false; localStorage.setItem('agentmash.v1', JSON.stringify(s)); });
await page.reload();
await page.waitForSelector('#welcomeDlg[open]');
await shot('welcome');

// light theme for variety
await page.locator('#welcomeStart').click();
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('agentmash.v1')); s.settings.theme = 'light'; localStorage.setItem('agentmash.v1', JSON.stringify(s)); });
await page.emulateMedia({ colorScheme: 'light' });
await page.reload();
await page.waitForSelector('.card');
await hideToast();
await shot('library-light');

/* ------------------------------------------------------------------
   Main workflow: paste a copied ChatGPT link into Agent Mash, save it.
   Coordinates of the things the cursor clicks are written to src/wf-coords.json.
   ------------------------------------------------------------------ */
const KYOTO_URL = 'https://chatgpt.com/c/6824a1f0-0b7e-4c1d-9a2f-3e5d8c7b1a90';
const lib2 = JSON.parse(JSON.stringify(lib));
lib2.chats = lib2.chats.filter(c => !c.title.startsWith('Kyoto'));
lib2.chats.forEach(c => { if (c.title.startsWith('Wedding')) c.openIn = 'web'; });
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
await ctx2.addInitScript(([key, lib]) => {
  if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, JSON.stringify(lib)); sessionStorage.setItem('seeded', '1'); }
  window.open = () => ({ opener: null });
}, ['agentmash.v1', lib2]);
const p2 = await ctx2.newPage();
const shot2 = async (name) => { await p2.waitForTimeout(450); await p2.screenshot({ path: path.join(OUT, name + '.png') }); console.log('captured', name); };
const box = async (sel) => { const b = await p2.locator(sel).first().boundingBox(); return { x: (b.x + b.width / 2) / 1440, y: (b.y + b.height / 2) / 900, w: b.width / 1440, h: b.height / 900 }; };
const hide2 = () => p2.evaluate(() => document.querySelector('#toast')?.classList.remove('on'));
const coords = {};

await p2.goto(BASE);
await p2.waitForSelector('.card');
await hide2();
coords.addBtn = await box('#addBtn');
await shot2('wf-library-before');

await p2.locator('#addBtn').click();
await p2.waitForSelector('#editDlg[open]');
coords.urlField = await box('#f-url');
await shot2('wf-add-empty');

await p2.fill('#f-url', KYOTO_URL);
await p2.locator('#f-url').dispatchEvent('input');
await p2.locator('#f-title').focus();
coords.titleField = await box('#f-title');
await shot2('wf-add-pasted');

await p2.locator('#f-title').pressSequentially('Kyoto trip on a budget', { delay: 10 });
await p2.fill('#f-folder', 'Personal/Travel');
await p2.fill('#f-tags', 'travel, japan');
await p2.locator('#f-notes').fill('Haruka express from Kansai, ICOCA card, ramen near the station');
coords.saveBtn = await box('#editForm button[value=ok]');
await shot2('wf-add-filled');

await p2.locator('#editForm button[value=ok]').click();
await p2.waitForSelector('#editDlg', { state: 'hidden' });
await hide2();
coords.newCard = await box('.card >> nth=0');
coords.claudeCard = await box('.card:has-text("Wedding speech")');
await shot2('wf-library-after');

const { writeFileSync } = await import('node:fs');
writeFileSync(path.join(here, 'src', 'wf-coords.json'), JSON.stringify({ kyotoUrl: KYOTO_URL, ...coords }, null, 2));
console.log('wrote src/wf-coords.json');

await browser.close();
server?.kill();
