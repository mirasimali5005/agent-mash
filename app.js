(() => {
'use strict';

/* ============================================================
   Config
   ============================================================ */
const KEY = 'agentmash.v1';
const SDK_URL = './vendor/anthropic-sdk-1.3.0.mjs';   // self-hosted copy, see vendor/README.md
const CTX_MAX = 6000;
const CAPTURE_MARK = 'AGENTMASH-CAPTURE-1\n';
const esc = s => String(s ?? '').replace(/[&<>"'`=]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;'}[c]));
/* ------------------------------------------------------------
   Safe HTML. Every ${value} inside html`...` is escaped for HTML text and
   quoted attributes, unless the value is itself SafeHTML (built by html`` or icon()).
   All innerHTML writes go through setHTML(), which refuses plain strings, so
   chat titles, notes, provider names and imported data always render as inert text.
   ------------------------------------------------------------ */
class SafeHTML { constructor(s){ this.s = s; } toString(){ return this.s; } }
function htmlVal(v){
  if (v instanceof SafeHTML) return v.s;
  if (Array.isArray(v)) return v.map(htmlVal).join('');
  if (v === null || v === undefined || v === false) return '';
  return esc(v);
}
const html = (strings, ...vals) => new SafeHTML(strings.reduce((out, str, i) => out + str + (i < vals.length ? htmlVal(vals[i]) : ''), ''));
function setHTML(el, safe){
  if (!(safe instanceof SafeHTML)) throw new TypeError('setHTML only accepts SafeHTML');
  el.innerHTML = safe.s;
}
const ICON_NAME = /^[a-z]+$/;
const icon = (n, cls = 'i') => ICON_NAME.test(n) ? html`<svg class="${cls}"><use href="#i-${n}"/></svg>` : html``;
/* Colors end up in style attributes, so only #rrggbb is ever accepted. */
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const safeColor = c => HEX_COLOR.test(String(c || '')) ? String(c) : '#8e8e93';
/* Built-in AI providers (local list, no network). hosts may include a path prefix, e.g. "x.com/i/grok". */
const BUILTIN_PROVIDERS = [
  ['chatgpt',    'ChatGPT',            '#10a37f', ['chatgpt.com','chat.openai.com'],                     'openai gpt'],
  ['claude',     'Claude',             '#d97757', ['claude.ai'],                                          'anthropic'],
  ['gemini',     'Gemini',             '#4285f4', ['gemini.google.com'],                                  'google bard'],
  ['aistudio',   'Google AI Studio',   '#1a73e8', ['aistudio.google.com'],                                'google gemini studio'],
  ['notebooklm', 'NotebookLM',         '#34a853', ['notebooklm.google.com'],                              'google notebook'],
  ['perplexity', 'Perplexity',         '#20b8cd', ['perplexity.ai'],                                      'pplx'],
  ['grok',       'Grok',               '#9ca3af', ['grok.com','x.com/i/grok'],                            'xai x twitter'],
  ['deepseek',   'DeepSeek',           '#4d6bfe', ['chat.deepseek.com','deepseek.com'],                   'r1'],
  ['kimi',       'Kimi',               '#1f6feb', ['kimi.com','kimi.ai','kimi.moonshot.cn'],              'moonshot'],
  ['mistral',    'Le Chat (Mistral)',  '#ff7000', ['chat.mistral.ai'],                                    'mistral lechat'],
  ['copilot',    'Microsoft Copilot',  '#0ea5e9', ['copilot.microsoft.com','m365.cloud.microsoft'],       'microsoft bing'],
  ['metaai',     'Meta AI',            '#0866ff', ['meta.ai'],                                            'llama facebook instagram'],
  ['qwen',       'Qwen',               '#0891b2', ['chat.qwen.ai','qwen.ai','tongyi.aliyun.com'],         'alibaba tongyi'],
  ['zai',        'Z.ai (GLM)',         '#6b7280', ['chat.z.ai','z.ai','chatglm.cn'],                      'glm zhipu chatglm'],
  ['minimax',    'MiniMax',            '#e11d48', ['chat.minimax.io','agent.minimax.io','minimax.io'],    'hailuo'],
  ['manus',      'Manus',              '#737373', ['manus.im'],                                           'agent'],
  ['doubao',     'Doubao',             '#2563eb', ['doubao.com'],                                         'bytedance'],
  ['yuanbao',    'Yuanbao',            '#22c55e', ['yuanbao.tencent.com'],                                'tencent hunyuan'],
  ['ernie',      'ERNIE Bot',          '#3b82f6', ['yiyan.baidu.com'],                                    'baidu wenxin'],
  ['poe',        'Poe',                '#0f766e', ['poe.com'],                                            'quora'],
  ['huggingchat','HuggingChat',        '#e8b10a', ['huggingface.co/chat'],                                'hugging face'],
  ['duckai',     'Duck.ai',            '#de5833', ['duck.ai'],                                            'duckduckgo'],
  ['you',        'You.com',            '#2563eb', ['you.com'],                                            ''],
  ['phind',      'Phind',              '#f97316', ['phind.com'],                                          ''],
  ['genspark',   'Genspark',           '#14b8a6', ['genspark.ai'],                                        ''],
  ['pi',         'Pi',                 '#15803d', ['pi.ai'],                                              'inflection'],
  ['characterai','Character.AI',       '#64748b', ['character.ai'],                                       'cai'],
  ['lmarena',    'LMArena',            '#ef4444', ['lmarena.ai'],                                         'chatbot arena'],
  ['t3chat',     'T3 Chat',            '#f43f5e', ['t3.chat'],                                            ''],
  ['openrouter', 'OpenRouter',         '#64748b', ['openrouter.ai'],                                      ''],
  ['v0',         'v0',                 '#a3a3a3', ['v0.dev','v0.app'],                                    'vercel'],
  ['lovable',    'Lovable',            '#fb7185', ['lovable.dev'],                                        ''],
  ['bolt',       'Bolt',               '#1d9bf0', ['bolt.new'],                                           'stackblitz'],
  ['replit',     'Replit',             '#f26207', ['replit.com'],                                         'agent'],
];
const GLYPHS = { chatgpt:'⬡', claude:'✳', gemini:'✦', other:'•' };
/* ------------------------------------------------------------
   URL safety. Chat links must be plain https:// web addresses. Desktop-app links
   come only from this allowlist, which builds them from a validated https link;
   nobody (including an imported backup) can supply their own scheme or template.
   ------------------------------------------------------------ */
const MAX_URL = 2048;
const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const APP_LINK_RULES = {
  // Verified in the Claude Mac app's own link handler: claude://claude.ai/chat/<uuid> and /project/<uuid>
  claude: u => {
    if (u.hostname !== 'claude.ai') return null;
    const m = u.pathname.replace(/\/+$/, '').match(new RegExp(`^/(chat|project)/(${UUID_RE})$`, 'i'));
    return m ? `claude://claude.ai/${m[1].toLowerCase()}/${m[2].toLowerCase()}` : null;
  },
};
const APP_LINK_OK = new RegExp(`^claude://claude\\.ai/(chat|project)/${UUID_RE}$`);
function safeChatUrl(raw){
  let str = String(raw ?? '').trim();
  if (!str || str.length > MAX_URL || /[\s<>"`]/.test(str)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(str)) str = 'https://' + str;
  let u; try { u = new URL(str); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) return null;
  return u.href;
}
const SWATCHES = ['#10a37f','#d97757','#4285f4','#20b8cd','#ff7000','#1d9bf0','#e8b10a','#0f766e','#ef4444','#64748b','#14b8a6','#f97316','#0ea5e9','#84cc16'];
const PROVIDERS = {};
function registerProvider(key, p){
  const name = String(p.name || key).slice(0, 40);
  PROVIDERS[key] = { name, color:safeColor(p.color), hosts:(Array.isArray(p.hosts) ? p.hosts : []).map(String).slice(0, 10), aliases:String(p.aliases || '').slice(0, 200), custom:!!p.custom,
    letter: GLYPHS[key] || (name.match(/[A-Za-z0-9]/)?.[0] || '•').toUpperCase() };
}
BUILTIN_PROVIDERS.forEach(([k, name, color, hosts, aliases]) => registerProvider(k, { name, color, hosts, aliases }));
registerProvider('other', { name:'Other', color:'#8e8e93' });
const P = k => PROVIDERS[k] || PROVIDERS.other;
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ============================================================
   Storage
   ============================================================ */
let db;   // loaded below, after the schema it is validated against
const ui = { view:'all', folder:null, tag:null, provider:null, q:'', sel:0, aiIds:null, aiBusy:false };
let editing = null, openIn = 'web', provPicked = 'chatgpt', openTouched = false;

/* ============================================================
   Data schema. Everything that comes from storage or a backup file passes
   through here. Only known fields of the right type and size survive.
   strict:true (backup import): any problem rejects the whole file.
   strict:false (this browser's own storage): bad records are dropped or trimmed.
   ============================================================ */
const LIMITS = { fileBytes: 20 * 1024 * 1024, chats: 10000, id: 40, title: 300, summary: 2000, notes: 5000, folder: 200, tag: 40, tags: 30,
  keywords: 30, keyword: 60, folders: 2000, providers: 200, providerName: 40, hosts: 10, host: 120, bar: 60 };
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CHAT_KEYS = new Set(['id','url','title','provider','folder','tags','notes','summary','context','keywords','openIn','pinned','lastOpened','created','order']);
const TOP_KEYS = new Set(['app','version','exported','chats','folders','customProviders','bar','settings','templates']);   // "templates" = ignored legacy field
const SETTING_KEYS = new Set(['apiKey','model','autoAI','theme','sort','lastBackup','backupSig','remind','welcomed','themeV2']);
const MODELS = ['claude-opus-5-5','claude-sonnet-5-5','claude-haiku-5-5'];
class SchemaError extends Error {}
function isPlainObject(v){ return v !== null && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null); }
function checkKeys(obj, allowed, where, strict){
  for (const k of Object.keys(obj)){
    if (BAD_KEYS.has(k)) throw new SchemaError(`forbidden key "${k}" in ${where}`);
    if (!allowed.has(k) && strict) throw new SchemaError(`unknown field "${k.slice(0, 40)}" in ${where}`);
  }
}
function vStr(v, max, where, strict, fallback = ''){
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'string'){ if (strict) throw new SchemaError(`${where} must be text`); return fallback; }
  if (v.length > max){ if (strict) throw new SchemaError(`${where} is too long (max ${max} characters)`); return v.slice(0, max); }
  return v;
}
function vNum(v, where, strict, fallback = 0){
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v)){ if (strict) throw new SchemaError(`${where} must be a number`); return fallback; }
  return v;
}
function vBool(v, where, strict, fallback = false){
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'boolean'){ if (strict) throw new SchemaError(`${where} must be true or false`); return fallback; }
  return v;
}
function vStrList(v, maxItems, maxLen, where, strict){
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)){ if (strict) throw new SchemaError(`${where} must be a list`); return []; }
  if (v.length > maxItems){ if (strict) throw new SchemaError(`${where} has too many items (max ${maxItems})`); v = v.slice(0, maxItems); }
  return v.map((x, i) => vStr(x, maxLen, `${where}[${i}]`, strict)).filter(Boolean);
}
function vFolder(v, where, strict){
  const f = vStr(v, LIMITS.folder, where, strict).trim().replace(/^\/+|\/+$/g, '').replace(/\s*\/\s*/g, '/');
  if (f.split('/').length > 8){ if (strict) throw new SchemaError(`${where} is nested too deeply`); return f.split('/').slice(0, 8).join('/'); }
  return f;
}
function sanitizeChat(c, i, strict){
  const where = `chat #${i + 1}`;
  if (!isPlainObject(c)) throw new SchemaError(`${where} is not an object`);
  checkKeys(c, CHAT_KEYS, where, strict);
  const url = safeChatUrl(vStr(c.url, MAX_URL, `${where} link`, strict));
  if (!url) throw new SchemaError(`${where} has a link that isn't a plain https:// address`);
  const provider = vStr(c.provider, 48, `${where} provider`, strict, 'other');
  return {
    id: /^[a-z0-9]{6,40}$/.test(c.id) ? c.id : uid(),
    url,
    title: vStr(c.title, LIMITS.title, `${where} title`, strict).trim() || url,
    provider: /^[a-z0-9-]{1,48}$/.test(provider) ? provider : 'other',
    folder: vFolder(c.folder, `${where} folder`, strict),
    tags: vStrList(c.tags, LIMITS.tags, LIMITS.tag, `${where} tags`, strict).map(t => t.trim().toLowerCase()).filter(Boolean),
    keywords: vStrList(c.keywords, LIMITS.keywords, LIMITS.keyword, `${where} keywords`, strict),
    notes: vStr(c.notes, LIMITS.notes, `${where} notes`, strict),
    summary: vStr(c.summary, LIMITS.summary, `${where} summary`, strict),
    context: vStr(c.context, CTX_MAX, `${where} conversation text`, strict),
    openIn: c.openIn === 'app' ? 'app' : 'web',
    pinned: vBool(c.pinned, `${where} pinned`, strict),
    lastOpened: Math.max(0, vNum(c.lastOpened, `${where} lastOpened`, strict)),
    created: Math.max(0, vNum(c.created, `${where} created`, strict, Date.now())),
    order: vNum(c.order, `${where} order`, strict, i),
  };
}
function sanitizeProviders(v, strict){
  const out = Object.create(null);
  if (v === undefined || v === null) return out;
  if (!isPlainObject(v)) throw new SchemaError('custom providers must be an object');
  const entries = Object.entries(v);
  if (entries.length > LIMITS.providers) throw new SchemaError('too many custom providers');
  for (const [k, p] of entries){
    if (BAD_KEYS.has(k)) throw new SchemaError(`forbidden key "${k}" in custom providers`);
    try {
      if (!/^x-[a-z0-9-]{1,46}$/.test(k)) throw new SchemaError(`invalid custom provider id "${k.slice(0, 40)}"`);
      if (!isPlainObject(p)) throw new SchemaError(`custom provider ${k} is not an object`);
      checkKeys(p, new Set(['name','color','hosts']), `custom provider ${k}`, strict);
      const name = vStr(p.name, LIMITS.providerName, `custom provider ${k} name`, strict).trim();
      if (!name) throw new SchemaError(`custom provider ${k} has no name`);
      if (p.color !== undefined && !HEX_COLOR.test(String(p.color))) throw new SchemaError(`custom provider ${k} color must look like #12ab34`);
      const hosts = vStrList(p.hosts, LIMITS.hosts, LIMITS.host, `custom provider ${k} hosts`, strict).map(h => h.toLowerCase());
      if (hosts.some(h => !/^[a-z0-9.-]+\.[a-z]{2,}(\/[a-z0-9._~\/-]*)?$/.test(h))) throw new SchemaError(`custom provider ${k} has an invalid website`);
      out[k] = { name, color: safeColor(p.color), hosts };
    } catch (e){ if (strict) throw e; }
  }
  return out;
}
function sanitizeSettings(v, strict){
  const st = isPlainObject(v) ? v : {};
  checkKeys(st, SETTING_KEYS, 'settings', strict);
  return {
    model: MODELS.includes(st.model) ? st.model : 'claude-opus-5-5',
    theme: ['dark','light','auto'].includes(st.theme) && st.themeV2 ? st.theme : 'dark',
    themeV2: true,
    sort: ['manual','recent','added','name'].includes(st.sort) ? st.sort : 'manual',
    lastBackup: Math.max(0, vNum(st.lastBackup, 'settings.lastBackup', false)),
    backupSig: typeof st.backupSig === 'string' ? st.backupSig.slice(0, 80) : '',
    remind: st.remind !== false,
    welcomed: st.welcomed === true,
  };
}
function sanitizeLibrary(d, { strict = false } = {}){
  if (d === undefined || d === null) d = {};
  if (!isPlainObject(d)) throw new SchemaError('the file is not an Agent Mash backup');
  checkKeys(d, TOP_KEYS, 'the backup', strict);
  if (strict && !Array.isArray(d.chats)) throw new SchemaError('the file has no list of chats');
  const rawChats = Array.isArray(d.chats) ? d.chats : [];
  if (rawChats.length > LIMITS.chats) throw new SchemaError(`too many chats (max ${LIMITS.chats})`);
  const chats = [];
  rawChats.forEach((c, i) => { try { chats.push(sanitizeChat(c, i, strict)); } catch (e){ if (strict) throw e; } });
  const ids = new Set();
  chats.forEach(c => { while (ids.has(c.id)) c.id = uid(); ids.add(c.id); });
  return {
    chats,
    folders: vStrList(d.folders, LIMITS.folders, LIMITS.folder, 'folders', strict).map(f => vFolder(f, 'folder', strict)).filter(Boolean),
    customProviders: sanitizeProviders(d.customProviders, strict),
    bar: vStrList(d.bar, LIMITS.bar, 48, 'provider bar', strict).filter(k => /^[a-z0-9-]{1,48}$/.test(k)),
    settings: sanitizeSettings(d.settings, strict),
  };
}
function normalize(d){
  try {
    const lib = sanitizeLibrary(d, { strict:false });
    if (!d || !Array.isArray(d.bar)) lib.bar = ['chatgpt','claude','gemini'];
    return lib;
  } catch { return sanitizeLibrary({}, { strict:false }); }
}
/* The Claude API key lives only in this variable. It is never written to storage, backups or URLs. */
let sessionKey = '';
let purgedStoredKey = false;
function load(){
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  if (!raw) return normalize();
  try {
    const parsed = JSON.parse(raw);
    // Earlier versions saved the key in localStorage. Remember that, so we can purge it and tell the person to rotate it.
    if (parsed && parsed.settings && typeof parsed.settings.apiKey === 'string' && parsed.settings.apiKey.trim()) purgedStoredKey = true;
    return normalize(parsed);
  }
  catch {
    // Unreadable data is set aside instead of being overwritten by the next save.
    try { localStorage.setItem(KEY + '.unreadable-' + Date.now(), raw); } catch {}
    return normalize();
  }
}
let lastSynced = null;   // the exact string this window last read from or wrote to storage
let libRev = 0;          // bumps whenever the library changes, used to cache the backup fingerprint
function save(){
  const str = JSON.stringify(db);
  try { localStorage.setItem(KEY, str); lastSynced = str; libRev++; return true; }
  catch {
    // Never pretend a change was kept: go back to what is actually stored.
    try { const stored = localStorage.getItem(KEY); db = stored ? normalize(JSON.parse(stored)) : db; } catch {}
    libRev++;
    toast('Couldn’t save: browser storage is full or blocked. Your last change was not kept.', '', null, 7000);
    if (typeof render === 'function') render();
    return false;
  }
}
/* Pick up writes from another window before changing anything. */
function syncFromStorage(){
  let raw = null; try { raw = localStorage.getItem(KEY); } catch {}
  if (raw && raw !== lastSynced){ db = normalize(JSON.parse(raw)); lastSynced = raw; libRev++; return true; }
  return false;
}
db = load();
try { lastSynced = localStorage.getItem(KEY); } catch {}
if (purgedStoredKey) save();   // rewrites storage without the old key
Object.entries(db.customProviders).forEach(([k, p]) => registerProvider(k, { ...p, custom:true }));

