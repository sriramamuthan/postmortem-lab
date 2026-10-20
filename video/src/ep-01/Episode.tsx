import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ARIANE_4, ARIANE_5, BREAKUP_ANGLE, LIFT_OFF, fly, type FlightResult } from '../../../incidents/01-ariane-5/src/flight';
import { C, display, fade, Label, mono, Stage, usePortrait } from '../kit';

// Line timings come from the narration (public/audio/ep-01.cues.json, written by scripts/tts.mjs).
export interface Cue {
  section: string;
  line: number;
  start: number | null;
  end: number | null;
}
export interface EpisodeProps {
  cues: Cue[];
  hasAudio: boolean;
}

// The real simulation drives every chart in this video.
const A5 = fly(ARIANE_5);
const A4 = fly(ARIANE_4);
const LIMIT = 32767;

const Panel = ({ children, color = C.ink, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) => (
  <div style={{ border: `2px solid ${color}`, background: '#fbfbf9', padding: '18px 24px', ...style }}>{children}</div>
);

const Scene = ({ t, from, to, children, style }: { t: number; from: number; to: number; children: React.ReactNode; style?: React.CSSProperties }) =>
  t < from - 0.1 || t > to + 0.1 ? null : (
    <AbsoluteFill style={{ opacity: fade(t, from, to), justifyContent: 'center', padding: '96px 96px 72px', ...style }}>{children}</AbsoluteFill>
  );

/** A status lamp card for one SRI. */
const SriCard = ({ name, role, failed, appear = 1 }: { name: string; role: string; failed: boolean; appear?: number }) => (
  <Panel color={failed ? C.red : C.ink} style={{ flex: 1, opacity: appear }}>
    <div style={{ font: `500 20px ${mono}`, color: C.muted }}>Inertial reference system</div>
    <div style={{ font: `600 40px ${display}`, margin: '6px 0 10px' }}>{name} · {role}</div>
    <div style={{ font: `600 22px ${mono}`, color: failed ? C.red : C.green }}>{failed ? '■ Operand error · shut down' : '● Nominal'}</div>
  </Panel>
);

/** BH against the int16 limit, drawn from simulation samples up to `until` (seconds from H0). */
const BhChart = ({ flights, until, width = 1000, height = 330 }: { flights: { result: FlightResult; color: string; label: string }[]; until: number; width?: number; height?: number }) => {
  const t0 = -3;
  const t1 = 40;
  const yMax = LIMIT * 1.35;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * width;
  const y = (v: number) => height - (Math.min(v, yMax) / yMax) * height;
  return (
    <svg width={width} height={height + 34} style={{ overflow: 'visible' }}>
      <rect x={0} y={0} width={width} height={height} fill="#fbfbf9" stroke={C.rule} />
      <line x1={0} x2={width} y1={y(LIMIT)} y2={y(LIMIT)} stroke={C.red} strokeDasharray="8 6" strokeWidth={2} />
      <text x={10} y={y(LIMIT) - 10} fill={C.red} style={{ font: `500 20px ${mono}` }}>int16 limit · 32,767</text>
      <line x1={x(LIFT_OFF)} x2={x(LIFT_OFF)} y1={0} y2={height} stroke={C.ink} strokeDasharray="3 6" opacity={0.4} />
      <text x={x(LIFT_OFF) + 8} y={height - 12} fill={C.muted} style={{ font: `500 18px ${mono}` }}>lift-off</text>
      {flights.map(({ result, color, label }) => {
        const pts = result.samples.filter((s) => s.t <= until && s.t <= t1);
        const last = pts.at(-1);
        return (
          <g key={label}>
            <polyline points={pts.map((s) => `${x(s.t)},${y(s.bh)}`).join(' ')} fill="none" stroke={color} strokeWidth={4} />
            {last && <text x={Math.min(x(last.t) + 10, width - 150)} y={y(last.bh) - 12} fill={color} style={{ font: `600 20px ${mono}` }}>{label}</text>}
          </g>
        );
      })}
      {[0, 10, 20, 30, 40].map((t) => (
        <text key={t} x={x(t)} y={height + 26} fill={C.muted} textAnchor="middle" style={{ font: `500 17px ${mono}` }}>H0+{t}</text>
      ))}
    </svg>
  );
};

/** The launcher drawn in line art, tilted by angle of attack; splits apart once `broken` goes from 0 to 1. */
const Rocket = ({ tilt, broken, color }: { tilt: number; broken: number; color: string }) => {
  const part = (dx: number, rot: number) => `translate(${dx * broken * 50} ${broken * 24}) rotate(${rot * broken} 80 160)`;
  return (
    <svg viewBox="0 -40 160 400" style={{ height: 230, transform: `rotate(${tilt}deg)` }}>
      <g fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round">
        <path transform={part(0, 20)} d="M60 20 Q60 0 80 -10 Q100 0 100 20 V300 H60 Z" />
        <path transform={part(-1, -35)} d="M30 120 L42 95 L54 120 V310 H30 Z" />
        <path transform={part(1, 35)} d="M106 120 L118 95 L130 120 V310 H106 Z" />
      </g>
    </svg>
  );
};

export const Episode = ({ cues, hasAudio }: EpisodeProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;

  // c('05', 3) = when line 3 of section 05 starts. Sections end where the next one starts.
  const c = (section: string, line = 0) => cues.find((q) => q.section === section && q.line === line)?.start ?? 0;
  const next = (section: string) => {
    const later = cues.filter((q) => q.section > section && q.start !== null);
    return later.length ? Math.min(...later.map((q) => q.start!)) - 0.2 : end;
  };
  const pop = (at: number) => spring({ frame: frame - at * fps, fps, config: { damping: 15 } });
  const on = (at: number) => t >= at;
  const portrait = usePortrait();

  // Section 05/06: map narration time to flight time so the chart moves with the voice.
  const flightT = interpolate(
    t,
    [c('05', 3), c('05', 5), c('05', 6), c('05', 6) + 0.8, c('06', 0), c('06', 5)],
    [LIFT_OFF, 36.69, 36.72, 36.8, 36.85, 39.1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const sample = [...A5.samples].reverse().find((s) => s.t <= flightT) ?? A5.samples[0]!;

  return (
    <Stage episode="EP-01">
      {hasAudio && <Audio src={staticFile('audio/ep-01.wav')} />}

      {/* 01 · Cold open: two identical computers, both fail */}
      <Scene t={t} from={0} to={next('01')} style={portrait ? { padding: '120px 40px' } : undefined}>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: 28 }}>
          <SriCard name="SRI 2" role="active" failed={on(c('01', 4))} appear={pop(0.2)} />
          <SriCard name="SRI 1" role="standby" failed={on(c('01', 3))} appear={pop(c('01', 1))} />
        </div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: 24, justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ opacity: pop(c('01', 2)) }}>
            <Label>Ariane 5 · flight 501 · Kourou</Label>
            <div style={{ font: `600 52px ${display}`, marginTop: 8 }}>4 June 1996</div>
          </div>
          <div style={{ textAlign: portrait ? 'left' : 'right' }}>
            <div style={{ font: `600 72px ${mono}`, color: on(c('01', 3)) ? C.red : C.ink, opacity: pop(c('01', 3)) }}>
              H0+{on(c('01', 6)) ? '39' : on(c('01', 4)) ? '36.75' : '36.70'}s
            </div>
            <div style={{ opacity: pop(c('01', 3)) }}>
              <Label color={C.red}>{on(c('01', 6)) ? '■ Vehicle breakup' : on(c('01', 5)) ? '■ Same code · same number' : '■ BH > 32,767 · int16 overflow'}</Label>
            </div>
          </div>
        </div>
      </Scene>

      {/* 02 · Title */}
      <Scene t={t} from={c('02')} to={next('02')}>
        <Label color={C.red}>■ Post-Mortem Lab · Episode 01</Label>
        <div style={{ font: `600 120px ${display}`, lineHeight: 1, margin: '18px 0 22px', opacity: pop(c('02')) }}>Ariane 5</div>
        <div style={{ font: `500 40px ${display}`, color: C.muted, opacity: pop(c('02', 1)) }}>Two computers. One bug. 39 seconds.</div>
        <div style={{ marginTop: 50, opacity: pop(c('02', 2)) }}>
          <Label>Source · Ariane 5 Flight 501 Failure, Report by the Inquiry Board · ESA, 19 July 1996</Label>
        </div>
      </Scene>

      {/* 03 · Borrowed code and the alignment window */}
      <Scene t={t} from={c('03')} to={next('03')}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'stretch', opacity: pop(c('03', 1)) }}>
          <Panel style={{ flex: 1 }}>
            <Label>SRI · inertial reference system</Label>
            <div style={{ font: `500 30px ${display}`, marginTop: 10 }}>Tells the rocket which way it’s pointing</div>
          </Panel>
          <Panel style={{ flex: 1, opacity: pop(c('03', 2)) }}>
            <Label>Software</Label>
            <div style={{ font: `600 30px ${mono}`, marginTop: 10 }}>Ariane 4 SRI <span style={{ color: C.muted }}>≈</span> Ariane 5 SRI</div>
          </Panel>
        </div>
        <div style={{ marginTop: 44, opacity: pop(c('03', 4)) }}>
          <div style={{ font: `600 30px ${mono}` }}>alignment()</div>
          {(() => {
            const W = 1088;
            const x = (s: number) => ((s + 5) / 55) * W;
            return (
              <svg width={W} height={130} style={{ marginTop: 12, overflow: 'visible' }}>
                <line x1={0} x2={W} y1={60} y2={60} stroke={C.rule} strokeWidth={2} />
                <rect x={x(-3)} y={40} width={x(LIFT_OFF) - x(-3)} height={40} fill={C.green} opacity={pop(c('03', 5)) * 0.8} />
                <rect x={x(LIFT_OFF)} y={40} width={(x(47) - x(LIFT_OFF)) * pop(c('03', 6))} height={40} fill={C.red} opacity={0.75} />
                <line x1={x(LIFT_OFF)} x2={x(LIFT_OFF)} y1={20} y2={100} stroke={C.ink} strokeWidth={2} />
                <text x={x(-3)} y={118} style={{ font: `500 18px ${mono}` }} fill={C.muted}>H0−3 flight mode</text>
                <text x={x(LIFT_OFF) + 8} y={22} style={{ font: `500 18px ${mono}` }} fill={C.ink}>lift-off</text>
                <text x={x(47)} y={118} textAnchor="end" style={{ font: `500 18px ${mono}` }} fill={C.muted}>H0+47 · 50 s after flight mode</text>
                <text x={(x(LIFT_OFF) + x(47)) / 2} y={66} textAnchor="middle" style={{ font: `600 20px ${mono}` }} fill="#fff" opacity={pop(c('03', 6))}>
                  still running in flight · no purpose on Ariane 5
                </text>
              </svg>
            );
          })()}
          <div style={{ marginTop: 18, font: `500 26px ${display}`, color: C.muted, opacity: pop(c('03', 8)) }}>Kept anyway, “for commonality reasons”.</div>
        </div>
      </Scene>

      {/* 04 · The number and the seven risky conversions */}
      <Scene t={t} from={c('04')} to={next('04')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: pop(c('04', 2)) }}>
          <Panel><Label>BH · horizontal bias</Label><div style={{ font: `600 40px ${mono}`, marginTop: 6 }}>float64</div></Panel>
          <div style={{ font: `600 48px ${mono}`, color: C.muted }}>→</div>
          <Panel color={C.red}><Label color={C.red}>convert</Label><div style={{ font: `600 40px ${mono}`, marginTop: 6 }}>int16</div></Panel>
          <div style={{ font: `600 52px ${mono}`, color: C.red, opacity: pop(c('04', 3)), marginLeft: 20 }}>max 32,767</div>
        </div>
        <div style={{ marginTop: 50, opacity: pop(c('04', 4)) }}>
          <Label>Conversions flagged as risky</Label>
          <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
            {Array.from({ length: 7 }, (_, i) => {
              const protectedVar = i < 4;
              const shown = protectedVar ? on(c('04', 5)) : on(c('04', 6));
              const isBh = i === 4;
              const color = !shown ? C.rule : protectedVar ? C.green : C.red;
              return (
                <Panel key={i} color={color} style={{ flex: 1, padding: '14px 10px', textAlign: 'center', background: isBh && on(c('04', 7)) ? '#fde8e6' : '#fbfbf9' }}>
                  <div style={{ font: `600 24px ${mono}`, color: shown ? color : C.muted }}>{isBh && on(c('04', 7)) ? 'BH' : `v${i + 1}`}</div>
                  <div style={{ font: `500 15px ${mono}`, color: C.muted, marginTop: 4 }}>{shown ? (protectedVar ? 'protected' : 'unprotected') : '·'}</div>
                </Panel>
              );
            })}
          </div>
          <div style={{ marginTop: 18, font: `500 24px ${mono}`, color: C.muted, opacity: pop(c('04', 6)) }}>Reason: maximum workload target of 80% for the SRI computer</div>
        </div>
        <div style={{ marginTop: 28, font: `500 30px ${display}`, opacity: pop(c('04', 9)) }}>
          “…a reasoning which in the case of the variable BH <span style={{ color: C.red }}>turned out to be faulty</span>.” <span style={{ font: `500 20px ${mono}`, color: C.muted }}>§2.2</span>
        </div>
      </Scene>

      {/* 05 + 06 · Fly it: BH climbs, both SRIs fail, the OBC flies on diagnostic data */}
      <Scene t={t} from={c('05')} to={next('06')} style={{ flexDirection: 'row', alignItems: 'center', gap: 36 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <Label>{on(c('05', 1)) && !on(c('05', 2)) ? 'Horizontal velocity builds 5× faster than Ariane 4' : 'BH in flight · Ariane 5'}</Label>
            <div style={{ font: `600 40px ${mono}`, color: sample.sri1 === 'failed' ? C.red : C.ink }}>H0+{flightT.toFixed(1)}s</div>
          </div>
          <BhChart flights={[{ result: A5, color: sample.sri1 === 'failed' ? C.red : C.green, label: 'Ariane 5' }]} until={flightT} width={760} height={300} />
          <div style={{ marginTop: 18, display: 'flex', gap: 14, opacity: pop(c('05', 7)) }}>
            {['Report the failure', 'Save the context', 'Shut the processor down'].map((s, i) => (
              <Panel key={s} color={i === 2 ? C.red : C.ink} style={{ padding: '10px 14px', font: `500 19px ${mono}` }}>{i + 1}. {s}</Panel>
            ))}
          </div>
        </div>
        <div style={{ width: 300, display: 'grid', gap: 10, justifyItems: 'stretch', alignContent: 'center' }}>
          {(['SRI 2', 'SRI 1'] as const).map((name) => {
            const failed = (name === 'SRI 1' ? sample.sri1 : sample.sri2) === 'failed';
            return (
              <Panel key={name} color={failed ? C.red : C.ink} style={{ padding: '8px 14px' }}>
                <div style={{ font: `600 24px ${mono}` }}>{name}</div>
                <div style={{ font: `500 18px ${mono}`, color: failed ? C.red : C.green }}>{name === 'SRI 2' ? 'active' : 'standby'} · {failed ? 'shut down' : 'ok'}</div>
                {name === 'SRI 1' && on(c('05', 9)) && <div style={{ font: `600 18px ${mono}`, color: C.red, opacity: pop(c('05', 9)) }}>failed 0.05 s earlier</div>}
              </Panel>
            );
          })}
          {on(c('06', 1)) ? (
            <div style={{ display: 'grid', justifyItems: 'center' }}>
              <div style={{ font: `600 20px ${mono}`, color: C.red, letterSpacing: 2 }}>{on(c('06', 2)) ? 'OBC: "attitude error!"' : '1011 0010 0111 0001'}</div>
              <Rocket tilt={Math.min(sample.angleOfAttack * 2.5, 60)} broken={interpolate(flightT, [39, 39.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * pop(c('06', 5))} color={sample.angleOfAttack > 0 ? C.red : C.ink} />
              <div style={{ font: `600 24px ${mono}`, color: C.red }}>AoA {sample.angleOfAttack.toFixed(1)}° / {BREAKUP_ANGLE}°</div>
            </div>
          ) : (
            <div style={{ display: 'grid', justifyItems: 'center' }}><Rocket tilt={0} broken={0} color={C.ink} /></div>
          )}
        </div>
      </Scene>

      {/* 07 · Ariane 4 flies */}
      <Scene t={t} from={c('07')} to={next('07')}>
        <Label>Same code, both trajectories</Label>
        <div style={{ marginTop: 16 }}>
          <BhChart
            flights={[
              { result: A5, color: C.red, label: 'Ariane 5' },
              ...(on(c('07', 1)) ? [{ result: A4, color: C.green, label: 'Ariane 4 · flies' }] : []),
            ]}
            until={on(c('07', 1)) ? interpolate(t, [c('07', 1), c('07', 2)], [-3, 40], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 40}
            width={1088}
            height={300}
          />
        </div>
        <div style={{ marginTop: 22, font: `500 26px ${display}`, color: C.muted, opacity: pop(c('07', 4)) }}>
          Ariane 5 trajectory data was not in the SRI specification, and the SRI was never tested with it.
        </div>
      </Scene>

      {/* 08 · Three fixes */}
      <Scene t={t} from={c('08')} to={next('08')}>
        <Label color={C.red}>■ Fix it · any one is enough</Label>
        <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
          {[
            { at: c('08', 1), name: 'Protect the conversion', how: 'toIntSaturating(BH)', src: 'like the other four' },
            { at: c('08', 3), name: 'Alignment off at lift-off', how: 'if (t >= liftOff) return', src: 'Board recommendation R1' },
            { at: c('08', 5), name: 'Best-effort data', how: 'catch → keep flying', src: 'Board recommendation R3' },
          ].map((f) => (
            <Panel key={f.name} color={on(f.at) ? C.green : C.rule} style={{ flex: 1, opacity: on(f.at) ? 1 : 0.35 }}>
              <div style={{ font: `600 30px ${display}` }}>{f.name}</div>
              <div style={{ font: `500 20px ${mono}`, marginTop: 12 }}>{f.how}</div>
              <div style={{ font: `500 18px ${mono}`, color: C.muted, marginTop: 8 }}>{f.src}</div>
              <div style={{ font: `600 20px ${mono}`, color: C.green, marginTop: 14, opacity: pop(c('08', 7)) }}>✓ nominal flight</div>
            </Panel>
          ))}
        </div>
        <Panel style={{ marginTop: 28, background: C.ink, borderColor: C.ink, color: C.bg, font: `500 22px/1.7 ${mono}`, opacity: pop(c('08', 8)) }}>
          <div><span style={{ color: '#8a938c' }}>$</span> npm test</div>
          <div style={{ color: '#3ddc97' }}>✓ incidents/01-ariane-5/src/flight.test.ts (11 tests)</div>
        </Panel>
      </Scene>

      {/* 09 · Lesson and close */}
      <Scene t={t} from={c('09')} to={c('09', 7) - 0.1}>
        <Label color={C.red}>■ The lesson</Label>
        <div style={{ font: `600 54px/1.15 ${display}`, marginTop: 18, opacity: pop(c('09', 1)) }}>
          A backup running the same code on the same inputs protects you from hardware faults.
        </div>
        <div style={{ font: `600 54px ${display}`, color: C.red, marginTop: 14, opacity: pop(c('09', 2)) }}>Not from your own bugs.</div>
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 24, opacity: pop(c('09', 4)) }}>
          <div style={{ font: `500 26px ${mono}`, whiteSpace: 'nowrap' }}>Fly it: <span style={{ color: C.red }}>paramlab.dev/play/ariane-5</span></div>
          <div style={{ opacity: pop(c('09', 6)) }}><Label>Next · EP-02 · Mars Climate Orbiter</Label></div>
        </div>
      </Scene>
      <Scene t={t} from={c('09', 7)} to={end + 1} style={{ alignItems: 'center' }}>
        <div style={{ font: `600 104px ${display}`, color: C.red, transform: `scale(${pop(c('09', 7))})` }}>Go break something.</div>
        <div style={{ marginTop: 24 }}><Label>paramlab.dev</Label></div>
      </Scene>
    </Stage>
  );
};
