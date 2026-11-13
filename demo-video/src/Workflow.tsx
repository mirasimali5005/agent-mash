import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import coords from './wf-coords.json';

/* ------------------------------------------------------------------
   The main use case, shown in a browser window:
   copy a ChatGPT chat's link → paste it into Agent Mash → save →
   click it later to jump back → open a Claude chat the same way.
   The chat pages are neutral stand-ins (no provider branding); the
   Agent Mash screens are real screenshots of the live site.
   ------------------------------------------------------------------ */

export const WORKFLOW_FRAMES = 500;

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Inter, sans-serif';
const W = 1480;                        // browser window width
const CONTENT_H = Math.round(W * 900 / 1440);
const TAB_H = 42, BAR_H = 46, CHROME = TAB_H + BAR_H;
const LEFT = (1920 - W) / 2, TOP = (1080 - CHROME - CONTENT_H) / 2;
const TAB_W = 232, TAB_X0 = 92;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const KYOTO_URL = coords.kyotoUrl;
const CLAUDE_URL = 'https://claude.ai/chat/9a8b7c6d-1111-4222-8333-444455556666';

type Pt = [number, number];
const inContent = (fx: number, fy: number): Pt => [LEFT + fx * W, TOP + CHROME + fy * CONTENT_H];
const tabCenter = (i: number): Pt => [LEFT + TAB_X0 + i * (TAB_W + 4) + TAB_W / 2, TOP + TAB_H / 2 + 3];
const ADDRESS: Pt = [LEFT + 470, TOP + TAB_H + BAR_H / 2];

/* ---------------- timeline ---------------- */
const T = {
  copyClick: 58, copyKey: 72,
  amTab: 128,
  addClick: 168, urlClick: 190, pasteKey: 198, pasted: 206, filled: 246,
  saveClick: 278, saved: 282,
  cardClick: 336, reopened: 340,
  backToAm: 392,
  claudeClick: 432, claudeOpen: 436,
};

/* cursor path in video pixels */
const CURSOR: { f: number; p: Pt }[] = [
  { f: 0, p: [1260, 760] },
  { f: 26, p: [1240, 740] },
  { f: 54, p: ADDRESS },
  { f: 96, p: [ADDRESS[0] + 30, ADDRESS[1] + 30] },
  { f: 124, p: tabCenter(1) },
  { f: 140, p: tabCenter(1) },
  { f: 164, p: inContent(coords.addBtn.x, coords.addBtn.y) },
  { f: 186, p: inContent(coords.urlField.x - 0.06, coords.urlField.y) },
  { f: 236, p: inContent(coords.titleField.x + 0.08, coords.titleField.y + 0.06) },
  { f: 274, p: inContent(coords.saveBtn.x, coords.saveBtn.y) },
  { f: 300, p: inContent(coords.saveBtn.x - 0.1, coords.saveBtn.y - 0.2) },
  { f: 332, p: inContent(coords.newCard.x - 0.05, coords.newCard.y) },
  { f: 360, p: inContent(0.55, 0.5) },
  { f: 388, p: tabCenter(1) },
  { f: 404, p: tabCenter(1) },
  { f: 428, p: inContent(coords.claudeCard.x - 0.04, coords.claudeCard.y) },
  { f: 470, p: inContent(0.5, 0.58) },
];
const CLICKS = [T.copyClick, T.amTab, T.addClick, T.urlClick, T.saveClick, T.cardClick, T.backToAm, T.claudeClick];

/* ---------------- pieces ---------------- */
const Dot: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => (
  <span style={{ width: size, height: size, borderRadius: size / 2, background: color, display: 'inline-block', flex: 'none' }} />
);

