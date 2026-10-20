// Shared look for every episode video: the paramlab.dev lab-bench palette, fonts and small building blocks.
import { AbsoluteFill, interpolate, staticFile, useVideoConfig } from 'remotion';

export const C = { bg: '#f3f4f0', ink: '#0f1311', muted: '#59615b', rule: '#c9cec6', red: '#d92a1c', green: '#0a8a55' };
export const mono = 'JB, monospace';
export const display = 'SG, sans-serif';

const fonts = `@font-face{font-family:SG;src:url(${staticFile('sg.woff2')})}@font-face{font-family:JB;src:url(${staticFile('jb.woff2')})}`;

/** True for 9:16 Shorts; scenes use it to stack instead of sitting side by side. */
export const usePortrait = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/** Opacity for a scene visible from `a` to `b` seconds, with short fades at both ends. */
export const fade = (t: number, a: number, b: number) =>
  interpolate(t, [a, a + 0.3, b - 0.3, b], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const Label = ({ children, color = C.muted }: { children: React.ReactNode; color?: string }) => (
  <div style={{ font: `500 20px ${mono}`, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>{children}</div>
);

/** Text that types itself out from `start` seconds. */
export const Typed = ({ text, t, start, cps = 28 }: { text: string; t: number; start: number; cps?: number }) => (
  <>{text.slice(0, Math.max(0, Math.floor((t - start) * cps)))}</>
);

/** Graph-paper stage with the series header, shared by every scene. */
export const Stage = ({ episode, shake = 0, children }: { episode: string; shake?: number; children: React.ReactNode }) => {
  const portrait = usePortrait();
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        color: C.ink,
        transform: `translateX(${shake}px)`,
        backgroundImage: `linear-gradient(${C.rule}55 1px, transparent 1px), linear-gradient(90deg, ${C.rule}55 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}
    >
      <style>{fonts}</style>
      {/* Shorts are watched on phones: scale the whole scene up instead of laying everything out twice. */}
      <AbsoluteFill style={{ zoom: portrait ? 1.5 : 1 }}>
        <div style={{ position: 'absolute', top: portrait ? 90 : 36, left: portrait ? 32 : 48, right: portrait ? 32 : 48, display: 'flex', justifyContent: 'space-between' }}>
          <Label color={C.red}>■ Post-Mortem Lab · {episode}</Label>
          <Label>paramlab.dev</Label>
        </div>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
