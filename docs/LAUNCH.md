# Agent Mash launch kit

Where to post the demo video, in what order, ready-to-edit drafts for each place, and how to handle replies.

**Video:** `demo-video/out/agent-mash-demo.mp4` (53 s, 1920×1080, about 9 MB, works with the sound off)
**Link to share:** https://agent-mash.pages.dev. Never share the old `github.io` address: it can't be updated yet, so it still runs the old version.

> These drafts are starting points. Rewrite them in your own words. Communities (Hacker News and Reddit especially) react badly to text that reads as AI-written. Check each community's current rules before posting; they change often.

---

## 0. Before you post anything (about 1 hour)

| To do | Why |
|---|---|
| **Add a LICENSE file** (MIT is the usual choice for a project like this) | The repo is public but has no license, so legally no one may reuse the code. HN and Reddit readers will ask about this. |
| **Upload the video to YouTube** (public, or unlisted first) | Product Hunt takes a YouTube link for its video rather than an MP4 file, and YouTube is easy to embed anywhere. |
| **Embed the video in the GitHub README** | Edit README.md on github.com and drag the MP4 into the editor. GitHub uploads it and shows a player inline. |
| **Make a vertical 9:16 cut (optional)** | Needed for YouTube Shorts, TikTok and Instagram Reels. The workflow part (copy → paste → reopen) is the strongest clip. |
| **Take 3–5 still images at 1270×760** | For the Product Hunt gallery (it needs at least 2) and for posts where a picture beats a video. |
| **Open the live site once on your phone** | People will try it on mobile straight away. |

---

## 1. Where, and in what order (best guess)

| # | Channel | Why it fits | When |
|---|---|---|---|
| 1 | **X / Twitter** (upload the video natively) | AI-tool users and builders spend time here. A 53 s clip is within the free-account limit of about 2 min 20 s. | Day 1 |
| 2 | **r/SideProject** | One of the most promotion-friendly subreddits; expect to engage with other people's projects too. | Day 1 |
| 3 | **LinkedIn** (native video) | Knowledge workers who juggle several AIs; the privacy angle works for work use. | Day 1–2 |
| 4 | **Show HN** | Strong match: no server, no extension, a strict security policy, open source. HN loves "local-first" and "how it's built". | Day 3, Tue–Thu morning US Pacific |
| 5 | **AI subreddits** (r/ChatGPT, r/ClaudeAI, r/GeminiAI) | Exactly the users with the problem. Most have strict self-promotion rules, so read the sidebar, use a promo thread or flair if one exists, and lead with the problem rather than the product. | Days 3–7, one at a time |
| 6 | **r/ObsidianMD** | The Obsidian vault export is a real hook. Check their self-promotion rules first. | Week 2 |
| 7 | **Product Hunt** | Good for credibility and backlinks, but a launch needs prep: gallery, YouTube video, a few people ready to try it. | Week 2–3, on a weekday |
| 8 | **Indie Hackers, dev.to, Peerlist** | A build story (privacy-first, security hardening, no backend) reaches builders. | Week 2 |
| 9 | **Directories**: AlternativeTo, There's An AI For That, Futurepedia, BetaList, Uneed, SaaSHub | Low effort, long-tail search traffic. On AlternativeTo, list it as an alternative to chat-organizer extensions. | Any time |
| 10 | **YouTube Shorts / TikTok / Reels** (vertical cut) | Only if you'll keep posting there; one-off posts rarely take off. | Optional |

**Skip:** r/privacy (bans self-promotion), r/opensource (moderators exclude AI-related projects), and generic "promote your startup" groups.

**One message everywhere:** *A private library for the AI chats worth keeping: no account, no extension, nothing leaves your browser.*

---

## 2. Drafts

### YouTube
**Title:** Agent Mash: save your best ChatGPT, Claude & Gemini chats in one private place

