# Agent Mash demo video

A 53-second, 1920×1080 product demo made with [Remotion](https://www.remotion.dev). It uses real screenshots of the live site.

- **Output:** `out/agent-mash-demo.mp4`
- **Opening workflow:** `src/Workflow.tsx`. In a browser window, copy a ChatGPT chat's link, paste it into Agent Mash and save it. Click the saved chat to return to it, then open a Claude chat. The chat pages are neutral stand-ins with no provider branding; the Agent Mash screens are real.
- **Feature tour:** `src/Video.tsx` (library, one-click capture, search, providers, drag to arrange, open in the Claude app, privacy, outro)
- **Screenshots:** `capture.mjs` takes them from https://agent-mash.pages.dev in a fresh browser profile with sample chats. Use `LOCAL=1` to capture from a local copy instead.

```bash
cd demo-video
npm install
npm run capture    # refresh public/shots from the live site
npm run studio     # preview and edit in Remotion Studio
npm run render     # writes out/agent-mash-demo.mp4
```

Remotion is free for individuals and small teams. Larger companies need a company license (see remotion.dev/license).
