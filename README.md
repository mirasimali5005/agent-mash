# Agent Mash

**The private library for your best AI conversations.**

Save the ChatGPT, Claude, Gemini, Kimi, DeepSeek and Grok chats that matter (34 providers in all) in one calm, searchable place. It's like Obsidian or Apple Notes, but for AI chats: a library you control, not another extension inside the AI sites.

- **Stays on your device.** No account, no server, no tracking. Chats live in your browser.
- **You choose what to keep.** Save the conversations with real value, and find them again in seconds.
- **Works across every AI you use**, opening each chat in its website or desktop app.
- **Simple and durable.** Back up to JSON, or export Markdown and an Obsidian-ready vault, in plain files you can open years from now.

**Live:** https://agent-mash.pages.dev (free on Cloudflare Pages, on an address of its own; styled like a native macOS app, and you can install it to your Dock)

> **Moved from `mirasimali5005.github.io/agent-mash`.** Browser storage doesn't follow a site to a new address. On the old site, click **Back up** in the sidebar, then open the new site and drop that file onto the window. Also drag the new site's **Save to Agent Mash** button (Settings → Capture) to your bookmarks bar to replace the old one.

Agent Mash is free to use. The Claude features are optional: leave the API key blank and nothing is ever sent to an AI service. If you add your own key, Anthropic bills that usage to your account.
## What it does
- **One-click capture.** A bookmark button saves the current chat's link, title and conversation text, so you don't have to describe each chat yourself.
- **Understands chats.** Without AI, it pulls keywords from the conversation and suggests a folder. With an optional Claude API key, Claude writes the title, summary, tags, search keywords and folder.
- **Search.** Matches titles, summaries, tags, notes, folders and the conversation text itself, and shows the matching line. **Ask Claude** (`⇧↩`) searches by meaning.
- **Organize.** Folders with sub-folders (`Work/Startup`), tags, and Pinned, Recent and Unfiled views. **Drag cards to set your own order**, or onto a folder, Pinned or Unfiled. `⌥`+arrow keys move the selected chat. You can also sort by recently opened, date added or name.
- **Providers.** 34 built-in providers are detected from the link. Type to add one to the filter bar (`ki` → Kimi), or add your own; its website is remembered.
- **Opens in the desktop app or the website**, chosen per chat (see below). **Open all** opens every chat in the current view.
- Mac-style touches: right-click menus, keyboard shortcuts (`⌘K`, `↑↓↩`, `N`, `E`, `P`, `⌫`), Undo for delete, light and dark mode, and Reduce Transparency support.

## Does "open in app" work?
Checked against the code of the apps installed on macOS (November 2026):

| Provider | Mac | iPhone / Android |
|---|---|---|
| Claude | ✅ `claude://claude.ai/chat/<id>` opens that exact chat in the Claude app | ✅ link opens the app |
| ChatGPT | ❌ the Mac app has no link that opens a regular chat, so it opens the website | ✅ link opens the app |
| Gemini | ❌ there is no Mac app, so it opens the website | ✅ link opens the app |

App link formats can be changed in Settings → Apps.

## Privacy and security
- Chats are stored only in your browser (`localStorage`). There is no account, server or analytics.
- **The Claude API key is kept in memory only.** It is never saved, never in backups and never in a URL, so you enter it again after a reload. AI requests go straight from your browser to `api.anthropic.com`, and only after you click.
- **Capture uses the clipboard.** The Save button copies the chat and Agent Mash reads it from your paste. Conversation text never goes in a web address.
- **Everything rendered is escaped.** All HTML goes through an auto-escaping `html` template and one audited sink, enforced by Trusted Types.
- **Links must be plain `https://` addresses.** Desktop-app links come only from a verified allowlist.
- **Backups are untrusted input.** They're size-limited, strictly schema-validated and imported all-or-nothing.
- **Strict Content Security Policy.** No inline code, no `eval`, no CDN; network access only to Anthropic. The SDK is self-hosted in `vendor/`.
- **Exports aren't encrypted.** Backups and Markdown exports are plaintext, so keep them private.
- **Isolated origin:** served from `agent-mash.pages.dev`, which no other project shares. Cloudflare sends the security headers from `_headers` (CSP with `frame-ancestors`, HSTS, `nosniff`, COOP/CORP, Permissions-Policy). See [docs/HOSTING.md](docs/HOSTING.md).

## Run locally
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Checks and tests
```bash
npm ci
npx playwright install chromium
npm run check
```
- `npm run lint` runs ESLint (`no-unsanitized`, `no-eval`, `no-script-url`) and `scripts/check-security.mjs`. The script checks the CSP, that there's no inline code or styles, a single HTML sink, no CDN code and no stored API key.
- `npm test` runs the Playwright security regression suite in `tests/security.spec.js`, which follows the pre-launch checklist.
- `npm run deploy` runs every check, builds `_site/` (site files only) and publishes it to Cloudflare Pages. **It stops if any check fails.** You need a one-time `npx wrangler login` first.
- GitHub Actions (`.github/workflows/ci.yml`) runs the same checks on every push.

## Branches
Each major change has its own branch, so you can go back to it:

| Branch | What it changed |
|---|---|
| `theme/matte-graphite` | Matte black (default) and graphite light themes, and removed all purple |
| `feature/provider-picker` | 34 built-in providers, type-ahead picker, custom providers |
| `feature/drag-reorder` | Drag to reorder, drag to folders, sort menu, keyboard moves |
| `feature/privacy-messaging` | Privacy-first positioning: welcome screen, privacy badge, Privacy settings tab, erase-all |
| `feature/backup-visibility` | Back up button in the sidebar, backup status and reminders, restore by dropping a file, storage protection |
| `feature/markdown-export` | Export to an Obsidian vault (.zip) or one Markdown file; copy or save a single chat as Markdown |
| `security/safe-rendering` | Auto-escaping `html` templates, one audited HTML sink, `#rrggbb`-only colors |
| `security/url-allowlist` | https-only chat links, app-link allowlist, launch guard, dedupe keeps query/fragment |
| `security/import-validation` | Strict backup schema, size limits, prototype-key rejection, atomic import |
| `security/api-key-memory-only` | API key in memory only, purge of stored keys, no automatic AI calls |
| `security/capture-clipboard` | Clipboard-paste capture; conversation text never in a URL |
| `security/save-integrity` | Full-content backup fingerprint, honest save failures, multi-tab safety, plaintext export warnings |
| `refactor/split-assets` | CSS/JS moved to files; Anthropic SDK self-hosted |
| `security/csp` | Strict CSP + Trusted Types, no inline styles, `_headers`, frame guard |
| `security/origin-isolation` | Shared-origin warning, moved notice, hosting guide |
| `test/security-regression` | Playwright security tests, ESLint security rules, repo checks, CI-gated deploy |
| `deploy/cloudflare-pages` | Cloudflare Pages hosting at agent-mash.pages.dev, tested `npm run deploy`, moved notice on the old address |

`main` contains all of them and is what GitHub Pages publishes.
