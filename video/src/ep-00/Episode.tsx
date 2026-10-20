import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display, fade, Label, mono, Stage } from '../kit';
import { ColdOpenScenes, coldOpenShake } from './ColdOpen';

// Line starts in seconds, from `python3 scripts/cues.py public/audio/ep-00.wav` mapped to docs/scripts/ep-00-tts.md.
const CUE = {
  intro: 45.4, idea: 50.7, notSlides: 55.8, code: 58.9, story: 63.85, trigger: 65.25, fix: 67.6, lesson: 71.4,
  season: 78.15,
  respect: 119.7, notLaugh: 122.75, sources: 125.55,
  open: 133.55, tagged: 136.1, ai: 141.8, wrong: 145.85,
  close: 151.3, both: 155.5, notNeeded: 157.6, leftOut: 161.2, link: 166.95, go: 169.15,
  end: 170.8,
};

// Season 1 as narrated, with the moment each incident is introduced.
const SEASON = [
  { at: 80.15, ref: 'EP-01', name: 'Ariane 5', year: 1996, fact: 'int16 overflow', detail: 'The number that didn’t fit' },
  { at: 84.15, ref: 'EP-02', name: 'Mars Climate Orbiter', year: 1999, fact: 'lbf·s ≠ N·s', detail: 'Pounds on one side, newtons on the other' },
  { at: 91.1, ref: 'EP-03', name: 'Patriot, Dhahran', year: 1991, fact: '0.34 s drift', detail: 'A clock that drifted a third of a second' },
  { at: 96.5, ref: 'EP-04', name: 'Therac-25', year: 1985, fact: 'race condition', detail: 'A radiation therapy machine' },
  { at: 102.05, ref: 'EP-05', name: 'Knight Capital', year: 2012, fact: '$440M · 45 min', detail: 'A trading system that ran away' },
  { at: 108.4, ref: 'EP-06', name: 'Cloudflare', year: 2019, fact: '1 regex', detail: 'Taken down by a regular expression' },
  { at: 112.75, ref: 'EP-07', name: 'CrowdStrike', year: 2024, fact: '8.5M machines', detail: 'One config file' },
];

const REPORTS = [
  'ESA Inquiry Board · 1996',
  'NASA Mishap Investigation Board · 1999',
  'US GAO IMTEC-92-26 · 1992',
  'Leveson & Turner · IEEE Computer · 1993',
  'US SEC · 2013',
  'Cloudflare post-mortem · 2019',
  'CrowdStrike root cause analysis · 2024',
];

const LOOP = [
  { at: CUE.story, label: 'Hear the story' },
  { at: CUE.trigger, label: 'Trigger the bug' },
  { at: CUE.fix, label: 'Fix it' },
  { at: CUE.fix + 1.4, label: 'Prove it with a test' },
  { at: CUE.lesson, label: 'Keep one lesson' },
];