type Tab = { title: string; color: string };
const TabStrip: React.FC<{ tabs: Tab[]; active: number; f: number; openedAt: number[] }> = ({ tabs, active, f, openedAt }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: TAB_H, background: '#151517', display: 'flex', alignItems: 'flex-end' }}>
    <div style={{ position: 'absolute', left: 18, top: 15, display: 'flex', gap: 8 }}>
      {['#ff5f57', '#febc2e', '#28c840'].map(c => <Dot key={c} color={c} size={12} />)}
    </div>
    {tabs.map((t, i) => {
      const appear = openedAt[i] ? interpolate(f, [openedAt[i], openedAt[i] + 10], [0, 1], { ...clamp, easing: ease }) : 1;
      return (
        <div key={i} style={{
          position: 'absolute', left: TAB_X0 + i * (TAB_W + 4), bottom: 0, width: TAB_W * appear, height: 34, overflow: 'hidden',
          borderRadius: '10px 10px 0 0', background: i === active ? '#2a2a2d' : 'transparent', opacity: appear,
          display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px', boxSizing: 'border-box',
          color: i === active ? '#ededee' : 'rgba(237,237,238,.55)', fontFamily: FONT, fontSize: 14, whiteSpace: 'nowrap',
        }}>
          <Dot color={t.color} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
        </div>
      );
    })}
  </div>
);

const AddressBar: React.FC<{ url: string; selected: boolean }> = ({ url, selected }) => {
  const u = url.replace(/^https:\/\//, '');
  const host = u.split('/')[0], rest = u.slice(host.length);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: TAB_H, height: BAR_H, background: '#2a2a2d', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', boxSizing: 'border-box', borderBottom: '1px solid rgba(0,0,0,.4)' }}>
      {['‹', '›', '↻'].map(s => <span key={s} style={{ color: 'rgba(237,237,238,.5)', fontFamily: FONT, fontSize: 20, width: 18, textAlign: 'center' }}>{s}</span>)}
      <div style={{ flex: 1, height: 32, borderRadius: 16, background: '#1b1b1d', display: 'flex', alignItems: 'center', padding: '0 16px', fontFamily: FONT, fontSize: 15, boxShadow: selected ? '0 0 0 2px rgba(237,237,238,.35)' : 'none' }}>
        <span style={{ color: 'rgba(237,237,238,.45)', marginRight: 8 }}>🔒</span>
        <span style={{ background: selected ? '#3b6ccf' : 'transparent', color: selected ? '#fff' : '#ededee', borderRadius: 3, padding: '1px 2px' }}>
          {selected ? url : <>{host}<span style={{ color: 'rgba(237,237,238,.55)' }}>{rest}</span></>}
        </span>
      </div>
    </div>
  );
};

