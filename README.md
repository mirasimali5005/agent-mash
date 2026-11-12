# Agent Mash

One searchable home for your AI chats across ChatGPT, Claude and Gemini.

Paste a chat link (or use the one-click bookmark), put it in a folder, tag it, and get back to it by searching a keyword. Each chat can open in the **website** or the **desktop app**.

## Features
- **Folders** with sub-folders (`Work/Startup`), plus **Recent**, **Pinned** and **Unfiled** views
- **Provider filters** (ChatGPT / Claude / Gemini / Other), detected from the link automatically
- **Search** across title, notes, tags, folder and URL. Every word must match. Keyboard: `/` to search, `↑ ↓` to pick, `Enter` to open, `n` for a new chat
- **Open in app or web**, set per chat. App links are templates you can edit in Settings (Claude desktop uses `claude://claude.ai{path}`)
- **Open all** opens every chat in the current view at once (allow pop-ups for the site)
- **One-click capture bookmarklet**: on any chat page, click it and Agent Mash opens with the link and title filled in
- **Export / import** a JSON backup

## Privacy
Everything is stored in your browser's `localStorage`. Nothing is sent to a server. The capture bookmarklet passes the link in the URL `#hash`, which browsers never send to the server. Data doesn't sync between browsers or devices on its own, so use Export/Import to move it.

## Run locally
Open `index.html`, or run `python3 -m http.server` and visit http://localhost:8000.
