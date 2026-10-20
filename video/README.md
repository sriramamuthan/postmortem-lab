# Episode videos

Every episode video is code: [Remotion](https://www.remotion.dev) scenes in the paramlab.dev look, timed to the
narration. One set of scenes renders both the 16:9 YouTube version and the 9:16 Short.

## Make an episode video

1. Export the narration from ElevenLabs and convert it to WAV:
   `afconvert -f WAVE -d LEI16 ep-01.mp3 public/audio/ep-01.wav`
2. Find the pauses: `python3 scripts/cues.py public/audio/ep-01.wav`. Each pause end is where the next line starts.
3. Map script lines to those times in the episode's `CUE` object, and build the scenes in `src/ep-NN/`.
4. Preview with `npm run studio`, then render:
   `npm run render -- ep-01 out/ep-01.mp4` and `npm run render -- ep-01-short out/ep-01-short.mp4`.

Then copy `out/ep-NN.mp4` and a poster still to `paramlab.dev/public/video/` and set `video` and `poster` in the
post's frontmatter.

Audio files stay out of git (`public/audio/` is ignored); the published narration lives in the paramlab.dev repo.

Shared palette, fonts and building blocks are in `src/kit.tsx`. Fonts: Space Grotesk and JetBrains Mono (SIL Open Font
License).

Remotion is free for individuals and companies of up to three people; check its license before that changes.