**Description:**
```
Agent Mash is a free, private library for the AI conversations worth keeping.

Copy a chat's link from ChatGPT, Claude, Gemini, Kimi, DeepSeek and 30+ others, paste it in, and you're one click from getting back to it. Claude chats can open straight in the Claude desktop app.

• No account, no server, no tracking: your library stays in your browser
• No browser extension needed
• Folders, tags, search (including inside saved conversations), drag to arrange
• Back up or export to Markdown / Obsidian any time

Try it: https://agent-mash.pages.dev
Code: https://github.com/mirasimali5005/agent-mash
```
**Tags:** ChatGPT, Claude, Gemini, AI tools, productivity, privacy, local-first, Obsidian

---

### X / Twitter (thread, video on the first post)
```
1/ I kept losing my best AI chats. Some were in ChatGPT, some in Claude, some in Gemini, half in the apps.

So I built Agent Mash: a private library for the ones worth keeping.

Copy the link → paste → one click to get back to it.

agent-mash.pages.dev
[attach video]
```
```
2/ No account. No server. No extension.
Everything stays in your browser. There's literally no backend to send your chats to.
```
```
3/ Works with ChatGPT, Claude, Gemini, Kimi, DeepSeek, Grok, Perplexity and ~30 more.
Claude chats can open straight in the Claude desktop app.
```
```
4/ Folders, tags, drag to reorder, search inside saved conversations, and export to Markdown or Obsidian.
```
```
5/ It's free and open source. I'd love feedback, especially on what's missing for how you use AI.
github.com/mirasimali5005/agent-mash
```

---

### LinkedIn
```
How many AI chats did you have this week, and could you find last Tuesday's good one?

I use ChatGPT, Claude and Gemini daily, across their apps and websites. The useful conversations kept getting buried, so I built Agent Mash: a private library for the AI chats worth keeping.

→ Copy a chat's link, paste it in, and you're one click from it later
→ Folders, tags, search, and Claude chats that open in the Claude desktop app
→ No account, no server, no extension. Your library stays in your browser.

It's free: agent-mash.pages.dev

If you use more than one AI tool at work, I'd really like to hear how you keep track of things.
```

---

### r/SideProject
**Title:** I built a private, no-extension library for saving your best ChatGPT/Claude/Gemini chats

```
I use several AI tools and kept losing the good conversations, especially the ones in the desktop apps.

Agent Mash is a small web app: copy a chat's link, paste it in, and it goes into your library with folders and tags. Click it later and you're back in the chat. Claude chats can open directly in the Claude desktop app.

What I cared about:
- No account, no server: everything is stored in your browser (localStorage), with export/import
- No browser extension, so nothing needs permission to read your AI sites
- 34 providers detected from the link
- Search inside the conversation text if you capture it, plus Markdown/Obsidian export
- A strict Content Security Policy and an automated security test suite, because it holds personal stuff

Demo video: [link or upload]
Try it: https://agent-mash.pages.dev
Code: https://github.com/mirasimali5005/agent-mash

Honest limitations: no sync between devices yet (backup files only), and saving is deliberate (one link at a time), not automatic.

What would make you actually use something like this?
```

---

### r/ChatGPT, r/ClaudeAI, r/GeminiAI
Read the rules first. If there's a weekly self-promo thread, post there. Otherwise lead with the problem, keep it short, and expect it may be removed.
```
How do you keep track of the chats worth keeping across ChatGPT/Claude/Gemini?

I ended up building a small free tool for myself: you paste a chat's link and it goes into a private library (folders, tags, search) that lives only in your browser, with no account or extension. Clicking it reopens the chat (Claude ones open in the desktop app).

Short demo: [video]. Curious what others do: bookmarks? Notion? Just scrolling the sidebar forever?
```
Even better: answer existing "how do I organize my chats" threads with a helpful reply, and mention it only where it truly fits.

---

### Show HN (write this one yourself)
HN moderators reportedly asked in March 2026 that Show HN text not be written or edited with an LLM. I couldn't confirm that in the official rules, but assume it applies, and use this outline only as notes.

**Title pattern:** `Show HN: Agent Mash – a local-first library for your AI chat links`

