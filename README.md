# Agent Mash

One searchable home for your AI chats across ChatGPT, Claude and Gemini, styled like a native macOS app with a Liquid Glass look. You can install it to your Dock.

**Live:** https://mirasimali5005.github.io/agent-mash/

## What it does
- **One-click capture.** A bookmark button saves the current chat's link, title and conversation text, so you don't have to describe each chat yourself.
- **Understands chats.** Without AI, it pulls keywords from the conversation and suggests a folder. With an optional Claude API key, Claude writes the title, summary, tags, search keywords and folder.
- **Search.** Matches titles, summaries, tags, notes, folders and the conversation text itself, and shows the matching line. **Ask Claude** (`⇧↩`) searches by meaning.
- **Organize.** Folders with sub-folders (`Work/Startup`), tags, Pinned, Recent and Unfiled views, and provider filters. Drag a card onto a folder to move it.
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
