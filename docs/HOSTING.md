# Hosting Agent Mash on its own origin

Browsers isolate storage by **origin** (scheme + host + port), not by path. Today Agent Mash runs at
`https://mirasimali5005.github.io/agent-mash/`, and every other project published under
`mirasimali5005.github.io` shares that origin. Any of them can read Agent Mash's `localStorage`,
which holds your saved chats. (The Claude API key is no longer stored, so it isn't exposed this way.)

Moving to another path on the same host does **not** fix this. Agent Mash needs a host of its own.

## Option A: Cloudflare Pages (recommended, free)
1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, then pick `agent-mash`.
2. Build command: *(none)*. Output directory: `/`.
3. Deploy. The site is served at `https://<project>.pages.dev`, which is its own origin.
4. The `_headers` file in this repo is applied automatically: CSP with `frame-ancestors`, HSTS,
   `X-Frame-Options`, `nosniff`, COOP/CORP and Permissions-Policy.
5. Optional: add a custom domain such as `agentmash.yourdomain.com`.

## Option B: GitHub Pages under a dedicated organization
Create a GitHub organization (for example `agentmash`) and publish this repo as its user site,
`agentmash.github.io`. That host serves nothing else, so the origin isn't shared. GitHub Pages can't
send custom headers, so the CSP comes from the `<meta>` tag and the app's own frame check.

## Option C: GitHub Pages with a custom domain
Add a `CNAME` with a domain or subdomain used only by Agent Mash.

## After moving
1. Set `CANONICAL_ORIGIN` in `app.js` to the new origin, for example `'https://agent-mash.pages.dev'`.
2. Keep the old address up for a while. Visitors there see a "moved" notice with a one-click backup.
3. On the new address, restore from that backup (Settings → Backup, or drop the file onto the window).
4. Then turn off GitHub Pages for this repo, or replace the old page with a link to the new one.