/** Neutral stand-in for an AI chat page (no provider logos or styling copied). */
const ChatPage: React.FC<{ kind: 'gpt' | 'claude' }> = ({ kind }) => {
  const gpt = kind === 'gpt';
  const accent = gpt ? '#10a37f' : '#d97757';
  const bg = gpt ? '#1d1d1f' : '#22201e';
  const side = gpt ? ['Kyoto trip on a budget', 'Pricing page copy and tiers', 'Python scraper timeout fix', 'Gift ideas for dad'] : ['Wedding speech, second draft', 'Investor update email draft', 'Reading list for spring'];
  const user = gpt ? 'Plan a 4-day Kyoto trip on a budget. I love ramen and temples.' : 'Can you make the opening of my wedding speech warmer?';
  const reply = gpt
    ? ['Here’s a 4-day plan that keeps costs low:', 'Day 1 · Fushimi Inari at sunrise, then ramen near Kyoto Station.', 'Day 2 · Kinkaku-ji and the Arashiyama bamboo grove.', 'Getting there · Take the Haruka express from Kansai airport (75 min) and use an ICOCA card for the discount.']
    : ['Here’s a warmer opening:', '“When I first met Sam, I didn’t know I was meeting family. Tonight it’s official, and I couldn’t be happier.”', 'I cut the inside jokes and kept the story about the road trip. It ends on the toast.'];
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, fontFamily: FONT, display: 'flex' }}>
      <div style={{ width: 270, background: 'rgba(0,0,0,.22)', padding: '26px 16px', boxSizing: 'border-box' }}>
        <div style={{ height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', color: 'rgba(237,237,238,.7)', fontSize: 15, display: 'flex', alignItems: 'center', padding: '0 14px', marginBottom: 22 }}>+ New chat</div>
        {side.map((s, i) => (
          <div key={s} style={{ padding: '10px 12px', borderRadius: 9, fontSize: 15, color: i === 0 ? '#ededee' : 'rgba(237,237,238,.55)', background: i === 0 ? 'rgba(255,255,255,.07)' : 'transparent', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</div>
        ))}
      </div>
      <div style={{ flex: 1, position: 'relative', padding: '70px 120px 0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 34 }}>
          <div style={{ maxWidth: 560, background: 'rgba(255,255,255,.08)', color: '#ededee', fontSize: 19, lineHeight: 1.5, padding: '14px 20px', borderRadius: 22 }}>{user}</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: accent, flex: 'none', marginTop: 2 }} />
          <div style={{ color: '#ededee', fontSize: 19, lineHeight: 1.6 }}>
            {reply.map((r, i) => <p key={i} style={{ margin: '0 0 14px' }}>{r}</p>)}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 120, right: 120, bottom: 150, height: 56, borderRadius: 28, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(237,237,238,.4)', fontSize: 17, display: 'flex', alignItems: 'center', padding: '0 24px' }}>Message…</div>
      </div>
    </div>
  );
};

const Shot: React.FC<{ src: string; opacity?: number }> = ({ src, opacity = 1 }) => (
  <Img src={staticFile(`shots/${src}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }} />
);

const Keycap: React.FC<{ label: string; at: number; x: number; y: number }> = ({ label, at, x, y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 12, stiffness: 180 } });
  const press = interpolate(f, [at + 10, at + 14, at + 20], [0, 1, 0], clamp);
  const out = interpolate(f, [at + 34, at + 44], [1, 0], clamp);
  if (f < at) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, fontFamily: FONT, fontSize: 54, fontWeight: 650, color: '#0b0b0c',
      background: 'linear-gradient(#f4f4f5, #cfcfd3)', borderRadius: 18, padding: '12px 28px',
      boxShadow: `0 ${9 - press * 6}px 0 #8e8e93, 0 24px 40px -10px rgba(0,0,0,.8)`,
      transform: `translate(-50%,-50%) scale(${s}) translateY(${press * 6}px)`, opacity: out, zIndex: 20,
    }}>{label}</div>
  );
};

const Caption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [from, from + 12, to - 10, to], [0, 1, 1, 0], clamp);
  if (o <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: TOP + CHROME + CONTENT_H - 92, transform: `translate(-50%, ${(1 - o) * 12}px)`, opacity: o,
      fontFamily: FONT, fontSize: 34, fontWeight: 650, color: '#0b0b0c', background: 'rgba(237,237,238,.96)',
      padding: '14px 30px', borderRadius: 999, whiteSpace: 'nowrap', letterSpacing: -0.4, zIndex: 30,
      boxShadow: '0 20px 50px -14px rgba(0,0,0,.85)',
    }}>{text}</div>
  );
};

