import { Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CRUISE_DAYS, PLANNED_ALTITUDE, SURVIVABLE_ALTITUDE, cruise } from '../../../incidents/02-mars-climate-orbiter/src/cruise';
import { C, cueTimes, display, Label, mono, Panel, Scene, Stage, usePortrait, type EpisodeProps } from '../kit';

// The real simulation drives the approach diagram.
const FLOWN = cruise();
const LAUNCH = Date.UTC(1998, 11, 11);
const dateOf = (day: number) =>
  new Date(LAUNCH + day * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Mars from above the surface: the planned pass (dashed), the real pass, the 80 km line, and the spacecraft. */
const Approach = ({ altitude, craft, width = 760, height = 400 }: { altitude: number; craft: number; width?: number; height?: number }) => {
  const surface = height - 70;
  const y = (km: number) => surface - km * 1.1;
  const pass = (km: number) => `M 0 16 Q ${width / 2} ${2 * y(km) - 16} ${width} 16`;
  const t = craft; // 0..1 along the real pass
  const cy = (1 - t) * (1 - t) * 16 + 2 * (1 - t) * t * (2 * y(altitude) - 16) + t * t * 16;
  const low = altitude < SURVIVABLE_ALTITUDE;
  return (
    <svg width={width} height={height}>
      <rect x={0} y={y(SURVIVABLE_ALTITUDE)} width={width} height={height} fill={C.red} opacity={0.12} />
      <path d={`M -80 ${height} Q ${width / 2} ${surface - (height - surface) + 70} ${width + 80} ${height} Z`} fill="#d9825b" />
      <line x1={0} x2={width} y1={y(SURVIVABLE_ALTITUDE)} y2={y(SURVIVABLE_ALTITUDE)} stroke={C.red} strokeDasharray="8 6" strokeWidth={2} />
      <text x={10} y={y(SURVIVABLE_ALTITUDE) - 10} fill={C.red} style={{ font: `500 19px ${mono}` }}>80 km · lowest it can survive</text>
      <path d={pass(PLANNED_ALTITUDE)} fill="none" stroke={C.muted} strokeDasharray="10 8" strokeWidth={2.5} />
      <text x={width - 10} y={y(PLANNED_ALTITUDE) - 12} textAnchor="end" fill={C.muted} style={{ font: `500 19px ${mono}` }}>navigation expects 226 km</text>
      <path d={pass(altitude)} fill="none" stroke={low ? C.red : C.green} strokeWidth={4} />
      <circle cx={t * width} cy={cy} r={8} fill={C.ink} />
    </svg>
  );
};

export const Episode = ({ cues, hasAudio }: EpisodeProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const { c, next } = cueTimes(cues, end);
  const pop = (at: number) => spring({ frame: frame - at * fps, fps, config: { damping: 15 } });
  const on = (at: number) => t >= at;
  const portrait = usePortrait();

  // Section 04: the cruise plays out while the narration says it adds up "for nine months".
  const day = Math.round(interpolate(t, [c('04', 1), c('04', 3)], [1, CRUISE_DAYS], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const altitude = FLOWN.days[day - 1]!.actualAltitude;

  return (
    <Stage episode="EP-02">
      {hasAudio && <Audio src={staticFile('audio/ep-02.wav')} />}

      {/* 01 · Cold open: arrival, behind Mars, silence */}
      <Scene t={t} from={0} to={next('01')} style={portrait ? { padding: '120px 40px' } : undefined}>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: 20, justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <div style={{ opacity: pop(0.2) }}>
            <Label>Mars Climate Orbiter · NASA</Label>
            <div style={{ font: `600 48px ${display}`, marginTop: 8 }}>23 September 1999</div>
          </div>
          <div style={{ textAlign: portrait ? 'left' : 'right', opacity: pop(c('01', 2)) }}>
            <div style={{ font: `600 44px ${mono}`, color: on(c('01', 3)) ? C.red : C.ink }}>{on(c('01', 3)) ? 'NO SIGNAL' : '09:04:52 UTC'}</div>
            <Label color={C.red}>{on(c('01', 3)) ? '■ never heard from again' : '■ behind Mars · 49 s early'}</Label>
          </div>
        </div>
        <Approach altitude={PLANNED_ALTITUDE} craft={interpolate(t, [c('01', 1), c('01', 2)], [0.15, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} width={portrait ? 640 : 1088} height={portrait ? 380 : 380} />
      </Scene>

      {/* 02 · Title */}
      <Scene t={t} from={c('02')} to={next('02')}>
        <Label color={C.red}>■ Post-Mortem Lab · Episode 02</Label>
        <div style={{ font: `600 100px ${display}`, lineHeight: 1, margin: '18px 0 22px', opacity: pop(c('02')) }}>Mars Climate Orbiter</div>
        <div style={{ font: `500 40px ${display}`, color: C.muted, opacity: pop(c('02', 1)) }}>One number. Two units.</div>
        <div style={{ marginTop: 50, opacity: pop(c('02', 1)) }}>
          <Label>Source · Mars Climate Orbiter Mishap Investigation Board, Phase I Report · NASA, 1999</Label>
        </div>
      </Scene>

      {/* 03 · The file between two programs */}
      <Scene t={t} from={c('03')} to={next('03')} style={portrait ? { padding: '110px 40px' } : undefined}>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: portrait ? 'stretch' : 'center', gap: portrait ? 10 : 22, opacity: pop(c('03', 1)) }}>
          <Panel style={{ flex: 1 }}>
            <Label>On the ground</Label>
            <div style={{ font: `600 30px ${display}`, marginTop: 8 }}>Thruster software</div>
            <div style={{ font: `500 18px ${mono}`, color: C.muted, marginTop: 4 }}>SM_FORCES</div>
          </Panel>
          <div style={{ font: `600 40px ${mono}`, color: C.muted, textAlign: 'center' }}>{portrait ? '↓' : '→'}</div>
          <Panel color={on(c('03', 3)) ? C.red : C.ink} style={{ flex: 1.1 }}>
            <Label>The file · each nudge</Label>
            <div style={{ font: `600 34px ${mono}`, marginTop: 8 }}>
              0.20 <span style={{ color: on(c('03', 3)) ? C.red : C.ink }}>{on(c('03', 3)) ? 'lbf·s' : 'N·s ?'}</span>
            </div>
          </Panel>
          <div style={{ font: `600 40px ${mono}`, color: C.muted, textAlign: 'center' }}>{portrait ? '↓' : '→'}</div>
          <Panel style={{ flex: 1 }}>
            <Label>Navigation team</Label>
            <div style={{ font: `600 30px ${display}`, marginTop: 8 }}>Reads it as N·s</div>
          </Panel>
        </div>
        <div style={{ marginTop: 30, display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: portrait ? 10 : 22 }}>
          <Panel color={C.green} style={{ flex: 1, opacity: pop(c('03', 2)) }}>
            <Label color={C.green}>The agreement (interface spec)</Label>
            <div style={{ font: `600 30px ${mono}`, marginTop: 8 }}>impulse in newton-seconds</div>
          </Panel>
          <Panel color={C.red} style={{ flex: 1, opacity: pop(c('03', 4)) }}>
            <Label color={C.red}>Conversion</Label>
            <div style={{ font: `600 30px ${mono}`, marginTop: 8 }}>1 lbf·s = 4.45 N·s</div>
          </Panel>
        </div>
        <div style={{ marginTop: 30, opacity: pop(c('03', 5)) }}>
          <Label>Each nudge, as counted</Label>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: portrait ? 480 : 800, height: 28, background: C.ink }} /><span style={{ font: `500 20px ${mono}` }}>real</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: (portrait ? 480 : 800) / 4.45, height: 28, background: C.red }} /><span style={{ font: `500 20px ${mono}`, color: C.red }}>counted · 1/4.45</span>
            </div>
          </div>
        </div>
      </Scene>

      {/* 04 · Nine months of drift, from the simulation */}
      <Scene t={t} from={c('04')} to={next('04')} style={portrait ? { padding: '110px 40px' } : undefined}>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column-reverse' : 'row', gap: 8, justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <Label>{on(c('04', 1)) ? `Day ${day} of ${CRUISE_DAYS} · ${dateOf(day)} · ${FLOWN.days[day - 1]!.firings} nudges` : 'One nudge: almost nothing'}</Label>
          <div style={{ font: `600 40px ${mono}`, color: altitude < SURVIVABLE_ALTITUDE ? C.red : C.ink }}>
            {on(c('04', 3)) ? '57 km' : `${Math.round(on(c('04', 1)) ? altitude : PLANNED_ALTITUDE)} km`}
          </div>
        </div>
        <Approach altitude={on(c('04', 1)) ? altitude : PLANNED_ALTITUDE} craft={0.5} width={portrait ? 640 : 1088} height={400} />
      </Scene>

      {/* 05 · The fix */}
      <Scene t={t} from={c('05')} to={next('05')}>
        <Label color={C.green}>■ The fix · units travel with the number</Label>
        <Panel style={{ marginTop: 22, background: C.ink, borderColor: C.ink, color: C.bg, font: `500 26px/1.7 ${mono}`, opacity: pop(c('05', 1)) }}>
          <div><span style={{ color: '#8a938c' }}>// navigation reads the file</span></div>
          <div>expectUnit(impulse(0.20, <span style={{ color: '#ff6b5e' }}>'lbf·s'</span>), <span style={{ color: '#3ddc97' }}>'N·s'</span>)</div>
          <div style={{ color: '#ff6b5e', opacity: pop(c('05', 1) + 1.5) }}>✗ Unit Error: got lbf·s, the interface specifies N·s</div>
        </Panel>
        <div style={{ marginTop: 28, display: 'flex', gap: 22, opacity: pop(c('05', 2)) }}>
          <Panel color={C.green} style={{ flex: 1 }}>
            <Label color={C.green}>Caught on</Label>
            <div style={{ font: `600 40px ${mono}`, marginTop: 6 }}>day 2</div>
          </Panel>
          <Panel color={C.rule} style={{ flex: 1 }}>
            <Label>not on</Label>
            <div style={{ font: `600 40px ${mono}`, marginTop: 6, color: C.muted }}>day 286</div>
          </Panel>
          <Panel color={C.green} style={{ flex: 1 }}>
            <Label color={C.green}>Arrives at</Label>
            <div style={{ font: `600 40px ${mono}`, marginTop: 6 }}>226 km</div>
          </Panel>
        </div>
      </Scene>

      {/* 06 · Lesson and close */}
      <Scene t={t} from={c('06')} to={c('06', 4) - 0.1}>
        <Label color={C.red}>■ The lesson</Label>
        <div style={{ font: `600 54px/1.15 ${display}`, marginTop: 18, opacity: pop(c('06')) }}>
          A spec that says metric doesn’t make the data metric.
        </div>
        <div style={{ font: `600 54px ${display}`, color: C.red, marginTop: 14, opacity: pop(c('06', 1)) }}>Check at the boundary.</div>
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 24, opacity: pop(c('06', 2)) }}>
          <div style={{ font: `500 26px ${mono}`, whiteSpace: 'nowrap' }}>Fly it: <span style={{ color: C.red }}>paramlab.dev</span></div>
          <div style={{ opacity: pop(c('06', 3)) }}><Label>Next · EP-03 · Patriot missile</Label></div>
        </div>
      </Scene>
      <Scene t={t} from={c('06', 4)} to={end + 1} style={{ alignItems: 'center' }}>
        <div style={{ font: `600 104px ${display}`, color: C.red, transform: `scale(${pop(c('06', 4))})` }}>Go break something.</div>
        <div style={{ marginTop: 24 }}><Label>paramlab.dev</Label></div>
      </Scene>
    </Stage>
  );
};
