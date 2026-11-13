import React from 'react';
import {
  AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Workflow, WORKFLOW_FRAMES } from './Workflow';

/* ------------------------------------------------------------------
   Design tokens (match the app: matte black, graphite, no purple)
   ------------------------------------------------------------------ */
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, sans-serif';
const TEXT = '#ededee';
const TEXT_2 = 'rgba(237,237,238,.62)';
const WIN_W = 1280;
const WIN_H = 800;
const WIN_TOP = 236;

/* scene lengths in frames (30 fps) */
const SCENES = {
  intro: 80, workflow: WORKFLOW_FRAMES, library: 150, capture: 170, search: 135, providers: 110, drag: 160, openApp: 110, privacy: 165, outro: 130,
};
const OVERLAP = 12;   // scenes crossfade instead of dipping to black
export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0) - OVERLAP * (Object.keys(SCENES).length - 1);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/* ------------------------------------------------------------------
   Building blocks
   ------------------------------------------------------------------ */
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(120% 70% at 50% -10%, #1b1b1f 0%, #08080a 60%)' }}>
    <AbsoluteFill style={{
      opacity: 0.07, mixBlendMode: 'overlay',
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    }} />
  </AbsoluteFill>
);

/** Fades a whole scene in and out so scenes blend into each other. */
const SceneFade: React.FC<{ length: number; children: React.ReactNode }> = ({ length, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, OVERLAP, length - OVERLAP, length], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const Caption: React.FC<{ title: string; sub?: string; delay?: number }> = ({ title, sub, delay = 6 }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [delay, delay + 18], [0, 1], { ...clamp, easing: ease });
  const t2 = interpolate(f, [delay + 8, delay + 26], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ position: 'absolute', top: 64, left: 0, right: 0, textAlign: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: TEXT, letterSpacing: -1.2, opacity: t, transform: `translateY(${(1 - t) * 18}px)` }}>{title}</div>
      {sub && <div style={{ fontSize: 26, color: TEXT_2, marginTop: 12, opacity: t2, transform: `translateY(${(1 - t2) * 14}px)` }}>{sub}</div>}
    </div>
  );
};

type Point = [number, number];   // fractions of the screenshot (0..1)
type Shot = { src: string; from: number; to?: number };

/**
 * The app window: real screenshots inside a glass frame, with an optional "camera"
 * that zooms toward a point and an animated cursor that lives in screenshot space.
 */