/* ============================================================
   Helpers
   ============================================================ */
function detect(url){
  let u; try { u = new URL(url); } catch { return 'other'; }
  const h = u.hostname.replace(/^www\./,'').toLowerCase(), full = h + u.pathname.toLowerCase();
  let best = 'other', bestLen = 0;   // longest match wins (x.com/i/grok beats a plain host)
  for (const [k,p] of Object.entries(PROVIDERS)) for (const x of p.hosts){
    const hit = x.includes('/') ? (full === x || full.startsWith(x + '/') || full.startsWith(x + '?')) : (h === x || h.endsWith('.' + x));
    if (hit && x.length > bestLen){ best = k; bestLen = x.length; }
  }
  return best;
}
/* type-ahead ranking for the provider picker */
function searchProviders(q){
  q = q.trim().toLowerCase();
  const list = Object.entries(PROVIDERS).filter(([k]) => k !== 'other');
  if (!q) return list.sort((a,b) => (db.bar.indexOf(a[0]) + 1 || 99) - (db.bar.indexOf(b[0]) + 1 || 99)).slice(0, 40);
  return list.map(([k,p]) => {
    const name = p.name.toLowerCase(), words = (name + ' ' + p.aliases + ' ' + p.hosts.join(' ')).split(/[\s().\/-]+/);
    const s = name.startsWith(q) ? 3 : words.some(w => w.startsWith(q)) ? 2 : (name + ' ' + p.aliases).includes(q) ? 1 : 0;
    return [k, p, s];
  }).filter(x => x[2]).sort((a,b) => b[2]-a[2] || a[1].name.length - b[1].name.length).map(([k,p]) => [k,p]).slice(0, 8);
}
function addCustomProvider(name, url){
  name = name.trim().replace(/\s+/g,' ').slice(0, 40);
  if (!name) return null;
  const existing = Object.entries(PROVIDERS).find(([,p]) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing[0];
  let key = 'x-' + name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  while (PROVIDERS[key]) key += '1';
  let hosts = [];
  try { const h = new URL(url).hostname.replace(/^www\./,''); if (h && detect(url) === 'other') hosts = [h]; } catch {}
  const p = { name, color: SWATCHES[Object.keys(db.customProviders).length % SWATCHES.length], hosts };
  db.customProviders[key] = p; registerProvider(key, { ...p, custom:true }); save();
  return key;
}
function hostName(url){ try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ''; } }
function guessName(url){
  const h = hostName(url); if (!h) return '';
  const parts = h.split('.'); const core = parts.length > 2 && /^(chat|app|www|agent|web)$/.test(parts[0]) ? parts[1] : parts[parts.length - 2] || parts[0];
  return core ? core[0].toUpperCase() + core.slice(1) : '';
}
/* Duplicate detection key: keeps the path, query and fragment (they can hold the conversation id),
   ignores host case, "www.", a trailing slash and common tracking parameters. */
function normUrl(u){
  try {
    const x = new URL(u);
    [...x.searchParams.keys()].forEach(k => { if (/^utm_|^(fbclid|gclid|ref|ref_src)$/i.test(k)) x.searchParams.delete(k); });
    x.searchParams.sort();
    return x.hostname.replace(/^www\./, '').toLowerCase() + x.pathname.replace(/\/+$/, '') + x.search + x.hash;
  } catch { return String(u).trim(); }
}
function cleanTitle(t){
  return String(t || '').replace(/\s*[-|–—]\s*(Claude|ChatGPT|Gemini|Google Gemini|Google AI Studio)\s*$/i,'')
    .replace(/^(Claude|ChatGPT|Gemini)\s*[-|–—:]\s*/i,'').trim();
}
function genericTitle(t){ return !t || /^(claude|chatgpt|gemini|google gemini|new chat|untitled)$/i.test(t.trim()); }

/* What actually happens when a chat is opened in "app" mode. */
function appLink(c){
  if (IS_MOBILE) return c.url;                       // iOS/Android: universal links open the installed app
  const rule = APP_LINK_RULES[c.provider];
  const web = safeChatUrl(c.url);
  if (!rule || !web) return c.url;
  return rule(new URL(web)) || c.url;
}
const targetUrl = c => c.openIn === 'app' ? appLink(c) : c.url;
const opensNative = c => !/^https?:/i.test(targetUrl(c));