**Points to cover, in your own words:**
- the problem you personally had (multiple AIs, apps vs. web, good chats getting lost)
- what it is: a static page, no backend, localStorage, export/import
- why no extension (permissions, extensions breaking when sites change)
- how app links work (the Claude desktop app's `claude://claude.ai/chat/<id>` link) and why ChatGPT can't do the same on Mac
- the security work (auto-escaping templates plus Trusted Types, strict CSP, schema-validated imports, API key kept in memory only, Playwright security tests), which HN will care about
- limitations: no sync, saving is manual, and the optional Claude feature calls the API from the browser with your own key
- ask a specific question (e.g. "would you want sync via a file in iCloud/Dropbox, or not at all?")

**Rules:** title starts with "Show HN:", link to the live site (something people can try), never ask anyone to upvote, and answer every comment yourself.

---

### Product Hunt
- **Name:** Agent Mash
- **Tagline (60 chars max):** `Your best AI chats, saved privately in one place`
- **Description (260 chars max):**
  `Paste a link from ChatGPT, Claude, Gemini or 30+ other AIs and it goes into your private library: folders, tags, search, drag to arrange. No account, no server, no extension. Claude chats open in the desktop app. Free.`
- **Topics:** Productivity, Artificial Intelligence, Privacy, Open Source
- **Gallery:** YouTube video first, then 3–4 stills (library, add-a-chat sheet, search hit inside a conversation, Privacy tab)
- **Maker comment:**
```
Hi Product Hunt 👋

I bounce between ChatGPT, Claude and Gemini (apps and web) and kept losing the conversations that mattered. Agent Mash is my fix: a private library for the AI chats worth keeping.

• Paste a chat link, and it's one click away later (Claude chats open in the desktop app)
• Folders, tags, search inside saved conversations, drag to arrange
• No account, no server, no extension. Your library lives in your browser
• Export to Markdown/Obsidian any time

It's free and open source. What would make this part of your daily workflow?
```

---

### Indie Hackers / dev.to (build story)
**Title ideas:**
- "I built a privacy-first app with no backend, then hardened it like it had one"
- "What a security review found in my 'simple' localStorage app"

**Outline:** the problem → the first version in a weekend → the security review (stored XSS from imported backups, API key in localStorage, `javascript:` URLs, shared `github.io` origin) → the fixes, each on its own branch, with Playwright tests → moving to Cloudflare Pages for real security headers → what's next. Link the repo and the video.

---

### Directory one-liners
- **Short (≈60):** Private library for your best ChatGPT, Claude and Gemini chats.
- **Medium (≈160):** Save links to AI chats from ChatGPT, Claude, Gemini and 30+ more in a private library with folders, tags and search. No account, no extension, free.
- **Long:** use the Product Hunt description.

---

## 3. Handling replies

Answer fast in the first few hours, thank people for criticism, and don't argue. Common questions:

| They ask | Answer |
|---|---|
| "Is it safe? Where's my data?" | Only in your browser's storage. There's no server or account. The Privacy tab shows exactly what ever goes over the network. |
| "Why not an extension that saves everything automatically?" | On purpose: no permissions to read your AI sites, and nothing breaks when those sites change. It's a library of the chats worth keeping, not an archive of everything. |
| "Does it sync between devices?" | Not yet. Download a backup and restore it on the other device. Ask whether they'd want sync, and how. |
| "Does it work on my phone?" | Yes, in any browser, and links open the installed ChatGPT, Claude or Gemini app. |
| "ChatGPT links open the website, not the app?" | The ChatGPT Mac app has no link that opens a specific chat. Claude's does, so Claude links open in its app. On phones, every provider's app opens. |
| "Does the AI feature cost money / send my chats?" | Optional and off by default. Only with your own Claude key and only when you click; the key is never saved. Leave it blank and it's 100% free and local. |
| "How is this different from LLMnesia / Foldery / ChatFolders?" | No extension, works in any browser including mobile, opens chats in the desktop app, and it's a hand-picked library rather than auto-indexing everything. Credit them; they're good at what they do. |
| A bug report | Thank them, ask for steps, fix it, and reply when it's live. That reply often gets more goodwill than the launch post. |

**What to track (no analytics in the app, by design):** GitHub stars, X impressions and replies, the Reddit comment count, the questions people repeat (that's your roadmap), and anyone who comes back a second day.
