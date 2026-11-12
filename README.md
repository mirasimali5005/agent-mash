# Agent Mash

**The private library for your best AI conversations.**

Save the ChatGPT, Claude, Gemini, Kimi, DeepSeek and Grok chats that matter (34 providers in all) in one calm, searchable place. It's like Obsidian or Apple Notes, but for AI chats: a library you control, not another extension inside the AI sites.

- **Stays on your device.** No account, no server, no tracking. Chats live in your browser.
- **You choose what to keep.** Save the conversations with real value, and find them again in seconds.
- **Works across every AI you use**, opening each chat in its website or desktop app.
- **Simple and durable.** Export a backup any time, in plain files you can open years from now.

**Live:** https://mirasimali5005.github.io/agent-mash/ (styled like a native macOS app; install it to your Dock)
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

## Privacy
- Chats are stored only in your browser (`localStorage`). Use Export/Import to move them.
- Captured text is passed after the `#` in the page address, which browsers never send to a server.
- The Claude API key is optional and stays in this browser. When set, chat text is sent only to `api.anthropic.com` through the official Anthropic SDK. All of your `*.github.io` pages share browser storage, so use a key with a low spend limit.

## Run locally
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Branches
Each major change has its own branch, so you can go back to it:

| Branch | What it changed |
|---|---|
| `theme/matte-graphite` | Matte black (default) and graphite light themes, and removed all purple |
| `feature/provider-picker` | 34 built-in providers, type-ahead picker, custom providers |
| `feature/drag-reorder` | Drag to reorder, drag to folders, sort menu, keyboard moves |
| `feature/privacy-messaging` | Privacy-first positioning: welcome screen, privacy badge, Privacy settings tab, erase-all |

`main` contains all of them and is what GitHub Pages publishes.