function ago(t){
  if (!t) return 'Not opened yet';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s/60) + ' min ago';
  if (s < 86400) return Math.floor(s/3600) + ' hr ago';
  if (s < 86400*7) return Math.floor(s/86400) + 'd ago';
  return new Date(t).toLocaleDateString(undefined, { month:'short', day:'numeric' });
}
function allFolders(){
  const set = new Set(db.folders);
  db.chats.forEach(c => { if (c.folder) { const p = c.folder.split('/'); p.forEach((_, i) => set.add(p.slice(0, i+1).join('/'))); } });
  return [...set].sort((a,b) => a.localeCompare(b, undefined, { sensitivity:'base' }));
}
const inFolder = (c, f) => c.folder === f || (c.folder || '').startsWith(f + '/');
const cleanFolder = f => String(f || '').trim().replace(/^\/+|\/+$/g,'').replace(/\s*\/\s*/g,'/');
const parseTags = s => [...new Set(String(s || '').split(',').map(t => t.trim().toLowerCase().replace(/^#/,'')).filter(Boolean))];

/* ============================================================
   Local understanding (no AI): keywords + folder suggestion
   ============================================================ */
const STOP = new Set(('a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just let like make me more most my no nor not now of off on once only or other our ours out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yes okay ok sure thanks thank please need want get got use using used one two also may might much many really well able way something anything thing things here there ' +
  'me ai user assistant chatgpt claude gemini copy edit retry share regenerate response responses message messages said says answer question questions help helpful let lets know think going sounds great good example examples based following provide include including make made sure first second next new also would could should ' +
  'code show shown below above give gives given like look looks looking without within across actually basically simply').split(/\s+/));
function keywordsFrom(text, n = 12){
  const counts = new Map();
  const words = String(text || '').toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
  for (let w of words){
    w = w.replace(/[.-]+$/,'');
    if (w.length < 4 || STOP.has(w) || /^\d/.test(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()].filter(([,c]) => c > 1 || counts.size < 25).sort((a,b) => b[1]-a[1] || b[0].length-a[0].length).slice(0, n).map(([w]) => w);
}
function suggestFolder(kw, exceptId){
  const score = new Map();
  for (const c of db.chats){
    if (!c.folder || c.id === exceptId) continue;
    const theirs = new Set([...(c.keywords||[]), ...(c.tags||[]), ...keywordsFrom(c.title + ' ' + c.summary, 8)]);
    const overlap = kw.filter(k => theirs.has(k)).length;
    if (overlap) score.set(c.folder, (score.get(c.folder) || 0) + overlap);
  }
  const best = [...score.entries()].sort((a,b) => b[1]-a[1])[0];
  return best && best[1] >= 2 ? best[0] : '';
}

/* ============================================================
   Search
   ============================================================ */
function fieldsOf(c){
  return {
    title: c.title.toLowerCase(), tags: (c.tags||[]).join(' ').toLowerCase(), kw: (c.keywords||[]).join(' ').toLowerCase(),
    summary: (c.summary||'').toLowerCase(), notes: (c.notes||'').toLowerCase(), folder: (c.folder||'').toLowerCase(),
    prov: (P(c.provider).name + ' ' + P(c.provider).aliases).toLowerCase(), ctx: (c.context||'').toLowerCase(), url: c.url.toLowerCase(),
  };
}
function score(c, tokens){
  if (!tokens.length) return 1;
  const f = fieldsOf(c);
  let total = 0;
  for (const t of tokens){
    let s = 0;
    if (f.title.includes(t)) s += f.title.split(/[^a-z0-9]+/).some(w => w.startsWith(t)) ? 12 : 7;
    if (f.tags.includes(t)) s += 7;
    if (f.kw.includes(t)) s += 5;
    if (f.summary.includes(t)) s += 5;
    if (f.folder.includes(t)) s += 4;
    if (f.notes.includes(t)) s += 4;
    if (f.prov.split(/\s+/).some(w => w.startsWith(t))) s += 3;
    if (f.ctx.includes(t)) s += 2;
    if (f.url.includes(t)) s += 1;
    if (!s) return 0;           // every word must match somewhere
    total += s;
  }
  return total;
}
function scoped(){
  return db.chats.filter(c => {
    if (ui.view === 'pinned' && !c.pinned) return false;
    if (ui.view === 'recent' && !c.lastOpened) return false;
    if (ui.view === 'unfiled' && c.folder) return false;
    if (ui.view === 'folder' && !inFolder(c, ui.folder)) return false;
    if (ui.view === 'tag' && !(c.tags||[]).includes(ui.tag)) return false;
    if (ui.provider && c.provider !== ui.provider) return false;
    return true;
  });
}
function visible(){
  const tokens = ui.q.toLowerCase().split(/\s+/).filter(Boolean);
  const base = scoped();
  if (ui.aiIds){
    const byId = new Map(base.map(c => [c.id, c]));
    return { list: ui.aiIds.map(id => byId.get(id)).filter(Boolean), tokens: [], ai:true };
  }
  const rec = c => c.lastOpened || c.created || 0;
  let list = base.map(c => ({ c, s: score(c, tokens) })).filter(x => x.s > 0);
  const mode = db.settings.sort;
  list.sort((a,b) => tokens.length ? (b.s - a.s) || (rec(b.c) - rec(a.c))
    : ui.view === 'recent' ? b.c.lastOpened - a.c.lastOpened
    : mode === 'manual' ? a.c.order - b.c.order
    : (b.c.pinned - a.c.pinned) || (mode === 'name' ? a.c.title.localeCompare(b.c.title, undefined, { sensitivity:'base' })
      : mode === 'added' ? b.c.created - a.c.created : rec(b.c) - rec(a.c)));
  if (ui.view === 'recent' && !tokens.length) list = list.slice(0, 40);
  return { list: list.map(x => x.c), tokens };
}
const SORTS = { manual:'Your order', recent:'Recently opened', added:'Date added', name:'Name' };
function canReorder(){ return !ui.q.trim() && !ui.aiIds && ui.view !== 'recent' && db.settings.sort === 'manual'; }
function whyNoReorder(){
  if (ui.q.trim() || ui.aiIds) return 'Clear the search to reorder chats';
  if (ui.view === 'recent') return 'Recent is always sorted by when you opened chats';
  if (db.settings.sort !== 'manual') return `Sorted by ${SORTS[db.settings.sort].toLowerCase()}. Switch to your own order to rearrange.`;
  return '';
}
/* Put the visible chats in a new sequence, keeping hidden chats where they were. */
function applyVisibleOrder(ids){
  const byId = new Map(db.chats.map(c => [c.id, c]));
  const all = [...db.chats].sort((a,b) => a.order - b.order);
  const vis = new Set(ids);
  const slots = all.map((c, i) => vis.has(c.id) ? i : -1).filter(i => i >= 0);
  slots.forEach((pos, k) => { all[pos] = byId.get(ids[k]); });
  all.forEach((c, i) => { c.order = i; });
  save();
}
function moveToEdge(c, top){
  const orders = db.chats.map(x => x.order);
  c.order = top ? Math.min(...orders) - 1 : Math.max(...orders) + 1;
  if (db.settings.sort !== 'manual'){ db.settings.sort = 'manual'; toast('Switched to your own order'); }
  save(); render();
}
function hl(text, tokens){   // returns SafeHTML: the text is escaped first, then <mark> is added around matches
  let out = esc(text);
  for (const t of tokens){
    if (t.length < 2) continue;
    const re = new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'ig');
    out = out.replace(re, '<mark>$1</mark>');
  }
  return new SafeHTML(out);
}
function snippet(c, tokens){
  // show the bit of the conversation that matched, when the match isn't visible elsewhere on the card
  if (!tokens.length || !c.context) return '';
  const f = fieldsOf(c);
  const t = tokens.find(t => !f.title.includes(t) && !f.summary.includes(t) && !f.tags.includes(t) && f.ctx.includes(t));
  if (!t) return '';
  const i = f.ctx.indexOf(t), s = Math.max(0, i - 60);
  return (s ? '…' : '') + c.context.slice(s, i + 90).replace(/\s+/g,' ') + '…';
}

/* ============================================================
   Render
   ============================================================ */
function navItem({ data = {}, title = '', indent = 0, ic, label, count, on, extra = '' }){
  const attrs = Object.entries(data).map(([k, v]) => html` data-${k.replace(/[^a-z-]/g, '')}="${v}"`);
  return html`<div class="nav-item ${on ? 'on' : ''}"${attrs}${title ? html` title="${title}"` : ''}${indent ? html` style="padding-left:${10 + indent * 16}px"` : ''}>${ic}<span class="lbl">${label}</span>${extra}<span class="ct">${count ?? ''}</span></div>`;
}
function render(){
  const n = { all: db.chats.length, recent: db.chats.filter(c => c.lastOpened).length, pinned: db.chats.filter(c => c.pinned).length, unfiled: db.chats.filter(c => !c.folder).length };
  setHTML($('#nav-lib'), html`${[['all','all','All Chats'],['recent','clock','Recent'],['pinned','star','Pinned'],['unfiled','tray','Unfiled']]
    .map(([v, ic, l]) => navItem({ data:{ view:v, drop:v }, ic:icon(ic), label:l, count:n[v], on: ui.view === v }))}`);

  const folders = allFolders();
  setHTML($('#nav-folders'), folders.length ? html`${folders.map(f => navItem({
      data:{ folder:f, drop:'folder' }, title:f, indent: Math.min(6, f.split('/').length - 1), ic:icon('folder'),
      label:f.split('/').pop(), count: db.chats.filter(c => inFolder(c, f)).length, on: ui.view === 'folder' && ui.folder === f,
      extra:html`<button class="x" data-delfolder="${f}" title="Remove folder">${icon('trash')}</button>` }))}`
    : html`<p class="hint" style="padding:2px 10px">Drag chats here, or type a folder like <code>Work/Startup</code> when adding one.</p>`);
  setHTML($('#folderList'), html`${folders.map(f => html`<option value="${f}">`)}`);

  const tagCounts = {};
  db.chats.forEach(c => (c.tags||[]).forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
  const tags = Object.entries(tagCounts).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0, 30);
  $('#tagsHead').style.display = tags.length ? '' : 'none';
  setHTML($('#nav-tags'), html`${tags.map(([t, c]) => navItem({ data:{ tag:t }, ic:icon('tag'), label:t, count:c, on: ui.view === 'tag' && ui.tag === t }))}`);

  const barKeys = [...db.bar.filter(k => PROVIDERS[k])];
  if (ui.provider && !barKeys.includes(ui.provider)) barKeys.push(ui.provider);
  if (db.chats.some(c => c.provider === 'other') && !barKeys.includes('other')) barKeys.push('other');
  setHTML($('#provSeg'), html`<button data-prov="" class="${!ui.provider ? 'on' : ''}">All</button>${
    barKeys.map(k => { const p = P(k), n = db.chats.filter(c => c.provider === k).length;
      return html`<button data-prov="${k}" class="${ui.provider === k ? 'on' : ''}" title="${p.name} · ${n} chat${n === 1 ? '' : 's'} (right-click to remove from bar)"><span class="dot" style="background:${safeColor(p.color)}"></span>${p.name}</button>`; })}`);

  renderPrivacyBadge();
  renderBackupState();
  $('#aiDot').classList.toggle('on', !!sessionKey);
  $('#aiDot').title = sessionKey ? 'Claude AI is on' : 'Claude AI is off';

  const { list, tokens, ai } = visible();
  const title = ui.view === 'folder' ? ui.folder.split('/').pop() : ui.view === 'tag' ? '#' + ui.tag
    : { all:'All Chats', recent:'Recent', pinned:'Pinned', unfiled:'Unfiled' }[ui.view];
  $('#viewTitle').textContent = title;
  $('#viewSub').textContent = ai ? `${list.length} found by Claude` : `${list.length} chat${list.length === 1 ? '' : 's'}${ui.provider ? ' · ' + P(ui.provider).name : ''}${ui.view === 'recent' ? '' : ' · ' + SORTS[db.settings.sort]}`;
  ui.sel = Math.min(ui.sel, Math.max(0, list.length - 1));

  const parts = [];
  if (ui.q.trim().length >= 3 && sessionKey){
    parts.push(ai
      ? html`<div class="ai-row glass">${icon('sparkles')}<span class="t">Claude’s matches for “${ui.q}”</span><button class="pill" data-ai-clear>Show keyword results</button></div>`
      : html`<div class="ai-row glass">${ui.aiBusy ? html`<span class="spin"></span>` : icon('sparkles')}<span class="t">${ui.aiBusy ? 'Claude is reading your chats…' : 'Can’t find it? Claude can search by meaning.'}</span><button class="pill" data-ai-ask ${ui.aiBusy ? html`disabled` : ''}>Ask Claude <kbd style="opacity:.6">⇧↩</kbd></button></div>`);
  }
  if (!db.chats.length){
    parts.push(html`<div class="empty glass"><img class="big" src="icon.svg" alt=""><h2>Save the conversations that matter</h2>
      <p>Click <b>Add</b> and paste a link from any AI chat,<br>or set up the one-click button in <a href="#" data-open-settings>Settings → Capture</a>.</p>
      <p class="hint" style="margin-top:14px">${icon('lock')} No account. No server. Everything stays in this browser.</p></div>`);
  } else if (!list.length){
    parts.push(html`<div class="empty glass"><h2>No matches</h2><p>Try fewer words${ui.provider ? ', or switch the provider filter back to All' : ''}.</p></div>`);
  } else {
    parts.push(...list.map((c, i) => card(c, i, tokens)));
  }
  setHTML($('#grid'), html`${parts}`);
}
function card(c, i, tokens){
  const p = P(c.provider);
  const native = IS_MOBILE || opensNative(c);   // on phones the web link itself opens the installed app
  const mode = c.openIn === 'app'
    ? html`<span class="chip mode" title="${native ? 'Opens in the ' + p.name + ' app' : 'Opens the website (no app link available here)'}">${icon('app')}${native ? 'App' : 'App → web'}</span>`
    : html`<span class="chip mode">${icon('globe')}Web</span>`;
  const snip = snippet(c, tokens);
  const body = c.summary || c.notes;
  return html`<div class="card glass sheen ${i === ui.sel ? 'sel' : ''}" data-id="${c.id}" tabindex="-1">
    <div class="card-actions">
      <button data-act="pin" class="${c.pinned ? 'on' : ''}" title="${c.pinned ? 'Unpin' : 'Pin'}">${icon(c.pinned ? 'starfill' : 'star')}</button>
      <button data-act="edit" title="Edit">${icon('pencil')}</button>
    </div>
    <div class="card-h">
      <div class="av" style="background:${safeColor(p.color)}">${p.letter}</div>
      <div class="card-t"><b>${hl(c.title, tokens)}</b>
        <small><span>${p.name}</span>·<span>${ago(c.lastOpened)}</span></small></div>
    </div>
    ${body ? html`<div class="sum">${hl(body, tokens)}</div>` : ''}
    ${snip ? html`<div class="sum" style="font-style:italic">“${hl(snip, tokens)}”</div>` : ''}
    <div class="chips">${mode}${c.folder ? html`<span class="chip">${hl(c.folder, tokens)}</span>` : ''}${(c.tags||[]).map(t => html`<span class="chip">#${hl(t, tokens)}</span>`)}</div>
  </div>`;
}

/* ============================================================
   Opening chats
   ============================================================ */
/* The only place a link is handed to the browser or the OS. */
function launch(url){
  const web = safeChatUrl(url);
  if (web && web === url){
    const w = window.open(web, '_blank');
    if (w){ try { w.opener = null; } catch {} }      // the chat site can't reach back into this page
    return !!w;
  }
  if (APP_LINK_OK.test(url)){
    const a = document.createElement('a'); a.href = url; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
    return true;
  }
  toast('Blocked a link that isn’t a plain https:// address');
  return false;
}
function openChat(c, mode){
  const url = mode === 'web' ? c.url : mode === 'app' ? appLink(c) : targetUrl(c);
  c.lastOpened = Date.now(); save(); render();
  if (launch(url) && APP_LINK_OK.test(url)){
    const name = P(c.provider).name;
    toast(`Opening in the ${name} app…`, 'Open website instead', () => launch(c.url), 6000);
  }
}
function openAll(){
  const { list } = visible();
  if (!list.length) return;
  if (list.length > 8 && !confirm(`Open ${list.length} chats at once?`)) return;
  let blocked = 0, apps = 0;
  list.forEach((c, i) => {
    const url = targetUrl(c);
    c.lastOpened = Date.now();
    if (APP_LINK_OK.test(url)){ apps++; setTimeout(() => launch(url), i * 350); }   // stagger app hand-offs so none are dropped
    else if (!launch(url)) blocked++;
  });
  save(); render();
  if (blocked) toast(`Your browser blocked ${blocked} tab(s). Allow pop-ups for this site and try again.`);
  else if (apps) toast(`Opening ${apps} chat(s) in apps and ${list.length - apps} in tabs`);
}

/* ============================================================
   Editor sheet
   ============================================================ */
const F = {};
['url','title','folder','tags','summary','notes','context'].forEach(k => F[k] = $('#f-' + k));

function setProv(k){
  provPicked = k;
  const p = P(k);
  $('#f-prov').value = k === 'other' ? '' : p.name;
  $('#provDot').style.background = safeColor(p.color);
  setOpen(openIn);
}
function setOpen(v){
  openIn = v;
  $$('#openPick button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  const fake = { url: F.url.value.trim(), provider: provPicked, openIn: 'app' };
  const name = P(provPicked).name;
  let msg;
  if (v === 'web') msg = 'Opens in a new browser tab.';
  else if (IS_MOBILE) msg = `Opens the link, and your phone hands it to the ${name} app if it's installed.`;
  else if (!/^https?:/i.test(appLink(fake))) msg = html`${icon('check')} Opens this exact chat in the ${name} desktop app.`;
  else if (provPicked === 'claude') msg = 'Only links like claude.ai/chat/… or claude.ai/project/… can open in the app. This one will open the website.';
  else if (provPicked === 'chatgpt') msg = 'The ChatGPT Mac app has no way to open a specific chat from a link, so this opens the website. On iPhone it opens the app.';
  else if (provPicked === 'gemini') msg = 'Gemini has no Mac app, so this opens the website. On a phone it opens the Gemini app.';
  else msg = `${name} has no desktop app link, so this opens the website. On a phone, the link opens the app if one is installed.`;
  setHTML($('#openHint'), html`${msg}`);
}
function openEditor(c, prefill){
  editing = c || null; openTouched = false; $('#saveError').hidden = true;
  const d = c || prefill || {};
  F.url.value = d.url || ''; F.title.value = d.title || ''; F.folder.value = d.folder ?? (ui.view === 'folder' ? ui.folder : '');
  F.tags.value = (d.tags || []).join(', '); F.summary.value = d.summary || ''; F.notes.value = d.notes || ''; F.context.value = d.context || '';
  $('#ctxBox').open = !!(d.context) && !c;
  updateCtxLabel();
  $('#editTitle').textContent = c ? 'Edit Chat' : 'Add Chat';
  $('#editSub').textContent = c ? P(c.provider).name + ' · added ' + new Date(c.created).toLocaleDateString() : (d.context ? 'Captured from your browser. Check the details and save.' : 'Paste a link from any AI chat. The provider is detected automatically.');
  $('#delBtn').style.display = c ? '' : 'none';
  const prov = d.provider || detect(d.url || '');
  openIn = d.openIn || (prov === 'claude' && !IS_MOBILE ? 'app' : 'web');   // Claude defaults to the app (verified to work)
  setProv(d.provider || (d.url ? detect(d.url) : 'chatgpt'));
  setAiBar();
  if (!$('#editDlg').open) $('#editDlg').showModal();
  (d.url ? (d.title ? F.tags : F.title) : F.url).focus();
}
function updateCtxLabel(){
  const n = F.context.value.trim().length;
  $('#ctxSum').textContent = n ? `Conversation text · ${n.toLocaleString()} characters` : 'Conversation text (optional)';
}
function setAiBar(state, text){
  const bar = $('#aiBar');
  if (!sessionKey){
    bar.hidden = false;
    $('#aiBarText').textContent = 'Add a Claude API key in Settings → AI to fill this in automatically.';
    $('#aiRun').textContent = 'Set up'; $('#aiRun').dataset.mode = 'setup'; $('#aiRun').disabled = false;
    setBarIcon(false);
    return;
  }
  bar.hidden = false;
  $('#aiRun').dataset.mode = 'run';
  const spinner = state === 'busy';
  setBarIcon(spinner);
  $('#aiRun').disabled = spinner;
  $('#aiRun').textContent = state === 'done' ? 'Run again' : 'Fill in with Claude';
  setHTML($('#aiBarText'), html`${text || (F.context.value.trim() ? 'Claude can read the conversation text and write the title, summary, tags and folder.' : 'Claude works best with conversation text. Use the bookmark button, or paste some below.')}`);
}
function setBarIcon(spinning){
  const slot = $('#aiBarIcon');
  setHTML(slot, spinning ? html`<span class="spin"></span>` : icon('sparkles'));
}
function localSuggest(force){
  const text = [F.title.value, F.context.value].join('\n');
  const kw = keywordsFrom(text);
  if (!kw.length) return kw;
  if (force || !F.tags.value.trim()) F.tags.value = kw.slice(0, 3).join(', ');
  if (force || !F.folder.value.trim()){ const f = suggestFolder(kw, editing?.id); if (f) F.folder.value = f; }
  if (genericTitle(F.title.value) && F.context.value.trim()){
    const first = F.context.value.replace(/^(Me|AI):\s*/,'').split(/\n/).find(l => l.trim().length > 8) || '';
    F.title.value = first.trim().slice(0, 70);
  }
  return kw;
}
async function aiFill(){
  setAiBar('busy', 'Claude is reading the chat…');
  try {
    const r = await analyzeChat({ url: F.url.value.trim(), title: F.title.value.trim(), provider: provPicked, context: F.context.value, notes: F.notes.value });
    if (r.title) F.title.value = r.title;
    if (r.summary) F.summary.value = r.summary;
    if (r.tags?.length) F.tags.value = r.tags.join(', ');
    if (r.folder !== undefined && (r.folder || !F.folder.value)) F.folder.value = cleanFolder(r.folder);
    F._aiKeywords = r.keywords || [];
    setAiBar('done', html`${icon('check')} Filled in by Claude. Change anything you like.`);
  } catch (e){
    setAiBar('error', html`<span style="color:var(--danger)">${e.message}</span>`);
  }
}
function saveEditor(){
  const url = safeChatUrl(F.url.value);
  if (!url){
    F.url.setCustomValidity('Use a normal https:// link to the chat.');
    F.url.reportValidity();
    return false;
  }
  $('#saveError').hidden = true;
  syncFromStorage();                                      // another window may have changed things
  const before = JSON.stringify(db);
  const target = editing ? db.chats.find(c => c.id === editing.id) : null;
  const context = F.context.value.trim().slice(0, CTX_MAX);
  const data = {
    url, title: F.title.value.trim() || url, provider: provPicked, folder: cleanFolder(F.folder.value), tags: parseTags(F.tags.value),
    summary: F.summary.value.trim(), notes: F.notes.value.trim(), context, openIn,
  };
  data.keywords = [...new Set([...(F._aiKeywords || editing?.keywords || []), ...keywordsFrom(data.title + ' ' + data.summary + ' ' + context, 10)])].slice(0, 20);
  F._aiKeywords = null;
  let note = '';
  if (target) Object.assign(target, data);
  else {
    const dup = db.chats.find(c => normUrl(c.url) === normUrl(url));
    if (dup){ Object.assign(dup, data); note = 'You’d already saved this chat, so it was updated'; }
    else {
      if (editing) note = 'This chat was deleted in another window, so it was saved again';
      db.chats.unshift({ id: editing?.id || uid(), created: editing?.created || Date.now(), lastOpened: 0, pinned: false, order: Math.min(0, ...db.chats.map(c => c.order)) - 1, ...data });
    }
  }
  if (!db.bar.includes(data.provider) && data.provider !== 'other') db.bar.push(data.provider);
  const str = JSON.stringify(db);
  let ok = false;
  try { localStorage.setItem(KEY, str); lastSynced = str; libRev++; ok = true; } catch {}
  if (!ok){
    db = JSON.parse(before);                               // nothing half-applied
    $('#saveError').textContent = 'Couldn’t save: browser storage is full or blocked. Your text is still here. Free up space (export a backup, then delete chats you don’t need) and try again.';
    $('#saveError').hidden = false;
    render();
    return false;
  }
  if (db.chats.length === 1) navigator.storage?.persist?.().catch(() => {});
  render();
  if (note) toast(note);
  return true;
}

/* ============================================================
   Claude (optional): understanding + semantic search
   ============================================================ */
let clientCache = null;
async function getClient(){
  if (!sessionKey) throw new Error('Add your Claude API key in Settings → AI first.');
  if (clientCache?.key === sessionKey) return clientCache;
  let mod;
  try { mod = await import(SDK_URL); } catch { throw new Error('Couldn’t load the Claude SDK. Check your connection.'); }
  const Anthropic = mod.default;
  clientCache = { key: sessionKey, Anthropic, client: new Anthropic({ apiKey: sessionKey, dangerouslyAllowBrowser: true }) };
  return clientCache;
}
async function askClaudeJSON({ system, user, schema, maxTokens = 4000 }){
  const { client, Anthropic } = await getClient();
  const model = db.settings.model;
  const params = {
    model, max_tokens: maxTokens, system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
  };
  let res;
  try {
    // Haiku has no server-side refusal fallback; the others route a declined request to a fallback model.
    res = /haiku/.test(model)
      ? await client.messages.create(params)
      : await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (e){
    if (e instanceof Anthropic.AuthenticationError) throw new Error('That API key was rejected. Check it in Settings → AI.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('This API key isn’t allowed to use that model.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the API. Wait a moment and try again.');
    if (e instanceof Anthropic.BadRequestError) throw new Error('The API rejected the request: ' + (e.error?.error?.message || e.message));
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Couldn’t reach api.anthropic.com.');
    if (e instanceof Anthropic.APIError) throw new Error(`API error ${e.status ?? ''}: ${e.message}`);
    throw e;
  }
  if (res.stop_reason === 'refusal') throw new Error('Claude declined to process this chat.');
  if (res.stop_reason === 'max_tokens') throw new Error('Claude’s answer was cut off. Try again.');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try { return JSON.parse(text); } catch { throw new Error('Claude returned an unexpected answer. Try again.'); }
}
const ANALYZE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title','summary','tags','folder','keywords'],
  properties: {
    title: { type:'string', description:'Specific title, at most 8 words, no provider name' },
    summary: { type:'string', description:'1-2 sentences: what the person wanted and what came out of it' },
    tags: { type:'array', items:{ type:'string' }, description:'2-5 short lowercase topic tags' },
    folder: { type:'string', description:'Folder path like "Work/Marketing", or empty string' },
    keywords: { type:'array', items:{ type:'string' }, description:'6-15 lowercase search terms incl. synonyms and specific names' },
  },
};
async function analyzeChat({ url, title, provider, context, notes }){
  const folders = allFolders();
  const tags = [...new Set(db.chats.flatMap(c => c.tags || []))].slice(0, 80);
  const user = [
    'Here is one saved chat. Work out what it is about so the person can find it again later by searching.',
    '',
    `<chat provider="${P(provider).name}" url="${url}">`,
    `<page_title>${title || '(none)'}</page_title>`,
    notes ? `<my_notes>${notes}</my_notes>` : '',
    `<conversation_excerpt>\n${(context || '').slice(0, CTX_MAX) || '(no conversation text captured; rely on the title and URL)'}\n</conversation_excerpt>`,
    '</chat>',
    '',
    `Existing folders: ${folders.length ? folders.join(' | ') : '(none yet)'}`,
    `Existing tags: ${tags.length ? tags.join(', ') : '(none yet)'}`,
    '',
    'Rules: reuse an existing folder and existing tags when they fit; only propose a new folder when none fits, keeping it short (1-2 levels). Use an empty folder if the topic is unclear. Write the title and summary in the language of the conversation. "Me:" lines are the person, "AI:" lines are the assistant.',
  ].filter(l => l !== '').join('\n');
  const r = await askClaudeJSON({
    system: 'You organize a person’s library of saved AI chat links. You read a chat excerpt and return compact, specific metadata that makes it easy to find again.',
    user, schema: ANALYZE_SCHEMA,
  });
  return {
    title: String(r.title || '').trim().slice(0, 120),
    summary: String(r.summary || '').trim().slice(0, 400),
    tags: parseTags((r.tags || []).join(',')).slice(0, 6),
    folder: cleanFolder(r.folder),
    keywords: [...new Set((r.keywords || []).map(k => String(k).toLowerCase().trim()).filter(Boolean))].slice(0, 20),
  };
}
async function askClaudeSearch(){
  const q = ui.q.trim();
  if (!q || ui.aiBusy) return;
  ui.aiBusy = true; render();
  try {
    const pool = scoped().slice(0, 400);
    const lines = pool.map(c => [c.id, c.title, c.folder, (c.tags||[]).join(' '), c.summary || (c.keywords||[]).join(' ') || c.notes, (c.context||'').slice(0, 160).replace(/\s+/g,' ')].join(' | '));
    const r = await askClaudeJSON({
      system: 'You help a person find one of their saved AI chats. Match by meaning, not just exact words.',
      user: `What I'm looking for: "${q}"\n\nMy saved chats, one per line (id | title | folder | tags | summary or keywords | start of conversation):\n${lines.join('\n')}\n\nReturn the ids of the chats that match, best match first, at most 8. Return an empty list if nothing fits.`,
      schema: { type:'object', additionalProperties:false, required:['ids'], properties:{ ids:{ type:'array', items:{ type:'string' } } } },
      maxTokens: 2000,
    });
    const valid = new Set(pool.map(c => c.id));
    ui.aiIds = (r.ids || []).filter(id => valid.has(id));
    ui.sel = 0;
    if (!ui.aiIds.length) toast('Claude didn’t find a matching chat either');
  } catch (e){ toast(e.message); }
  ui.aiBusy = false; render();
}
async function bulkAnalyze(){
  const todo = db.chats.filter(c => !c.summary);
  if (!todo.length) return setStatus('Every chat already has a summary.');
  if (!confirm(`Ask Claude to analyze ${todo.length} chat(s)? This uses your API credits.`)) return;
  let done = 0;
  for (const c of todo){
    setStatus(html`<span class="spin" style="display:inline-block;vertical-align:-2px"></span> Analyzing ${done + 1} of ${todo.length}: ${c.title}`);
    try {
      const r = await analyzeChat(c);
      c.summary = r.summary; c.keywords = r.keywords;
      if (!c.tags.length) c.tags = r.tags;
      if (!c.folder && r.folder) c.folder = r.folder;
      if (genericTitle(c.title) || c.title === c.url) c.title = r.title;
      done++; save(); render();
    } catch (e){ setStatus(html`<span style="color:var(--danger)">${e.message}</span>`); return; }
  }
  setStatus(html`${icon('check')} Analyzed ${done} chat(s).`);
}
function setStatus(h){ setHTML($('#s-status'), h instanceof SafeHTML ? h : html`${h}`); }

/* ============================================================
   Context menu
   ============================================================ */
function showMenu(x, y, items){
  const m = $('#menu');
  setHTML(m, html`${items.map((it, i) => it === '-' ? html`<hr>` : html`<button data-i="${i}" class="${it.danger ? 'danger' : ''}">${icon(it.icon)}${it.label}</button>`)}`);
  m.classList.add('on');
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
  m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  m.onclick = e => { const b = e.target.closest('[data-i]'); if (b){ hideMenu(); items[+b.dataset.i].run(); } };
}
function hideMenu(){ $('#menu').classList.remove('on'); }
function chatMenu(c, x, y){
  const p = P(c.provider);
  const appUrl = appLink(c), canApp = !/^https?:/i.test(appUrl);
  const items = [
    { icon: c.openIn === 'app' && canApp ? 'app' : 'globe', label: 'Open', run: () => openChat(c) },
    c.openIn === 'app' ? { icon:'globe', label:'Open in Browser', run: () => openChat(c, 'web') }
      : canApp ? { icon:'app', label:`Open in ${p.name} App`, run: () => openChat(c, 'app') } : null,
    '-',
    { icon:'pencil', label:'Edit…', run: () => openEditor(c) },
    { icon: c.pinned ? 'starfill' : 'star', label: c.pinned ? 'Unpin' : 'Pin', run: () => { c.pinned = !c.pinned; save(); render(); } },
    { icon:'up', label:'Move to Top', run: () => moveToEdge(c, true) },
    { icon:'down', label:'Move to Bottom', run: () => moveToEdge(c, false) },
    { icon:'folder', label:'Move to Folder…', run: () => { const f = prompt('Move to folder (blank = Unfiled):', c.folder); if (f !== null){ c.folder = cleanFolder(f); save(); render(); } } },
    sessionKey ? { icon:'sparkles', label:'Analyze with Claude', run: () => analyzeOne(c) } : null,
    { icon:'copy', label:'Copy Link', run: () => copy(c.url) },
    { icon:'copy', label:'Copy as Markdown', run: () => navigator.clipboard?.writeText(chatToMarkdown(c)).then(() => toast('Markdown copied'), () => toast('Couldn’t copy')) },
    { icon:'download', label:'Save as Markdown', run: () => downloadBlob(new Blob([chatToMarkdown(c)], { type:'text/markdown' }), fileSafe(c.title) + '.md') },
    '-',
    { icon:'trash', label:'Delete', danger:true, run: () => removeChat(c) },
  ].filter(Boolean);
  showMenu(x, y, items);
}
async function analyzeOne(c){
  toast('Claude is reading “' + c.title + '”…');
  try {
    const r = await analyzeChat(c);
    c.summary = r.summary; c.keywords = r.keywords;
    if (!c.tags.length) c.tags = r.tags;
    if (!c.folder && r.folder) c.folder = r.folder;
    if (genericTitle(c.title)) c.title = r.title;
    save(); render(); toast('Updated with Claude’s summary');
  } catch (e){ toast(e.message); }
}
function removeChat(c){
  const idx = db.chats.indexOf(c);
  db.chats.splice(idx, 1); save(); render();
  toast(`Deleted “${c.title}”`, 'Undo', () => { db.chats.splice(idx, 0, c); save(); render(); });
}
function copy(text){ navigator.clipboard?.writeText(text).then(() => toast('Link copied'), () => prompt('Copy this link:', text)); }

/* ============================================================
   Combobox (type-ahead dropdown), used for providers
   ============================================================ */
const combo = { el: null, input: null, items: [], idx: 0, opts: null };
function attachCombo(input, opts){
  const show = () => {
    const q = input.value;
    const matches = searchProviders(input === $('#f-prov') && provPicked !== 'other' && q === P(provPicked).name ? '' : q);
    const extra = opts.extra ? opts.extra(q) : '';
    combo.items = matches.map(([k,p]) => ({ k, p }));
    if (extra) q.trim() ? combo.items.push({ create: extra }) : combo.items.unshift({ create: extra });   // a name guessed from an unknown link goes first
    combo.idx = 0; combo.input = input; combo.opts = opts;
    const el = $('#combo');
    const host = input.closest('dialog') || document.body;   // modal dialogs sit in the top layer, so the list must live inside them
    if (el.parentNode !== host) host.appendChild(el);
    if (!combo.items.length) setHTML(el, html`<div class="combo-empty">No match. Keep typing to add it.</div>`);
    else setHTML(el, html`${combo.items.map((it, i) => it.create
      ? html`<button type="button" data-i="${i}" class="${i === 0 ? 'on' : ''}">${icon('plus')}<span>Add “${it.create}”</span><small>new provider</small></button>`
      : html`<button type="button" data-i="${i}" class="${i === 0 ? 'on' : ''}"><span class="dot" style="background:${safeColor(it.p.color)}"></span><span>${it.p.name}</span><small>${it.p.hosts[0] || ''}</small></button>`)}`);
    const r = input.getBoundingClientRect();
    el.style.left = Math.min(r.left, innerWidth - 270) + 'px';
    el.style.top = (r.bottom + 6) + 'px';
    el.style.minWidth = Math.max(240, r.width) + 'px';
    el.classList.add('on');
  };
  const pick = i => {
    const it = combo.items[i]; hideCombo();
    if (it) opts.onPick(it.k, it.create);
  };
  input.addEventListener('focus', () => { if (input.id === 'f-prov') input.select(); show(); });
  input.addEventListener('input', show);
  input.addEventListener('keydown', e => {
    if (!$('#combo').classList.contains('on')) { if (e.key === 'ArrowDown'){ show(); e.preventDefault(); } return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      combo.idx = (combo.idx + (e.key === 'ArrowDown' ? 1 : -1) + combo.items.length) % Math.max(1, combo.items.length);
      $$('#combo button').forEach((b, i) => b.classList.toggle('on', i === combo.idx));
      $$('#combo button')[combo.idx]?.scrollIntoView({ block:'nearest' });
    } else if (e.key === 'Enter' || (e.key === 'Tab' && input.value.trim() && combo.items.length)){
      e.preventDefault(); e.stopPropagation(); pick(combo.idx);
    } else if (e.key === 'Escape'){
      e.preventDefault(); e.stopPropagation(); hideCombo(); opts.onCancel && opts.onCancel(); input.blur();
    }
  });
  input.addEventListener('blur', () => setTimeout(() => { if (combo.input === input && document.activeElement !== input){ hideCombo(); opts.onCancel && opts.onCancel(); } }, 150));
  $('#combo').addEventListener('mousedown', e => {
    if (combo.input !== input) return;
    const b = e.target.closest('[data-i]'); if (!b) return;
    e.preventDefault(); pick(+b.dataset.i);
  });
}
function hideCombo(){ $('#combo').classList.remove('on'); combo.input = null; }

/* ============================================================
   Toast
   ============================================================ */
function toast(msg, actionLabel, action, ms = 3200){
  $('#toastMsg').textContent = msg;
  const b = $('#toastBtn'); b.textContent = actionLabel || ''; b.onclick = () => { $('#toast').classList.remove('on'); action && action(); };
  $('#toast').classList.add('on');
  clearTimeout(toast.h); toast.h = setTimeout(() => $('#toast').classList.remove('on'), ms);
}

/* ============================================================
   Settings
   ============================================================ */
function bookmarkletHref(){
  const site = location.href.split('#')[0];
  const src = `(()=>{const S=${JSON.stringify(site)};const q=s=>[...document.querySelectorAll(s)];let p=[];`
    + `for(const s of ['[data-message-author-role]','user-query,model-response','[data-testid="user-message"],.font-claude-response,.font-claude-message']){`
    + `const n=q(s);if(n.length){p=n.map(e=>{const u=e.getAttribute('data-message-author-role')==='user'||/user/i.test(e.tagName+' '+(e.getAttribute('data-testid')||''));return(u?'Me: ':'AI: ')+e.innerText.trim()});break}}`
    + `let t=(p.length?p.join('\\n\\n'):(document.querySelector('main')||document.body).innerText).replace(/\\n{3,}/g,'\\n\\n');`
    + `if(t.length>${CTX_MAX})t=t.slice(0,${CTX_MAX - 1500})+'\\n…\\n'+t.slice(-1500);`
    + `const d=${JSON.stringify(CAPTURE_MARK)}+JSON.stringify({url:location.href,title:document.title,text:t});`
    + `const a=document.createElement('textarea');a.value=d;a.setAttribute('readonly','');a.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(a);a.select();`
    + `let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();`
    + `if(!ok){alert('Agent Mash could not copy this chat. Add it by hand instead.');return}`
    + `window.open(S+'#capture','_blank')})()`;
  return 'javascript:' + encodeURIComponent(src);
}
function renderAppStatus(){
  const rows = [
    ['ok', 'Claude desktop app: works', html`The app registers <code>claude://</code>, and its link handler opens <code>claude://claude.ai/chat/&lt;id&gt;</code> straight to that conversation (project links work too). Your browser may ask “Open Claude?” the first time. Tick “Always allow”.`],
    ['no', 'ChatGPT desktop app: opens the website', html`The current ChatGPT Mac app only accepts <code>codex://</code> links for its own threads and shared links. It has no link that opens a regular chat, so these open in your browser. The iPhone and Android apps open chatgpt.com links directly.`],
    ['no', 'Gemini: opens the website', 'Google has no Gemini Mac app. On a phone, gemini.google.com links open the Gemini app.'],
  ];
  setHTML($('#appStatus'), statusRows(rows));
}
function statusRows(rows){
  return html`${rows.map(([s, t, d]) => html`<div class="status-row"><span class="${s === 'ok' ? 'ok' : 'no'}">${icon(s === 'ok' ? 'check' : 'warn')}</span><div><b>${t}</b><span>${d}</span></div></div>`)}`;
}
function storageBytes(){ try { return (localStorage.getItem(KEY) || '').length * 2; } catch { return 0; } }
function fmtBytes(n){ return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }
function renderPrivacyBadge(){
  const ai = !!sessionKey;
  $('#privacyBadge').classList.toggle('ai', ai);
  $('#privacyText').textContent = ai ? 'Local · Claude AI on' : 'Stays in this browser';
  $('#privacyBadge').title = ai ? 'Your library is local. Chat text is sent to Anthropic only when you analyze or Ask Claude.' : 'Your library is stored only in this browser. Nothing is uploaded.';
}
function renderPrivacyFacts(){
  const ai = !!sessionKey;
  const rows = [
    ['ok', 'No account, no server, no tracking', 'There is no sign-up, no database and no analytics. Nobody else can see your library.'],
    ['ok', `${db.chats.length} chat${db.chats.length === 1 ? '' : 's'} stored on this device`, `Using ${fmtBytes(storageBytes())} of this browser's local storage.`],
    ai ? ['no', 'Claude AI is on', 'Chat text is sent to Anthropic only when you analyze a chat or use Ask Claude. Remove the key in the AI tab to turn it off.']
       : ['ok', 'Claude AI is off', 'Nothing about your chats is sent anywhere.'],
  ];
  setHTML($('#privacyFacts'), statusRows(rows));
}
function openSettings(tab){
  renderPrivacyFacts(); renderBackupState(); renderPersist();
  $('#s-remind').checked = db.settings.remind;
  $('#bookmarklet').href = bookmarkletHref();
  renderAppStatus();
  $('#s-key').value = sessionKey; $('#s-model').value = db.settings.model;
  setStatus(sessionKey ? html`${icon('check')} Claude is on.` : 'Claude is off. Search and suggestions still work without it.');
  $$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === db.settings.theme));
  if (tab) selectTab(tab);
  closeSide();
  if (!$('#setDlg').open) $('#setDlg').showModal();
}
function selectTab(t){
  $$('#setTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $$('.tabpane').forEach(p => p.classList.toggle('on', p.dataset.pane === t));
}
function applyTheme(){
  const t = db.settings.theme;
  document.querySelector('meta[name=theme-color]').content = (t === 'light' || (t === 'auto' && !matchMedia('(prefers-color-scheme: dark)').matches)) ? '#e3e3e6' : '#08080a';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
}

/* ============================================================
   Events
   ============================================================ */
setHTML($('#addFolder'), icon('folderplus'));
$('#nav-lib').onclick = e => { const a = e.target.closest('[data-view]'); if (a){ ui.view = a.dataset.view; resetSel(); } };
$('#nav-tags').onclick = e => { const a = e.target.closest('[data-tag]'); if (a){ ui.view = 'tag'; ui.tag = a.dataset.tag; resetSel(); } };
$('#nav-folders').onclick = e => {
  const del = e.target.closest('[data-delfolder]');
  if (del){
    e.stopPropagation();
    const f = del.dataset.delfolder, n = db.chats.filter(c => inFolder(c, f)).length;
    if (n && !confirm(`Remove the folder “${f}”? Its ${n} chat(s) stay saved and move to Unfiled.`)) return;
    db.chats.forEach(c => { if (inFolder(c, f)) c.folder = ''; });
    db.folders = db.folders.filter(x => x !== f && !x.startsWith(f + '/'));
    if (ui.view === 'folder' && (ui.folder === f || ui.folder.startsWith(f + '/'))) ui.view = 'all';
    save(); render(); return;
  }
  const a = e.target.closest('[data-folder]'); if (a){ ui.view = 'folder'; ui.folder = a.dataset.folder; resetSel(); }
};
function resetSel(){ ui.sel = 0; ui.aiIds = null; closeSide(); render(); $('#content').scrollTop = 0; }
$('#addFolder').onclick = () => {
  const n = prompt('New folder name (use / for a sub-folder, like Work/Startup):', ui.view === 'folder' ? ui.folder + '/' : '');
  const f = cleanFolder(n);
  if (f){ if (!db.folders.includes(f)) db.folders.push(f); ui.view = 'folder'; ui.folder = f; save(); render(); }
};
$('#provSeg').onclick = e => { const b = e.target.closest('[data-prov]'); if (b){ ui.provider = b.dataset.prov || null; ui.sel = 0; ui.aiIds = null; render(); } };
$('#toggleSide').onclick = () => {
  if (matchMedia('(max-width: 780px)').matches) $('#side').classList.toggle('open');
  else $('#app').classList.toggle('collapsed');
};
function closeSide(){ $('#side').classList.remove('open'); }
$('#openSettings').onclick = () => openSettings();
$('#addBtn').onclick = () => openEditor();
$('#openAll').onclick = openAll;
$('#sortBtn').onclick = e => {
  e.stopPropagation();
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.left, r.bottom + 6, Object.entries(SORTS).map(([k, label]) => ({
    icon: db.settings.sort === k ? 'check' : 'none', label: label + (k === 'manual' ? ' (drag to arrange)' : ''),
    run: () => { db.settings.sort = k; save(); render(); },
  })));
};

$('#grid').onclick = e => {
  if (drag.justDragged) return;
  if (e.target.closest('[data-open-settings]')){ e.preventDefault(); openSettings('capture'); return; }
  if (e.target.closest('[data-ai-ask]')) return askClaudeSearch();
  if (e.target.closest('[data-ai-clear]')){ ui.aiIds = null; render(); return; }
  const cardEl = e.target.closest('.card'); if (!cardEl) return;
  const c = db.chats.find(x => x.id === cardEl.dataset.id); if (!c) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'pin'){ c.pinned = !c.pinned; save(); render(); }
  else if (act === 'edit') openEditor(c);
  else openChat(c);
};
$('#grid').oncontextmenu = e => {
  const cardEl = e.target.closest('.card'); if (!cardEl) return;
  e.preventDefault();
  const c = db.chats.find(x => x.id === cardEl.dataset.id);
  const { list } = visible(); ui.sel = list.indexOf(c); render();
  chatMenu(c, e.clientX, e.clientY);
};
document.addEventListener('click', e => { if (!e.target.closest('#menu')) hideMenu(); });
window.addEventListener('resize', hideCombo);
document.addEventListener('scroll', hideMenu, true);
window.addEventListener('blur', hideMenu);

/* ============================================================
   Drag & drop (pointer based: works with mouse, trackpad and touch)
   - drag a card between other cards to set your own order
   - drag a card onto a folder, Pinned or Unfiled in the sidebar
   ============================================================ */
const drag = { pending:null, active:null, justDragged:false };
const gridCols = () => Math.max(1, getComputedStyle($('#grid')).gridTemplateColumns.split(' ').length);
$('#grid').addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.target.closest('button, a, input')) return;
  const el = e.target.closest('.card'); if (!el) return;
  drag.pending = { id: el.dataset.id, el, x: e.clientX, y: e.clientY, type: e.pointerType };
  if (e.pointerType !== 'mouse') drag.pending.timer = setTimeout(() => drag.pending && startDrag(drag.pending.x, drag.pending.y), 320);   // long-press on touch
});
window.addEventListener('pointermove', e => {
  const p = drag.pending;
  if (p && !drag.active){
    const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    if (p.type === 'mouse' && dist > 5) startDrag(e.clientX, e.clientY);
    else if (p.type !== 'mouse' && dist > 10){ clearTimeout(p.timer); drag.pending = null; }   // that was a scroll
  }
  if (drag.active){ e.preventDefault(); moveDrag(e.clientX, e.clientY); }
}, { passive:false });
document.addEventListener('touchmove', e => { if (drag.active) e.preventDefault(); }, { passive:false });
window.addEventListener('pointerup', e => { clearTimeout(drag.pending?.timer); drag.pending = null; if (drag.active) endDrag(); });
window.addEventListener('pointercancel', () => { clearTimeout(drag.pending?.timer); drag.pending = null; if (drag.active) endDrag(true); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && drag.active){ e.stopPropagation(); endDrag(true); } }, true);

