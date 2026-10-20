import { Composition } from 'remotion';
import { ColdOpen } from './ep-00/ColdOpen';

// Each episode registers a 16:9 version for YouTube and a 9:16 version for Shorts from the same scenes.
export const Root = () => (
  <>
    <Composition id="ep-00-cold-open" component={ColdOpen} durationInFrames={30 * 45} fps={30} width={1280} height={720} />
    <Composition id="ep-00-short" component={ColdOpen} durationInFrames={30 * 45} fps={30} width={1080} height={1920} />
  </>
);
