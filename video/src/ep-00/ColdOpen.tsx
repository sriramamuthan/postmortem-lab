import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display, fade, Label, mono, Stage, Typed, usePortrait } from '../kit';

// Cue times in seconds, taken from the silences in the narration.
const CUE = { launch: 5.1, breakup: 11.5, cost: 15.2, notEngine: 19.65, oneNumber: 23.6, box: 28.5, limit: 31.6, over: 37.75 };

const Rocket = ({ t }: { t: number }) => {
  const rise = interpolate(t, [CUE.launch, CUE.breakup], [0, 260], { extrapolateRight: 'clamp', easing: (x) => x * x });
  const broken = t >= CUE.breakup + 0.6;
  const k = broken ? Math.min(1, (t - CUE.breakup - 0.6) / 1.5) : 0;
  const part = (dx: number, rot: number) => `translate(${dx * k * 60} ${k * 30}) rotate(${rot * k} 80 160)`;
  const stroke = broken ? C.red : C.ink;
  return (
    <svg viewBox="0 -340 300 720" style={{ height: 560 }}>
      <g transform={`translate(70 ${-rise})`} fill="none" stroke={stroke} strokeWidth={3} strokeLinejoin="round">
        <path transform={part(0, 25)} d="M60 20 Q60 0 80 -10 Q100 0 100 20 V300 H60 Z" />
        <path transform={part(-1, -40)} d="M30 120 L42 95 L54 120 V310 H30 Z" />
        <path transform={part(1, 40)} d="M106 120 L118 95 L130 120 V310 H106 Z" />
        {!broken && t > CUE.launch && (
          <path d={`M66 305 L80 ${340 + 20 * Math.sin(t * 40)} L94 305`} stroke={C.red} strokeWidth={4} />
        )}
      </g>
    </svg>
  );
};

const Register = ({ t }: { t: number }) => {
  const value = Math.round(
    interpolate(t, [CUE.box + 0.5, CUE.limit + 3.5, CUE.over + 0.4], [0, 32767, 32768], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (x) => 1 - Math.pow(1 - x, 3),
    }),
  );
  const over = value > 32767;
  const bits = over ? '????????????????' : value.toString(2).padStart(16, '0');
  const color = over ? C.red : C.ink;
  return (
    <div style={{ display: 'grid', gap: 28, justifyItems: 'center' }}>
      <Label>int16 · horizontal bias</Label>
      <div style={{ display: 'flex', gap: 6 }}>
        {[...bits].map((b, i) => (
          <div key={i} style={{
            width: 52, height: 72, flexShrink: 0, display: 'grid', placeItems: 'center',
            border: `2px solid ${over ? C.red : i === 0 ? C.muted : C.ink}`,
            background: b === '1' ? (over ? C.red : C.ink) : 'transparent',
            color: over ? C.red : b === '1' ? C.bg : C.muted, font: `600 30px ${mono}`,
          }}>{b}</div>
        ))}
      </div>
      <div style={{ font: `600 96px ${mono}`, color, fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString('en-US')}
      </div>
      <Label color={over ? C.red : C.green}>{over ? '■ Does not fit · operand error' : value >= 32767 ? '● At the limit · 32,767' : '● Nominal'}</Label>
    </div>
  );
};

export const ColdOpen = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shake = t > CUE.breakup + 0.6 && t < CUE.breakup + 1.2 ? Math.sin(t * 90) * 6 : 0;
  const tPlus = Math.min(37, Math.max(0, ((t - CUE.launch) / (CUE.breakup + 0.6 - CUE.launch)) * 37));
  const portrait = usePortrait();
  const pop = (at: number) => spring({ frame: frame - at * fps, fps, config: { damping: 14 } });

  return (
    <Stage episode="EP-00" shake={shake}>
      <Audio src={staticFile('audio/ep-00.wav')} endAt={45 * 30} />

      {/* Date and place */}
      <AbsoluteFill style={{ opacity: fade(t, 0, CUE.launch), justifyContent: 'center', padding: portrait ? 48 : 96 }}>
        <Label>Incident file 01</Label>
        <div style={{ font: `600 84px ${display}`, marginTop: 16 }}><Typed text="4 June 1996" t={t} start={0.2} /></div>
        <div style={{ font: `500 40px ${mono}`, color: C.muted, marginTop: 12 }}><Typed text="Kourou, French Guiana" t={t} start={2.7} /></div>
      </AbsoluteFill>

      {/* Launch and breakup */}
      <AbsoluteFill style={{ opacity: fade(t, CUE.launch, CUE.cost), flexDirection: portrait ? 'column-reverse' : 'row', alignItems: 'center', justifyContent: 'space-around', padding: portrait ? '160px 0 120px' : 0 }}>
        <div>
          <Label>Ariane 5 · flight 501</Label>
          <div style={{ font: `600 120px ${mono}`, color: tPlus >= 37 ? C.red : C.ink }}>T+{tPlus.toFixed(1).padStart(4, '0')}s</div>
          {tPlus >= 37 && <Label color={C.red}>■ Vehicle breakup</Label>}
        </div>
        <Rocket t={t} />
      </AbsoluteFill>

      {/* Cost */}
      <AbsoluteFill style={{ opacity: fade(t, CUE.cost, CUE.notEngine), justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ font: `600 76px ${display}`, textAlign: 'center', transform: `scale(${pop(CUE.cost)})` }}>Hundreds of millions.</div>
        <div style={{ font: `600 76px ${display}`, color: C.red, opacity: pop(17.7) }}>Gone.</div>
      </AbsoluteFill>

      {/* Not the engine, not a weld */}
      <AbsoluteFill style={{ opacity: fade(t, CUE.notEngine, CUE.box), justifyContent: 'center', padding: portrait ? 48 : 120, gap: 24 }}>
        {[['Engine', CUE.notEngine], ['Weld', 21.4]].map(([w, at]) => (
          <div key={w} style={{ font: `500 48px ${mono}`, color: C.muted, opacity: pop(at as number), textDecoration: 'line-through' }}>✕ {w}</div>
        ))}
        <div style={{ font: `600 64px ${display}`, opacity: pop(CUE.oneNumber) }}>
          ✓ One number that didn’t fit in its box.
        </div>
      </AbsoluteFill>

      {/* The register */}
      <AbsoluteFill style={{ opacity: fade(t, CUE.box, 45), justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ zoom: portrait ? 0.66 : 1 }}><Register t={t} /></div>
      </AbsoluteFill>
    </Stage>
  );
};