function startDrag(x, y){
  const p = drag.pending; drag.pending = null;
  const r = p.el.getBoundingClientRect();
  const ghost = p.el.cloneNode(true);
  ghost.classList.add('drag-ghost'); ghost.classList.remove('sel');
  ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
  document.body.appendChild(ghost);
  p.el.classList.add('placeholder');
  drag.active = { id: p.id, el: p.el, ghost, dx: x - r.left, dy: y - r.top, x, y, reorder: canReorder(), moved: false, startIds: $$('#grid .card').map(n => n.dataset.id) };
  document.body.classList.add('is-dragging');
  hideMenu(); navigator.vibrate?.(8);
  moveDrag(x, y);
  autoScroll();
}
function moveDrag(x, y){
  const d = drag.active; d.x = x; d.y = y;
  d.ghost.style.transform = `translate(${x - d.dx}px, ${y - d.dy}px) rotate(1.2deg) scale(1.02)`;
  const under = document.elementFromPoint(x, y);
  const target = under?.closest('[data-drop]');
  $$('.nav-item.drop').forEach(n => n !== target && n.classList.remove('drop'));
  d.target = target || null;
  if (target){ target.classList.add('drop'); return; }
  if (!d.reorder) return;
  const over = under?.closest('#grid .card');
  if (!over || over === d.el) return;
  const r = over.getBoundingClientRect();
  const after = gridCols() > 1 ? x > r.left + r.width / 2 : y > r.top + r.height / 2;
  if (after ? over.nextElementSibling === d.el : over.previousElementSibling === d.el) return;
  // FLIP: measure, move the placeholder, then animate every card from its old spot
  const cards = $$('#grid .card');
  const before = new Map(cards.map(c => [c, c.getBoundingClientRect()]));
  over.parentNode.insertBefore(d.el, after ? over.nextSibling : over);
  d.moved = true;
  for (const c of cards){
    const a = before.get(c), b = c.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) continue;
    c.style.transition = 'none'; c.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => { c.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1)'; c.style.transform = ''; });
  }
}
function autoScroll(){
  const d = drag.active; if (!d) return;
  const box = $('#content'), r = box.getBoundingClientRect(), edge = 56;
  const v = d.y < r.top + edge ? -Math.ceil((r.top + edge - d.y) / 4) : d.y > r.bottom - edge ? Math.ceil((d.y - r.bottom + edge) / 4) : 0;
  if (v){ box.scrollTop += v; moveDrag(d.x, d.y); }
  requestAnimationFrame(autoScroll);
}
function endDrag(cancel){
  const d = drag.active; drag.active = null;
  document.body.classList.remove('is-dragging');
  $$('.nav-item.drop').forEach(n => n.classList.remove('drop'));
  d.ghost.remove(); d.el.classList.remove('placeholder');
  drag.justDragged = true; setTimeout(() => drag.justDragged = false, 60);
  const c = db.chats.find(x => x.id === d.id); if (!c) return;
  if (cancel){ render(); return; }
  if (d.target){
    const kind = d.target.dataset.drop;
    if (kind === 'folder'){ c.folder = d.target.dataset.folder; toast(`Moved “${c.title}” to ${c.folder}`); }
    else if (kind === 'unfiled'){ c.folder = ''; toast('Moved to Unfiled'); }
    else if (kind === 'pinned'){ c.pinned = true; toast('Pinned'); }
    else if (kind === 'all'){ /* dropping on All Chats does nothing */ }
    save(); render(); return;
  }
  if (d.reorder && d.moved){
    const ids = $$('#grid .card').map(n => n.dataset.id);
    if (ids.join() !== d.startIds.join()){
      const prev = new Map(db.chats.map(x => [x.id, x.order]));
      applyVisibleOrder(ids);
      ui.sel = ids.indexOf(d.id);
      render();
      toast('Order saved', 'Undo', () => { db.chats.forEach(x => x.order = prev.get(x.id)); save(); render(); });
      return;
    }
  }
  if (!d.reorder){
    const msg = whyNoReorder();
    if (db.settings.sort !== 'manual' && !ui.q.trim() && ui.view !== 'recent')
      toast(msg, 'Use my order', () => { db.settings.sort = 'manual'; save(); render(); }, 5000);
    else if (msg) toast(msg);
  }
  render();
}
/* keyboard: ⌥ + arrows moves the selected chat */
function nudge(delta){
  const { list } = visible(); const c = list[ui.sel]; if (!c) return;
  if (!canReorder()) return toast(whyNoReorder());
  const to = Math.max(0, Math.min(list.length - 1, ui.sel + delta)); if (to === ui.sel) return;
  const ids = list.map(x => x.id); ids.splice(ui.sel, 1); ids.splice(to, 0, c.id);
  applyVisibleOrder(ids); ui.sel = to; render(); $('.card.sel')?.scrollIntoView({ block:'nearest' });
}

