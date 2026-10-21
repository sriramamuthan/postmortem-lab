import { Composition, staticFile } from 'remotion';
import { ColdOpen } from './ep-00/ColdOpen';
import { Episode } from './ep-00/Episode';
import { Episode as Episode01, type Cue, type EpisodeProps } from './ep-01/Episode';
import { Episode as Episode02 } from './ep-02/Episode';

// Episode length and scene timing come from the narration's cue file (real or estimated).
const fromCues = (episode: string) => async () => {
  const cues: Cue[] = await fetch(staticFile(`audio/${episode}.cues.json`)).then((r) => r.json());
  const hasAudio = !cues.some((c) => 'estimated' in c);
  const last = Math.max(...cues.map((c) => c.end ?? 0));
  return { props: { cues, hasAudio }, durationInFrames: Math.ceil((last + 2.5) * 30) };
};

// Each episode registers a 16:9 version for YouTube and a 9:16 version for Shorts from the same scenes.
export const Root = () => (
  <>
    <Composition id="ep-00" component={Episode} durationInFrames={Math.ceil(30 * 171.5)} fps={30} width={1280} height={720} />
    <Composition
      id="ep-01"
      component={Episode01}
      defaultProps={{ cues: [], hasAudio: false } as EpisodeProps}
      calculateMetadata={fromCues('ep-01')}
      durationInFrames={30 * 60}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="ep-01-short"
      component={Episode01}
      defaultProps={{ cues: [], hasAudio: false } as EpisodeProps}
      calculateMetadata={async (opts) => {
        // The cold open as a Short: up to just before section 02.
        const meta = await fromCues('ep-01')();
        const intro = meta.props.cues.find((q) => q.section === '02')?.start ?? 25;
        return { ...meta, durationInFrames: Math.ceil((intro - 0.2) * 30) };
      }}
      durationInFrames={30 * 30}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="ep-02"
      component={Episode02}
      defaultProps={{ cues: [], hasAudio: false } as EpisodeProps}
      calculateMetadata={fromCues('ep-02')}
      durationInFrames={30 * 60}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="ep-02-short"
      component={Episode02}
      defaultProps={{ cues: [], hasAudio: false } as EpisodeProps}
      calculateMetadata={async () => {
        // Cold open, the file and the drift: up to just before the fix.
        const meta = await fromCues('ep-02')();
        const fix = meta.props.cues.find((q) => q.section === '05')?.start ?? 55;
        return { ...meta, durationInFrames: Math.ceil((fix - 0.2) * 30) };
      }}
      durationInFrames={30 * 30}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition id="ep-00-cold-open" component={ColdOpen} durationInFrames={30 * 45} fps={30} width={1280} height={720} />
    <Composition id="ep-00-short" component={ColdOpen} durationInFrames={30 * 45} fps={30} width={1080} height={1920} />
  </>
);