const AppWindow: React.FC<{
  shots: Shot[];
  zoom?: { from: number; to: number; at: Point; start: number; end: number };
  cursor?: { path: { f: number; p: Point }[]; clicks?: number[]; grabbing?: [number, number] };
  highlight?: { at: Point; w: number; h: number; from: number; to: number };
}> = ({ shots, zoom, cursor, highlight }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 24 });
  const scale = zoom ? interpolate(f, [zoom.start, zoom.end], [zoom.from, zoom.to], { ...clamp, easing: ease }) : 1;
  const origin = zoom ? `${zoom.at[0] * 100}% ${zoom.at[1] * 100}%` : '50% 50%';

  let cx = 0, cy = 0;
  if (cursor) {
    const pts = cursor.path;
    const frames = pts.map(p => p.f);
    cx = interpolate(f, frames, pts.map(p => p.p[0]), { ...clamp, easing: Easing.inOut(Easing.cubic) }) * WIN_W;
    cy = interpolate(f, frames, pts.map(p => p.p[1]), { ...clamp, easing: Easing.inOut(Easing.cubic) }) * WIN_H;
  }
  const click = (cursor?.clicks || []).map(c => interpolate(f, [c, c + 14], [0, 1], clamp)).find(v => v > 0 && v < 1) ?? 0;
  const grabbing = cursor?.grabbing ? f >= cursor.grabbing[0] && f <= cursor.grabbing[1] : false;

  return (
    <div style={{
      position: 'absolute', left: (1920 - WIN_W) / 2, top: WIN_TOP, width: WIN_W, height: WIN_H,
      borderRadius: 22, overflow: 'hidden', background: '#0b0b0d',
      boxShadow: '0 50px 120px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.09), inset 0 1px 0 rgba(255,255,255,.06)',
      opacity: enter, transform: `translateY(${(1 - enter) * 40}px) scale(${0.96 + enter * 0.04})`,
    }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: origin }}>
        {shots.map(s => {
          const o = interpolate(f, [s.from, s.from + 10, ...(s.to !== undefined ? [s.to, s.to + 10] : [])],
            s.to !== undefined ? [0, 1, 1, 0] : [0, 1], clamp);
          return <Img key={s.src + s.from} src={staticFile(`shots/${s.src}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: s.from === 0 ? (s.to !== undefined ? interpolate(f, [s.to, s.to + 10], [1, 0], clamp) : 1) : o }} />;
        })}
        {highlight && (
          <div style={{
            position: 'absolute', left: highlight.at[0] * WIN_W - highlight.w / 2, top: highlight.at[1] * WIN_H - highlight.h / 2,
            width: highlight.w, height: highlight.h, borderRadius: 12, border: '2px solid rgba(255,214,10,.9)',
            boxShadow: '0 0 0 6px rgba(255,214,10,.15)',
            opacity: interpolate(f, [highlight.from, highlight.from + 10, highlight.to, highlight.to + 10], [0, 1, 1, 0], clamp),
          }} />
        )}
        {cursor && (
          <div style={{ position: 'absolute', left: cx, top: cy, transform: `scale(${1 / scale})`, transformOrigin: '0 0' }}>
            {click > 0 && (
              <div style={{
                position: 'absolute', left: -22, top: -22, width: 44, height: 44, borderRadius: 22,
                border: '2px solid rgba(255,255,255,.8)', opacity: 1 - click, transform: `scale(${0.4 + click})`,
              }} />
            )}
            <svg width="26" height="30" viewBox="0 0 26 30" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))', transform: `scale(${grabbing ? 0.9 : 1})` }}>
              <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 16 L20 16 Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const Keycap: React.FC<{ label: string; at: number }> = ({ label, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 12, stiffness: 180 } });
  const press = interpolate(f, [at + 14, at + 18, at + 24], [0, 1, 0], clamp);
  const out = interpolate(f, [at + 40, at + 50], [1, 0], clamp);
  return (
    <div style={{
      position: 'absolute', right: 150, top: WIN_TOP + 300, fontFamily: FONT, fontSize: 64, fontWeight: 600, color: '#0b0b0c',
      background: 'linear-gradient(#f4f4f5, #cfcfd3)', borderRadius: 22, padding: '18px 34px',
      boxShadow: `0 ${10 - press * 6}px 0 #8e8e93, 0 24px 40px -10px rgba(0,0,0,.7)`,
      transform: `scale(${s}) translateY(${press * 6}px)`, opacity: out,
    }}>{label}</div>
  );
};

/* ------------------------------------------------------------------
   Scenes
   ------------------------------------------------------------------ */
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 14, stiffness: 120 } });
  const t = interpolate(f, [14, 34], [0, 1], { ...clamp, easing: ease });
  const t2 = interpolate(f, [24, 44], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <Img src={staticFile('icon.svg')} style={{ width: 168, height: 168, transform: `scale(${pop})`, filter: 'drop-shadow(0 30px 50px rgba(0,0,0,.7))' }} />
      <div style={{ fontSize: 96, fontWeight: 760, color: TEXT, letterSpacing: -2.5, marginTop: 34, opacity: t, transform: `translateY(${(1 - t) * 20}px)` }}>Agent Mash</div>
      <div style={{ fontSize: 34, color: TEXT_2, marginTop: 10, opacity: t2, transform: `translateY(${(1 - t2) * 16}px)` }}>The private library for your best AI conversations</div>
    </AbsoluteFill>
  );
};