/* drop a link from another tab onto the window */
let dragDepth = 0;
const isExternalLinkDrag = e => !e.dataTransfer.types.includes('application/x-agentmash') && ['text/uri-list','text/plain','Files'].some(t => e.dataTransfer.types.includes(t));
window.addEventListener('dragenter', e => { if (isExternalLinkDrag(e)){ dragDepth++; $('#dropText').textContent = e.dataTransfer.types.includes('Files') ? 'Drop to restore this backup' : 'Drop to add this chat'; $('#dropOv').classList.add('on'); } });
window.addEventListener('dragleave', e => { if (isExternalLinkDrag(e) && --dragDepth <= 0){ dragDepth = 0; $('#dropOv').classList.remove('on'); } });
window.addEventListener('dragover', e => { if (isExternalLinkDrag(e)) e.preventDefault(); });
window.addEventListener('drop', e => {
  if (!isExternalLinkDrag(e)) return;
  e.preventDefault(); dragDepth = 0; $('#dropOv').classList.remove('on');
  const file = e.dataTransfer.files?.[0];
  if (file){ if (/\.json$/i.test(file.name) || file.type === 'application/json') importBackup(file); else toast('Drop an Agent Mash backup (.json) or a chat link'); return; }
  const raw = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').split('\n').find(l => /^https?:\/\//i.test(l.trim()));
  if (!raw) return toast('Drop a link to a chat');
  const url = safeChatUrl(raw);
  if (!url) return toast('Only https:// chat links can be added');
  const existing = db.chats.find(c => normUrl(c.url) === normUrl(url));
  openEditor(existing || null, existing ? null : { url, provider: detect(url) });
});

