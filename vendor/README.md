# Vendored code

## anthropic-sdk-1.3.0.mjs
The official Anthropic TypeScript SDK (`@anthropic-ai/sdk@1.3.0`, MIT licensed), bundled into one browser ES module so Agent Mash never loads code from a CDN at runtime.

- SHA-256: `a99980360a5bae9a06b88749bb462623857dde007078a3a8be397dcc710c3023`
- Rebuild: `scripts/build-sdk.sh` (pins the SDK and esbuild versions)

It is loaded only when you use a Claude feature with your own API key.
