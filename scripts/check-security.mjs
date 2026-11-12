// Repository-level security checks that a linter can't express. Exits non-zero on any failure.
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const js = readFileSync('app.js', 'utf8');
const css = readFileSync('app.css', 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
check(csp, 'index.html must declare a Content-Security-Policy');
for (const d of ["default-src 'none'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "base-uri 'none'",
                 'connect-src https://api.anthropic.com', "require-trusted-types-for 'script'"]) {
  check(csp.includes(d), `CSP is missing: ${d}`);
}
check(!/unsafe-inline|unsafe-eval/.test(csp), "CSP must not allow 'unsafe-inline' or 'unsafe-eval'");
check(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'index.html must not contain inline <script> blocks');
check(!/<style[\s>]/i.test(html), 'index.html must not contain inline <style> blocks');
check(!/\son[a-z]+\s*=/i.test(html), 'index.html must not use inline event handlers');
check(!/\sstyle\s*=/i.test(html), 'index.html must not use style attributes');
check(!/style="/.test(js), 'app.js templates must not emit style attributes');
check(!/https?:\/\/(cdn|unpkg|esm\.sh|jsdelivr)/i.test(html + js), 'no code may be loaded from a CDN at runtime');
check(!/@import\s+url\(\s*['"]?https?:/i.test(css), 'app.css must not import remote styles');

const sinks = js.split('\n').filter(l => /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write/.test(l));
check(sinks.length === 1 && sinks[0].includes('ttPolicy'), `only setHTML() may write HTML; found:\n  ${sinks.join('\n  ')}`);
check(!/localStorage\.setItem\([^)]*apiKey|sessionKey[^;\n]*localStorage/.test(js), 'the API key must never be written to storage');
check(!/settings\.apiKey\s*=(?!=)/.test(js), 'the API key must not be stored in settings');

if (failures.length) {
  console.error('Security checks failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Security checks passed');