/* search */
$('#q').addEventListener('input', e => { ui.q = e.target.value; ui.sel = 0; ui.aiIds = null; render(); });

/* keyboard */
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') hideMenu();
  const inSearch = document.activeElement === $('#q');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); $('#q').focus(); $('#q').select(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !inSearch) return;
  const { list } = visible();
  const cur = list[ui.sel];
  if (!inSearch && !e.metaKey && !e.ctrlKey && !e.altKey){
    if (e.key === '/'){ e.preventDefault(); $('#q').focus(); $('#q').select(); return; }
    if (e.key === 'n'){ e.preventDefault(); openEditor(); return; }
    if (e.key === 'e' && cur){ e.preventDefault(); openEditor(cur); return; }
    if (e.key === 'p' && cur){ cur.pinned = !cur.pinned; save(); render(); return; }
    if ((e.key === 'Backspace' || e.key === 'Delete') && cur){ e.preventDefault(); removeChat(cur); return; }
  }
  if (e.key === 'Escape' && inSearch){ $('#q').value = ''; ui.q = ''; ui.aiIds = null; $('#q').blur(); render(); return; }
  if (e.key === 'Enter' && e.shiftKey && inSearch && sessionKey){ e.preventDefault(); askClaudeSearch(); return; }
  const cols = gridCols();
  if (e.altKey && !inSearch && /^Arrow/.test(e.key)){ e.preventDefault(); nudge({ ArrowUp:-cols, ArrowDown:cols, ArrowLeft:-1, ArrowRight:1 }[e.key]); return; }
  const move = { ArrowDown: cols, ArrowUp: -cols, ArrowRight: inSearch ? 0 : 1, ArrowLeft: inSearch ? 0 : -1 }[e.key];
  if (move){ e.preventDefault(); ui.sel = Math.max(0, Math.min(list.length - 1, ui.sel + move)); render(); $('.card.sel')?.scrollIntoView({ block:'nearest' }); return; }
  if (e.key === 'Enter' && cur){ e.preventDefault(); openChat(cur); }
});