const PROVIDERS: [string, string][] = [
  ['ChatGPT', '#10a37f'], ['Claude', '#d97757'], ['Gemini', '#4285f4'], ['Kimi', '#1f6feb'], ['DeepSeek', '#4d6bfe'],
  ['Perplexity', '#20b8cd'], ['Grok', '#9ca3af'], ['Le Chat', '#ff7000'], ['Copilot', '#0ea5e9'], ['Qwen', '#0891b2'],
  ['Meta AI', '#0866ff'], ['NotebookLM', '#34a853'],
];
const Problem: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gather = interpolate(f, [62, 92], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Caption title="Your best AI chats are scattered" sub="Across apps, tabs and providers. Hard to find when you need them." />
      {PROVIDERS.map(([name, color], i) => {
        const angle = (i / PROVIDERS.length) * Math.PI * 2 + 0.3;
        const r = 330 + (i % 3) * 70;
        const sx = 960 + Math.cos(angle) * r * 1.35, sy = 640 + Math.sin(angle) * r * 0.62;
        const x = interpolate(gather, [0, 1], [sx, 960]);
        const y = interpolate(gather, [0, 1], [sy, 640]);
        const appear = spring({ frame: f - 8 - i * 3, fps, config: { damping: 14 } });
        const bob = Math.sin((f + i * 11) / 14) * 6 * (1 - gather);
        return (
          <div key={name} style={{
            position: 'absolute', left: x, top: y + bob, transform: `translate(-50%,-50%) scale(${appear * (1 - gather * 0.6)})`,
            opacity: 1 - gather * 0.9, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderRadius: 999,
            background: 'rgba(28,28,30,.9)', border: '1px solid rgba(255,255,255,.08)', color: TEXT, fontSize: 30, fontWeight: 560,
            boxShadow: '0 20px 40px -18px rgba(0,0,0,.9)',
          }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: color }} />{name}
          </div>
        );
      })}
      <Img src={staticFile('icon.svg')} style={{
        position: 'absolute', left: 960 - 70, top: 640 - 70, width: 140, height: 140,
        transform: `scale(${spring({ frame: f - 80, fps, config: { damping: 12 } })})`,
      }} />
    </AbsoluteFill>
  );
};

const Library: React.FC = () => (
  <AbsoluteFill>
    <Caption title="Every AI you use, in one place" sub="Folders, tags and pins. Your own order. Light or matte black." />
    <AppWindow
      shots={[{ src: 'library', from: 0, to: 88 }, { src: 'folder-work', from: 88 }]}
      zoom={{ from: 1, to: 1.06, at: [0.3, 0.3], start: 10, end: 150 }}
      cursor={{ path: [{ f: 20, p: [0.6, 0.6] }, { f: 70, p: [0.055, 0.385] }, { f: 140, p: [0.07, 0.39] }], clicks: [80] }}
    />
  </AbsoluteFill>
);

const Capture: React.FC = () => (
  <AbsoluteFill>
    <Caption title="Or capture it in one click" sub="The Save button grabs the link, title and conversation, so you can search inside it later." />
    <AppWindow
      shots={[{ src: 'capture-paste', from: 0, to: 66 }, { src: 'capture-editor', from: 66 }]}
      zoom={{ from: 1, to: 1.18, at: [0.52, 0.72], start: 80, end: 165 }}
    />
    <Keycap label="⌘V" at={22} />
  </AbsoluteFill>
);

const Search: React.FC = () => (
  <AbsoluteFill>
    <Caption title="Find it by anything you remember" sub="Search reaches inside the conversation, not just the title." />
    <AppWindow
      shots={[{ src: 'library', from: 0, to: 30 }, { src: 'search', from: 30 }]}
      zoom={{ from: 1, to: 1.55, at: [0.2, 0.18], start: 40, end: 125 }}
      highlight={{ at: [0.215, 0.27], w: 64, h: 26, from: 70, to: 135 }}
    />
  </AbsoluteFill>
);

const Providers: React.FC = () => (
  <AbsoluteFill>
    <Caption title="34 AI providers built in" sub="Type “ki” and it finds Kimi. Add your own in a second." />
    <AppWindow
      shots={[{ src: 'library', from: 0, to: 24 }, { src: 'providers', from: 24 }]}
      zoom={{ from: 1, to: 1.9, at: [0.975, 0.05], start: 10, end: 80 }}
    />
  </AbsoluteFill>
);