const Panel = ({ children, color = C.ink, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) => (
  <div style={{ border: `2px solid ${color}`, background: '#fbfbf9', padding: '22px 28px', ...style }}>{children}</div>
);

const Scene = ({ t, from, to, children, style }: { t: number; from: number; to: number; children: React.ReactNode; style?: React.CSSProperties }) =>
  t < from - 0.1 || t > to + 0.1 ? null : (
    <AbsoluteFill style={{ opacity: fade(t, from, to), justifyContent: 'center', padding: 96, ...style }}>{children}</AbsoluteFill>
  );

export const Episode = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pop = (at: number) => spring({ frame: frame - at * fps, fps, config: { damping: 14 } });
  const on = (at: number) => t >= at;

  const current = [...SEASON].reverse().find((s) => on(s.at));

  return (
    <Stage episode="EP-00" shake={coldOpenShake(t)}>
      <Audio src={staticFile('audio/ep-00.wav')} />
      <ColdOpenScenes />

      {/* "I'm Ram, and this is Post-Mortem Lab." */}
      <Scene t={t} from={CUE.intro} to={CUE.notSlides}>
        <div style={{ transform: `translateY(${interpolate(pop(CUE.intro), [0, 1], [30, 0])}px)`, opacity: pop(CUE.intro) }}>
          <Label color={C.red}>■ ParamLab presents</Label>
          <div style={{ font: `600 110px ${display}`, lineHeight: 1, margin: '18px 0 20px' }}>Post-Mortem Lab</div>
          <div style={{ font: `500 40px ${mono}`, color: C.red }}>Break it yourself.</div>
        </div>
        <div style={{ marginTop: 56, opacity: pop(CUE.idea), font: `500 34px ${display}`, color: C.muted }}>
          One famous engineering failure per episode. <span style={{ color: C.ink }}>Rebuilt.</span>
        </div>
      </Scene>

      {/* "Not a diagram. Not a slideshow. The actual mechanism, as code you can run in your browser." */}
      <Scene t={t} from={CUE.notSlides} to={CUE.story} style={{ flexDirection: 'row', alignItems: 'center', gap: 64 }}>
        <div style={{ display: 'grid', gap: 18, width: 330 }}>
          {['Diagram', 'Slideshow'].map((w, i) => (
            <div key={w} style={{ font: `500 46px ${mono}`, color: C.muted, textDecoration: 'line-through', opacity: pop(CUE.notSlides + i * 1.1) }}>✕ {w}</div>
          ))}
          <div style={{ font: `600 46px ${display}`, opacity: pop(CUE.code) }}>✓ Running code</div>
        </div>
        <Panel style={{ flex: 1, opacity: pop(CUE.code), font: `500 20px/1.6 ${mono}` }}>
          <div style={{ color: C.muted }}>// packages/toolkit/src/numeric.ts</div>
          <div><span style={{ color: C.red }}>export function</span> toIntChecked(value, type = INT16) {'{'}</div>
          <div>&nbsp;&nbsp;<span style={{ color: C.red }}>const</span> n = roundAda(value);</div>
          <div>&nbsp;&nbsp;<span style={{ color: C.red }}>const</span> {'{'} min, max {'}'} = rangeOf(type);</div>
          <div>&nbsp;&nbsp;<span style={{ color: C.red }}>if</span> (n &lt; min || n &gt; max)</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: C.red }}>throw new</span> OperandError(value, type);</div>
          <div>&nbsp;&nbsp;<span style={{ color: C.red }}>return</span> n;</div>
          <div>{'}'}</div>
          <div style={{ marginTop: 14, color: C.green, opacity: pop(CUE.code + 2) }}>▶ runs in your browser</div>
        </Panel>
      </Scene>

      {/* "You hear the story. You trigger the bug yourself. Then we fix it, and prove the fix with a test. ..." */}
      <Scene t={t} from={CUE.story} to={CUE.season}>
        <Label>Every episode</Label>
        <div style={{ display: 'flex', gap: 14, marginTop: 28, alignItems: 'stretch' }}>
          {LOOP.map((step, i) => {
            const active = on(step.at);
            const color = i === 1 ? C.red : i === 3 ? C.green : C.ink;
            return (
              <Panel key={step.label} color={active ? color : C.rule} style={{ flex: 1, opacity: active ? 1 : 0.35, transform: `translateY(${active ? 0 : 12}px)` }}>
                <div style={{ font: `500 20px ${mono}`, color: active ? color : C.muted }}>0{i + 1}</div>
                <div style={{ font: `600 30px ${display}`, marginTop: 10 }}>{step.label}</div>
              </Panel>
            );
          })}
        </div>
        <div style={{ marginTop: 40, font: `500 26px ${mono}`, color: C.green, opacity: pop(CUE.fix + 1.6) }}>
          ✓ toIntChecked(32768.37) throws OperandError
        </div>
      </Scene>

      {/* Season one, one incident at a time */}
      <Scene t={t} from={CUE.season} to={CUE.respect} style={{ flexDirection: 'row', alignItems: 'center', gap: 56, padding: '96px 72px' }}>
        <div style={{ width: 470, display: 'grid', gap: 6 }}>
          <Label color={C.red}>■ Season 1</Label>
          <div style={{ height: 10 }} />
          {SEASON.map((s) => {
            const active = current === s;
            return (
              <div key={s.ref} style={{
                display: 'flex', gap: 18, padding: '9px 14px', font: `500 24px ${mono}`,
                opacity: on(s.at) ? 1 : 0.3,
                background: active ? C.ink : 'transparent', color: active ? C.bg : C.ink,
              }}>
                <span style={{ color: active ? C.bg : C.muted }}>{s.ref}</span>
                <span>{s.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1 }}>
          {current ? (
            <div key={current.ref} style={{ opacity: pop(current.at), transform: `translateX(${interpolate(pop(current.at), [0, 1], [24, 0])}px)` }}>
              <Label>{current.ref} · {current.year}</Label>
              <div style={{ font: `600 68px ${display}`, lineHeight: 1.05, margin: '14px 0 22px' }}>{current.name}</div>
              <div style={{ font: `600 60px ${mono}`, color: C.red }}>{current.fact}</div>
              <div style={{ font: `500 30px ${display}`, color: C.muted, marginTop: 18 }}>{current.detail}</div>
            </div>
          ) : (
            <div style={{ font: `600 68px ${display}`, opacity: pop(CUE.season) }}>Here’s season one.</div>
          )}
        </div>
      </Scene>

      {/* Respect */}
      <Scene t={t} from={CUE.respect} to={CUE.open}>
        <div style={{ font: `600 64px ${display}`, opacity: pop(CUE.respect) }}>Some of these failures cost lives.</div>
        <div style={{ font: `500 36px ${display}`, color: C.muted, marginTop: 18, opacity: pop(CUE.notLaugh) }}>We’re not here to laugh at anyone.</div>
        <div style={{ marginTop: 40, display: 'grid', gap: 10 }}>
          {REPORTS.map((r, i) => (
            <div key={r} style={{ font: `500 22px ${mono}`, opacity: pop(CUE.sources + i * 0.45) }}>
              <span style={{ color: C.red }}>▤</span> {r}
            </div>
          ))}
        </div>
      </Scene>

      {/* Open source, tagged releases, AI pair programming */}
      <Scene t={t} from={CUE.open} to={CUE.close} style={{ flexDirection: 'row', alignItems: 'center', gap: 64 }}>
        <div style={{ width: 420 }}>
          <div style={{ font: `600 60px ${display}`, lineHeight: 1.1, opacity: pop(CUE.open) }}>Everything is open source.</div>
          <div style={{ marginTop: 34, opacity: pop(CUE.ai) }}>
            <Label color={C.green}>● Built with an AI pair programmer</Label>
            <div style={{ font: `500 28px ${display}`, color: C.muted, marginTop: 12, opacity: pop(CUE.wrong) }}>Mistakes included.</div>
          </div>
        </div>
        <Panel style={{ flex: 1, background: C.ink, color: C.bg, borderColor: C.ink, font: `500 24px/1.7 ${mono}` }}>
          <div style={{ opacity: pop(CUE.open + 0.5) }}><span style={{ color: '#8a938c' }}>$</span> git clone …/postmortem-lab</div>
          <div style={{ opacity: pop(CUE.tagged) }}><span style={{ color: '#8a938c' }}>$</span> git checkout <span style={{ color: '#ff6b5e' }}>ep-01</span></div>
          <div style={{ opacity: pop(CUE.tagged + 1.5) }}><span style={{ color: '#8a938c' }}>$</span> npm test</div>
          <div style={{ opacity: pop(CUE.tagged + 2.5), color: '#3ddc97' }}>✓ numeric.test.ts (6 tests)</div>
          <div style={{ opacity: pop(CUE.tagged + 3), color: '#3ddc97' }}>Tests 6 passed</div>
        </Panel>
      </Scene>

      {/* Close: what episode one rebuilds */}
      <Scene t={t} from={CUE.close} to={CUE.go}>
        <Label color={C.red}>■ Next · EP-01 · Ariane 5</Label>
        <div style={{ font: `600 56px ${display}`, margin: '14px 0 36px', opacity: pop(CUE.close) }}>Rebuilding the flight software.</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['SRI 1 · active', 'SRI 2 · backup'].map((name, i) => {
            const failed = on(CUE.both + 0.8 + (1 - i) * 0.3);
            return (
              <Panel key={name} color={failed ? C.red : C.ink} style={{ flex: 1, opacity: pop(CUE.both) }}>
                <div style={{ font: `500 22px ${mono}`, color: C.muted }}>Inertial reference system</div>
                <div style={{ font: `600 34px ${display}`, marginTop: 6 }}>{name}</div>
                <div style={{ font: `500 22px ${mono}`, marginTop: 10, color: failed ? C.red : C.green }}>{failed ? '■ Operand error' : '● Nominal'}</div>
              </Panel>
            );
          })}
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 30, font: `500 26px ${mono}` }}>
          <div style={{ opacity: pop(CUE.notNeeded) }}>⌁ Alignment code still running after lift-off, no longer needed</div>
          <div style={{ opacity: pop(CUE.leftOut), color: C.red }}>✕ Range check left out to stay under the CPU budget</div>
        </div>
        <div style={{ position: 'absolute', bottom: 64, left: 96, font: `500 28px ${mono}`, opacity: pop(CUE.link) }}>
          Try it: <span style={{ color: C.red }}>paramlab.dev/play/ariane-5</span>
        </div>
      </Scene>

      {/* "Go break something." */}
      <Scene t={t} from={CUE.go} to={CUE.end + 2} style={{ alignItems: 'center' }}>
        <div style={{ font: `600 104px ${display}`, color: C.red, transform: `scale(${pop(CUE.go)})` }}>Go break something.</div>
        <div style={{ marginTop: 24 }}><Label>paramlab.dev</Label></div>
      </Scene>
    </Stage>
  );
};