/* editor events */
F.url.addEventListener('input', () => {
  const p = detect(F.url.value.trim());
  // for a new chat, follow the provider's default until the person picks web/app themselves
  if (!editing && !openTouched) openIn = p === 'claude' && !IS_MOBILE ? 'app' : 'web';
  if (p !== 'other' || !editing) setProv(p); else setOpen(openIn);
});
F.context.addEventListener('input', () => { updateCtxLabel(); if (sessionKey) setAiBar(); });
attachCombo($('#f-prov'), {
  extra: q => { const g = q.trim() || (provPicked === 'other' ? guessName(F.url.value) : ''); return g && !Object.values(PROVIDERS).some(p => p.name.toLowerCase() === g.toLowerCase()) ? g : ''; },
  onPick: (k, created) => { if (created) k = addCustomProvider(created, F.url.value); if (k){ setProv(k); if (!editing && !openTouched) setOpen(k === 'claude' && !IS_MOBILE ? 'app' : 'web'); } },
  onCancel: () => setProv(provPicked),
});
attachCombo($('#provAdd'), {
  extra: q => q.trim() && !Object.values(PROVIDERS).some(p => p.name.toLowerCase() === q.trim().toLowerCase()) ? q.trim() : '',
  onPick: (k, created) => {
    if (created) k = addCustomProvider(created, '');
    if (!k) return;
    if (!db.bar.includes(k)) db.bar.push(k);
    ui.provider = k; ui.sel = 0; ui.aiIds = null; save(); render();
    $('#provAdd').value = ''; $('#provAdd').blur();
  },
  onCancel: () => { $('#provAdd').value = ''; },
});
$('#provSeg').oncontextmenu = e => {
  const b = e.target.closest('[data-prov]'); if (!b || !b.dataset.prov) return;
  e.preventDefault();
  const k = b.dataset.prov, p = P(k);
  showMenu(e.clientX, e.clientY, [
    { icon:'search', label:`Show only ${p.name}`, run: () => { ui.provider = k; render(); } },
    { icon:'trash', label:'Remove from bar', run: () => { db.bar = db.bar.filter(x => x !== k); if (ui.provider === k) ui.provider = null; save(); render(); } },
  ]);
};
$('#openPick').onclick = e => { const b = e.target.closest('[data-v]'); if (b){ openTouched = true; setOpen(b.dataset.v); } };
$('#aiRun').onclick = () => { if ($('#aiRun').dataset.mode === 'setup'){ $('#editDlg').close(); openSettings('ai'); } else aiFill(); };
$('#editForm').addEventListener('submit', e => { if (e.submitter?.value === 'ok' && saveEditor() === false) e.preventDefault(); });
F.url.addEventListener('input', () => F.url.setCustomValidity(''));
$('#cancelEdit').onclick = () => $('#editDlg').close();
$('#delBtn').onclick = () => { if (editing){ const c = editing; $('#editDlg').close(); removeChat(c); } };

/* settings events */
$('#setTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) selectTab(b.dataset.tab); };
$('#bookmarklet').onclick = e => { e.preventDefault(); toast('Drag this button onto your bookmarks bar'); };
$('#s-key').addEventListener('change', e => { sessionKey = e.target.value.trim(); clientCache = null; render(); setStatus(sessionKey ? 'Key held in memory for this session. Click Test to check it.' : 'Claude is off.'); });
$('#s-model').onchange = e => { db.settings.model = e.target.value; save(); };
$('#s-test').onclick = async () => {
  sessionKey = $('#s-key').value.trim(); clientCache = null; render();
  setStatus(html`<span class="spin" style="display:inline-block;vertical-align:-2px"></span> Checking…`);
  try {
    const r = await askClaudeJSON({ system:'Reply with JSON only.', user:'Return {"ok": true}.', schema:{ type:'object', additionalProperties:false, required:['ok'], properties:{ ok:{ type:'boolean' } } }, maxTokens: 1000 });
    setStatus(r.ok ? html`${icon('check')} Connected. Claude is ready.` : 'Connected, but got an unexpected reply.');
  } catch (e){ setStatus(html`<span style="color:var(--danger)">${e.message}</span>`); }
};
$('#s-bulk').onclick = bulkAnalyze;
$('#themeSeg').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; db.settings.theme = b.dataset.v; save(); applyTheme(); $$('#themeSeg button').forEach(x => x.classList.toggle('on', x === b)); };
$('#closeSet').onclick = () => { $('#setDlg').close(); render(); };
$('#privacyBadge').onclick = () => openSettings('privacy');
$('#toBackup').onclick = e => { e.preventDefault(); selectTab('backup'); };
$('#eraseAll').onclick = () => {
  const n = db.chats.length;
  if (!confirm(`Erase all ${n} saved chat(s), folders, providers and settings from this browser?\n\nThis can't be undone. Export a backup first if you might want them back.`)) return;
  try { localStorage.removeItem(KEY); } catch {}
  db = normalize(); db.settings.welcomed = true; save();
  $('#setDlg').close(); render(); toast('Everything was erased from this browser');
};
$('#welcomeStart').onclick = () => { db.settings.welcomed = true; save(); $('#welcomeDlg').close(); };
$('#welcomeCapture').onclick = () => { db.settings.welcomed = true; save(); $('#welcomeDlg').close(); openSettings('capture'); };
$('#welcomeDlg').addEventListener('cancel', () => { db.settings.welcomed = true; save(); });
/* ============================================================
   Markdown / Obsidian export
   ============================================================ */
