# Agent Mash demo video

A 40-second, 1920×1080 product demo made with [Remotion](https://www.remotion.dev). It uses real screenshots of the live site.

- **Output:** `out/agent-mash-demo.mp4`
- **Scenes:** `src/Video.tsx` (intro, the problem, library, one-click capture, search, providers, drag to arrange, open in the Claude app, privacy, outro)
- **Screenshots:** `capture.mjs` takes them from https://agent-mash.pages.dev in a fresh browser profile with sample chats. Use `LOCAL=1` to capture from a local copy instead.

```bash
cd demo-video
npm install
npm run capture    # refresh public/shots from the live site
npm run studio     # preview and edit in Remotion Studio
npm run render     # writes out/agent-mash-demo.mp4
```

Remotion is free for individuals and small teams. Larger companies need a company license (see remotion.dev/license).