const Drag: React.FC = () => (
  <AbsoluteFill>
    <Caption title="Drag to arrange" sub="Put the chats that matter first. Drop on a folder to file them." />
    <AppWindow
      shots={[{ src: 'library', from: 0, to: 46 }, { src: 'drag', from: 46, to: 104 }, { src: 'reordered', from: 104 }]}
      cursor={{ path: [{ f: 14, p: [0.62, 0.34] }, { f: 40, p: [0.6, 0.33] }, { f: 96, p: [0.34, 0.2] }, { f: 150, p: [0.36, 0.22] }], grabbing: [40, 104] }}
    />
  </AbsoluteFill>
);

const OpenApp: React.FC = () => (
  <AbsoluteFill>
    <Caption title="Opens right where it lives" sub="Claude chats jump straight into the Claude desktop app." />
    <AppWindow
      shots={[{ src: 'reordered', from: 0, to: 34 }, { src: 'open-app', from: 34 }]}
      zoom={{ from: 1, to: 1.35, at: [0.5, 0.92], start: 44, end: 105 }}
      cursor={{ path: [{ f: 6, p: [0.36, 0.22] }, { f: 30, p: [0.56, 0.17] }, { f: 110, p: [0.56, 0.17] }], clicks: [32] }}
    />
  </AbsoluteFill>
);

const Privacy: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Caption title="No account. No server. No tracking." sub="Your library stays in your browser. Back up or export to Obsidian any time." />
      <AppWindow shots={[{ src: 'welcome', from: 0, to: 78 }, { src: 'privacy', from: 78 }]} zoom={{ from: 1, to: 1.12, at: [0.5, 0.45], start: 90, end: 165 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 26, display: 'flex', justifyContent: 'center', gap: 14, fontFamily: FONT }}>
        {['Stays in your browser', 'API key never saved', 'Strict security policy', 'Free'].map((t, i) => {
          const o = interpolate(f, [30 + i * 8, 44 + i * 8], [0, 1], clamp);
          return <span key={t} style={{ opacity: o, padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,.07)', color: TEXT_2, fontSize: 20, border: '1px solid rgba(255,255,255,.08)' }}>{t}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 14 } });
  const t = interpolate(f, [10, 30], [0, 1], { ...clamp, easing: ease });
  const t2 = interpolate(f, [24, 44], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <Img src={staticFile('icon.svg')} style={{ width: 132, height: 132, transform: `scale(${pop})` }} />
      <div style={{ fontSize: 72, fontWeight: 740, color: TEXT, letterSpacing: -1.8, marginTop: 28, opacity: t }}>Save the conversations that matter</div>
      <div style={{
        marginTop: 30, opacity: t2, transform: `translateY(${(1 - t2) * 12}px)`, fontSize: 40, fontWeight: 600, color: '#0b0b0c',
        background: '#ededee', padding: '14px 34px', borderRadius: 999, boxShadow: '0 20px 40px -14px rgba(0,0,0,.8)',
      }}>agent-mash.pages.dev</div>
      <div style={{ fontSize: 24, color: TEXT_2, marginTop: 22, opacity: t2 }}>Free · Private · Works with every AI you use</div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------
   Timeline
   ------------------------------------------------------------------ */
const ORDER: [keyof typeof SCENES, React.FC][] = [
  ['intro', Intro], ['workflow', Workflow], ['library', Library], ['capture', Capture], ['search', Search],
  ['providers', Providers], ['drag', Drag], ['openApp', OpenApp], ['privacy', Privacy], ['outro', Outro],
];

export const AgentMashDemo: React.FC = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ background: '#08080a' }}>
      <Backdrop />
      {ORDER.map(([key, Scene]) => {
        const len = SCENES[key];
        const from = start;
        start += len - OVERLAP;
        return (
          <Sequence key={key} from={from} durationInFrames={len} name={key}>
            <SceneFade length={len}><Scene /></SceneFade>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