/* ---------------- the scene ---------------- */
export const Workflow: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 22 });

  const tabs: Tab[] = [
    { title: 'Kyoto trip on a budget', color: '#10a37f' },
    { title: 'Agent Mash', color: '#d9d9dc' },
    { title: 'Kyoto trip on a budget', color: '#10a37f' },
    { title: 'Wedding speech, second draft', color: '#d97757' },
  ];
  const visibleTabs = f >= T.claudeOpen ? 4 : f >= T.reopened ? 3 : 2;
  const active = f >= T.claudeOpen ? 3 : f >= T.backToAm ? 1 : f >= T.reopened ? 2 : f >= T.amTab ? 1 : 0;
  const url = active === 3 ? CLAUDE_URL : active === 1 ? 'https://agent-mash.pages.dev' : KYOTO_URL;
  const selected = active === 0 && f >= T.copyClick + 2 && f < T.amTab;

  // Agent Mash screen sequence (crossfades between real screenshots)
  const am: [string, number][] = [['wf-library-before', 0], ['wf-add-empty', T.addClick + 2], ['wf-add-pasted', T.pasted], ['wf-add-filled', T.filled], ['wf-library-after', T.saved]];
  const amLayers = am.map(([src, start], i) => {
    const next = am[i + 1]?.[1];
    const o = i === 0 ? 1 : interpolate(f, [start, start + 8], [0, 1], clamp);
    return f >= start - 1 && (next === undefined || f < next + 9) ? <Shot key={src} src={src} opacity={o} /> : null;
  });

  // cursor
  const cx = interpolate(f, CURSOR.map(c => c.f), CURSOR.map(c => c.p[0]), { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cy = interpolate(f, CURSOR.map(c => c.f), CURSOR.map(c => c.p[1]), { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const click = CLICKS.map(c => interpolate(f, [c, c + 14], [0, 1], clamp)).find(v => v > 0 && v < 1) ?? 0;
  const ring = interpolate(f, [T.saved + 6, T.saved + 16, T.cardClick - 4, T.cardClick + 4], [0, 1, 1, 0], clamp);
  const [ncx, ncy] = inContent(coords.newCard.x, coords.newCard.y);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', left: LEFT, top: TOP, width: W, height: CHROME + CONTENT_H, borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 50px 120px -30px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.1)', background: '#0b0b0d',
        opacity: enter, transform: `translateY(${(1 - enter) * 40}px) scale(${0.97 + enter * 0.03})`,
      }}>
        <TabStrip tabs={tabs.slice(0, visibleTabs)} active={active} f={f} openedAt={[0, 0, T.reopened, T.claudeOpen]} />
        <AddressBar url={url} selected={selected} />
        <div style={{ position: 'absolute', left: 0, top: CHROME, width: W, height: CONTENT_H, overflow: 'hidden' }}>
          {active === 1 ? amLayers : <ChatPage kind={active === 3 ? 'claude' : 'gpt'} />}
        </div>
      </div>

      {/* new card highlight after saving */}
      {ring > 0 && active === 1 && (
        <div style={{
          position: 'absolute', left: ncx - (coords.newCard.w * W) / 2 - 6, top: ncy - (coords.newCard.h * CONTENT_H) / 2 - 6,
          width: coords.newCard.w * W + 12, height: coords.newCard.h * CONTENT_H + 12, borderRadius: 20,
          border: '3px solid rgba(255,214,10,.95)', boxShadow: '0 0 0 8px rgba(255,214,10,.15)', opacity: ring,
        }} />
      )}

      <Keycap label="⌘C" at={T.copyKey} x={ADDRESS[0] + 380} y={ADDRESS[1] + 110} />
      <Keycap label="⌘V" at={T.pasteKey} x={LEFT + W * 0.83} y={TOP + CHROME + CONTENT_H * 0.32} />

      <Caption text="Found a chat worth keeping? Copy its link." from={12} to={126} />
      <Caption text="Paste it into Agent Mash and save it." from={132} to={300} />
      <Caption text="Later, one click takes you straight back." from={304} to={392} />
      <Caption text="Same for Claude, Gemini, Kimi and 30+ more." from={398} to={WORKFLOW_FRAMES} />

      {/* cursor */}
      <div style={{ position: 'absolute', left: cx, top: cy, zIndex: 40 }}>
        {click > 0 && <div style={{ position: 'absolute', left: -22, top: -22, width: 44, height: 44, borderRadius: 22, border: '2px solid rgba(255,255,255,.85)', opacity: 1 - click, transform: `scale(${0.4 + click})` }} />}
        <svg width="28" height="32" viewBox="0 0 26 30" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.7))' }}>
          <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 16 L20 16 Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