const isoDay = t => { if (!t) return ''; const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };   // local date
const yamlStr = v => JSON.stringify(String(v ?? ''));          // JSON strings are valid YAML double-quoted scalars
const tagSafe = t => String(t).trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_\/-]/gu, '');
const fileSafe = t => (String(t || 'Untitled').replace(/[\\/:*?"<>|#^\[\]]+/g, '-').replace(/\s+/g, ' ').replace(/^[\s.-]+|[\s.-]+$/g, '').slice(0, 80)) || 'Untitled';
function quoteBlock(text){ return String(text).trim().split('\n').map(l => '> ' + l).join('\n'); }
function chatToMarkdown(c, { frontmatter = true, level = 1 } = {}){
  const p = P(c.provider), h = '#'.repeat(level);
  const out = [];
  if (frontmatter){
    out.push('---',
      `title: ${yamlStr(c.title)}`,
      `provider: ${yamlStr(p.name)}`,
      `url: ${yamlStr(c.url)}`,
      c.folder ? `folder: ${yamlStr(c.folder)}` : null,
      (c.tags || []).length ? 'tags:\n' + c.tags.map(t => '  - ' + tagSafe(t)).join('\n') : null,
      `created: ${isoDay(c.created)}`,
      c.lastOpened ? `last_opened: ${isoDay(c.lastOpened)}` : null,
      c.pinned ? 'pinned: true' : null,
      'source: agent-mash',
      '---', '');
  }
  out.push(`${h} ${c.title}`, '', `**${p.name}** · [Open chat](<${String(c.url).replace(/[<>\s]/g, encodeURIComponent)}>)${c.folder ? ' · ' + c.folder : ''}${!frontmatter && (c.tags || []).length ? ' · ' + c.tags.map(t => '#' + tagSafe(t)).join(' ') : ''}`, '');
  if (c.summary) out.push(`${h}# Summary`, '', c.summary, '');
  if (c.notes) out.push(`${h}# My notes`, '', c.notes, '');
  if (c.context) out.push(`${h}# Conversation excerpt`, '', quoteBlock(c.context), '');
  return out.filter(l => l !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function libraryOrder(){ return [...db.chats].sort((a,b) => (a.folder || '\uffff').localeCompare(b.folder || '\uffff') || a.order - b.order); }
function exportSingleMarkdown(){
  if (!db.chats.length) return toast('Your library is empty');
  const lines = [`# Agent Mash library`, '', `Exported ${new Date().toLocaleString()} · ${db.chats.length} chats`, ''];
  let folder = null;
  for (const c of libraryOrder()){
    const f = c.folder || 'Unfiled';
    if (f !== folder){ folder = f; lines.push(`## ${f}`, ''); }
    lines.push(chatToMarkdown(c, { frontmatter:false, level:3 }), '---', '');
  }
  downloadBlob(new Blob([lines.join('\n')], { type:'text/markdown' }), `agent-mash-${isoDay(Date.now())}.md`);
  toast(`Exported ${db.chats.length} chat(s) as Markdown. The file isn’t encrypted, so keep it private.`, '', null, 5000);
}
function exportVault(){
  if (!db.chats.length) return toast('Your library is empty');
  const root = 'Agent Mash', used = new Set(), files = [], index = new Map();
  for (const c of libraryOrder()){
    const dir = c.folder ? c.folder.split('/').map(fileSafe).join('/') : '';
    let base = fileSafe(c.title), path = `${root}/${dir ? dir + '/' : ''}${base}.md`, n = 2;
    while (used.has(path.toLowerCase())) path = `${root}/${dir ? dir + '/' : ''}${base} ${n++}.md`;
    used.add(path.toLowerCase());
    files.push({ name: path, text: chatToMarkdown(c) });
    const key = c.folder || 'Unfiled';
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(`- [[${path.slice(root.length + 1, -3)}|${c.title.replace(/[|\]]/g, '-')}]] · ${P(c.provider).name}${c.summary ? ': ' + c.summary.split('\n')[0] : ''}`);
  }
  const idx = ['---', 'source: agent-mash', `exported: ${isoDay(Date.now())}`, '---', '', '# Agent Mash index', '',
    `${db.chats.length} saved AI chats. Each note links back to the original conversation.`, ''];
  for (const [f, items] of index) idx.push(`## ${f}`, '', ...items, '');
  files.unshift({ name: `${root}/Agent Mash index.md`, text: idx.join('\n') });
  downloadBlob(zipFiles(files), `agent-mash-vault-${isoDay(Date.now())}.zip`);
  toast(`Exported ${db.chats.length} note(s). Unzip into your Obsidian vault. The files aren’t encrypted.`, '', null, 5000);
}
function downloadBlob(blob, name){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
/* minimal ZIP writer (stored, no compression) so the export needs no library or network */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b){ let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipFiles(files){
  const enc = new TextEncoder(), parts = [], central = [];
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  let offset = 0;
  for (const f of files){
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    [[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[8,0,2],[10,time,2],[12,date,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,name.length,2],[28,0,2]]
      .forEach(([o, v, sz]) => sz === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true));
    const ch = new DataView(new ArrayBuffer(46));
    [[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[10,0,2],[12,time,2],[14,date,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[30,0,2],[32,0,2],[34,0,2],[36,0,2],[38,0,4],[42,offset,4]]
      .forEach(([o, v, sz]) => sz === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true));
    parts.push(lh, name, data); central.push(ch, name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((a, x) => a + x.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type:'application/zip' });
}
$('#mdVault').onclick = exportVault;
$('#mdSingle').onclick = exportSingleMarkdown;

/* ============================================================
   Backup
   ============================================================ */
/* Fingerprint of the full library content (everything except "last opened" times),
   using two independent 32-bit hashes, cached until the library changes. */
let sigCache = { rev: -1, sig: '' };
function chatSig(){
  if (sigCache.rev === libRev) return sigCache.sig;
  const str = JSON.stringify([db.chats.map(({ lastOpened, ...rest }) => rest), db.folders, db.customProviders, db.bar]);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++){
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const sig = 'v2-' + str.length + '-' + (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
  sigCache = { rev: libRev, sig };
  return sig;
}
function backupState(){
  const st = db.settings, n = db.chats.length;
  const changed = n > 0 && st.backupSig !== chatSig();
  const days = st.lastBackup ? (Date.now() - st.lastBackup) / 864e5 : Infinity;
  const when = !st.lastBackup ? 'Never' : days < 1 ? 'Today' : days < 2 ? 'Yesterday' : days < 30 ? Math.floor(days) + 'd ago' : new Date(st.lastBackup).toLocaleDateString();
  return { changed, days, when, stale: changed && (days > 7 || !st.lastBackup) && n >= 1 };
}
function renderBackupState(){
  const b = backupState();
  $('#backupItem').classList.toggle('stale', b.stale);
  $('#backupState').textContent = !db.chats.length ? '' : b.changed ? (db.settings.lastBackup ? 'Changed' : 'Never') : b.when;
  $('#backupItem').title = b.changed ? `You have changes since your last backup (${b.when.toLowerCase()}). Click to download one.` : `Backed up ${b.when.toLowerCase()}. Click to download a fresh copy.`;
  const card = $('#backupCard'); if (!card) return;
  card.classList.toggle('stale', b.stale);
  setHTML(card, html`${icon(b.changed ? 'warn' : 'check')}<div><b>${!db.settings.lastBackup ? 'No backup yet' : 'Last backup: ' + b.when}</b>
    <span>${db.chats.length} chat${db.chats.length === 1 ? '' : 's'} in your library · ${b.changed ? 'some changes are not in a backup yet' : 'everything is backed up'}</span></div>`);
}
function exportBackup(){
  const out = { app:'agent-mash', version:1, exported:new Date().toISOString(), ...db, settings: { ...db.settings } };   // the key is not in db at all
  const blob = new Blob([JSON.stringify(out, null, 2)], { type:'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `agent-mash-backup-${isoDay(Date.now())}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  db.settings.lastBackup = Date.now(); db.settings.backupSig = chatSig(); save(); render(); renderBackupState();
  toast(`Backup downloaded: ${db.chats.length} chat(s). It isn’t encrypted, so keep the file private.`, '', null, 5000);
}
/* A backup file is untrusted input: size-checked, fully validated, then merged in one step. */
async function importBackup(file){
  if (file.size > LIMITS.fileBytes) return toast('That file is too large to be an Agent Mash backup (20 MB max)');
  let raw;
  try { raw = JSON.parse(await file.text()); } catch { return toast('That file isn’t valid JSON, so nothing was imported'); }
  let d;
  try { d = sanitizeLibrary(raw, { strict:true }); }
  catch (e){ return toast(`Backup rejected, nothing was imported: ${e instanceof SchemaError ? e.message : 'unreadable file'}`, '', null, 7000); }

  const prev = JSON.stringify(db);
  const next = JSON.parse(prev);
  const known = new Set(next.chats.map(c => normUrl(c.url)));
  const top = Math.max(0, ...next.chats.map(c => c.order));
  const fresh = [];
  for (const c of d.chats){
    const key = normUrl(c.url);
    if (known.has(key)) continue;
    known.add(key);
    fresh.push({ ...c, id: uid(), order: top + 1 + fresh.length });
  }
  if (next.chats.length + fresh.length > LIMITS.chats) return toast(`Restoring would exceed ${LIMITS.chats} chats, so nothing was imported`);
  next.chats.push(...fresh);
  next.folders = [...new Set([...next.folders, ...d.folders])];
  const newProviders = Object.entries(d.customProviders).filter(([k]) => !next.customProviders[k]);
  for (const [k, p] of newProviders) next.customProviders[k] = p;

  db = next;
  if (!save()){ db = JSON.parse(prev); return toast('Couldn’t save the restored chats (storage full?), so nothing was changed'); }
  for (const [k, p] of newProviders) registerProvider(k, { ...p, custom:true });
  render(); renderBackupState();
  toast(fresh.length ? `Restored ${fresh.length} chat(s) from the backup` : 'You already have every chat in that backup');
}
async function renderPersist(){
  const el = $('#persistInfo'); if (!el) return;
  if (!navigator.storage?.persisted){ el.textContent = 'This browser doesn’t report whether storage is protected. Keep regular backups.'; return; }
  const ok = await navigator.storage.persisted();
  setHTML(el, ok ? html`${icon('check')} This browser has agreed not to clear your library to free up space.`
    : html`This browser may clear site data when space runs low. <button class="pill" id="persistBtn" style="margin-left:6px">Ask to keep it</button>`);
  $('#persistBtn')?.addEventListener('click', async () => { await navigator.storage.persist?.(); renderPersist(); });
}
$('#exportBtn').onclick = exportBackup;
$('#backupItem').onclick = exportBackup;
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').onchange = async e => { const f = e.target.files[0]; if (f) await importBackup(f); e.target.value = ''; };
$('#s-remind').onchange = e => { db.settings.remind = e.target.checked; save(); };
function maybeRemindBackup(){
  const b = backupState();
  if (db.settings.remind && b.stale && db.chats.length >= 3 && db.settings.welcomed)
    setTimeout(() => toast(db.settings.lastBackup ? `Your last backup was ${b.when.toLowerCase()}, and your library has changed since` : 'Your library has never been backed up', 'Back up now', exportBackup, 9000), 1200);
}

/* other tabs/windows of this app stay in sync */
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  db = load(); lastSynced = e.newValue; libRev++;
  Object.entries(db.customProviders).forEach(([k, p]) => { if (!PROVIDERS[k]) registerProvider(k, { ...p, custom:true }); });
  if (editing && $('#editDlg').open){
    const fresh = db.chats.find(c => c.id === editing.id);
    if (fresh) editing = fresh;
    else toast('This chat was deleted in another window. Saving will add it back.');
  }
  render();
});

/* ============================================================
   Capture: #add=URL&title=TITLE&ctx=TEXT (from the bookmark button)
   ============================================================ */
/* ============================================================
   Capture. The Save button copies a marked JSON payload to the clipboard and
   opens #capture. Nothing from the conversation is ever placed in a URL.
   The payload only enters the app through a paste the person makes.
   ============================================================ */
const CAPTURE_MAX = 64 * 1024;
function parseCapture(text){
  if (typeof text !== 'string' || !text.startsWith(CAPTURE_MARK) || text.length > CAPTURE_MAX) return null;
  let d; try { d = JSON.parse(text.slice(CAPTURE_MARK.length)); } catch { return null; }
  if (!isPlainObject(d) || Object.keys(d).some(k => !['url','title','text'].includes(k))) return null;
  const url = safeChatUrl(d.url);
  if (!url || typeof d.title !== 'string' || typeof d.text !== 'string') return null;
  return { url, title: d.title.slice(0, LIMITS.title), context: d.text.slice(0, CTX_MAX) };
}
function acceptCapture(cap){
  if ($('#captureDlg').open) $('#captureDlg').close();
  navigator.clipboard?.writeText('').catch(() => {});   // don't leave the conversation sitting in the clipboard
  const existing = db.chats.find(c => normUrl(c.url) === normUrl(cap.url));
  if (existing){
    if (cap.context && cap.context.length > (existing.context || '').length) existing.context = cap.context;
    openEditor(existing);
    toast('You already saved this chat. It’s open for editing.');
    return;
  }
  openEditor(null, { url: cap.url, provider: detect(cap.url), title: cleanTitle(cap.title), context: cap.context });
  localSuggest(false);
}
document.addEventListener('paste', e => {
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!text.startsWith(CAPTURE_MARK)) return;     // ordinary pastes are untouched
  e.preventDefault(); e.stopPropagation();
  const cap = parseCapture(text);
  if (!cap) return toast('That capture couldn’t be read. Try the Save button again.');
  acceptCapture(cap);
}, true);
$('#captureCancel').onclick = () => $('#captureDlg').close();
$('#capturePasteBtn').onclick = async () => {
  try {
    const cap = parseCapture(await navigator.clipboard.readText());
    if (cap) acceptCapture(cap); else toast('Your clipboard doesn’t hold a captured chat. Click the Save button on the chat again.');
  } catch { toast('The browser didn’t allow reading the clipboard. Press ⌘V instead.'); }
};
function handleHash(){
  const h = location.hash;
  if (h === '#capture'){
    history.replaceState(null, '', location.pathname + location.search);
    $('#captureDlg').showModal(); $('#pasteZone').focus();
    return;
  }
  if (!h.startsWith('#add=')) return;
  // Old Save buttons put data in the URL. Accept only the link and title, drop any conversation text, and clean the address bar.
  const p = new URLSearchParams(h.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  const url = safeChatUrl(p.get('add')); if (!url) return toast('That link was blocked. Only https:// chat links can be saved.');
  const existing = db.chats.find(c => normUrl(c.url) === normUrl(url));
  if (existing) openEditor(existing);
  else { openEditor(null, { url, provider: detect(url), title: cleanTitle(String(p.get('title') || '').slice(0, LIMITS.title)) }); localSuggest(false); }
  if (p.has('ctx')) toast('Your Save button is out of date. Replace it in Settings → Capture so conversation text never goes in a web address.', 'Open', () => openSettings('capture'), 10000);
}
window.addEventListener('hashchange', handleHash);

applyTheme();
render();
if (purgedStoredKey) setTimeout(() => toast('Security update: your Claude API key was saved by an earlier version. It has been deleted from this browser. Please revoke it in the Anthropic Console and create a new one.', 'Open AI settings', () => openSettings('ai'), 15000), 600);
else if (!db.settings.welcomed && !/^#(add=|capture)/.test(location.hash)) $('#welcomeDlg').showModal(); else maybeRemindBackup();
handleHash();
})();
