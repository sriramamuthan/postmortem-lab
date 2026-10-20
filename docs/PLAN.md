# Plan

**Current:** Season 1 build (EP-01 to EP-07), produced as one batch.
**How we work:** build a whole season, then release it on a schedule. AI does the research drafts, code, pages and
video scenes; Ram reviews facts, generates the voice and approves every preview.

## Season pipeline

Each phase runs across all episodes of the season before the next phase starts. "AI sessions" are AI-assisted working
sessions; "Ram" is hands-on time.

| Phase | Output | Done when | AI sessions | Ram |
|---|---|---|---|---|
| 1. Research | `incidents/NN/README.md`: timeline, mechanism, numbers, further reading | Every number traced to an official report | 1–2 | ~1 h review |
| 2. Simulations | Toolkit additions, bug, fix, tests per incident | Test fails with the bug, passes with the fix | 3–5 | ~1 h |
| 3. Demos and posts | Interactive demo + shareable `/play/<incident>/` page + post with further reading | Works at 400px, light and dark | 2–3 | 1–2 h previews |
| 4. Scripts | `incidents/NN/SCRIPT.md` + TTS version | Fact-checked against phase 1, reads under 10 min | 1 | ~1 h edits |
| 5. Voice | ElevenLabs export per episode → `paramlab.dev/public/audio/` | Clean levels (see `video/README.md`) | — | ~20 min each |
| 6. Video | Remotion scenes timed to the voice; 16:9 episode + 9:16 Short | Visuals match every line of the script | 3–5 | ~1 h review |
| 7. Release | Tag `ep-NN`, publish post, upload video and Short | One episode a week from the banked season | — | ~15 min each |

**Season 1 total:** roughly 12–18 AI sessions and 8–10 hours of Ram's time; about 2–3 weeks elapsed at 5 h/week.
Releasing weekly from a finished season keeps the channel steady while Season 2 is built.

## Quality bar (every episode)

- [ ] Every number matches an official report, and the post cites it (see fact-check log below)
- [ ] Simplifications are called out in the post
- [ ] The bug reproduces deterministically; the fix is tested
- [ ] The demo explains the bug without the video, and has a share link
- [ ] Further reading: official report first, then papers, articles and good public videos (links checked)
- [ ] Video: hook in the first 15 seconds; the bug happens on screen; visuals match the narration
- [ ] Ends with the GitHub follow link (no Hacker News or LinkedIn for now)

## Season 1

| Ep | Incident | Toolkit addition | Official source |
|---|---|---|---|
| 00 | Launch | `numeric`: checked, wrapping and saturating conversions ✅ | — |
| 01 | Ariane 5 | Redundancy model: primary and backup that share a fault | ESA Inquiry Board report, 1996 |
| 02 | Mars Climate Orbiter | Unit-tagged quantities | NASA MIB Phase I report, 1999 |
| 03 | Patriot missile | Fixed-point clocks and drift | US GAO IMTEC-92-26, 1992 |
| 04 | Therac-25 | Deterministic scheduler for reproducing races | Leveson & Turner, IEEE Computer, 1993 |
| 05 | Knight Capital | Feature flags and partial-deploy simulator | SEC order 34-70694, 2013 |
| 06 | Cloudflare regex | Backtracking regex engine with step counter | Cloudflare post-mortem, July 2019 |
| 07 | CrowdStrike | Config validation and blast-radius model | CrowdStrike RCA, Aug 2024 |

## Follow-ups

- [ ] **Knight Capital figure.** EP-00 (post, roadmap, audio and video) says $440M; the SEC order says "more than
  $460 million" ($440M was Knight's own estimate the day after). Decide: keep and attribute to Knight, or re-record.
- [ ] **Ariane 5 cost.** EP-00 post says "roughly $370 million"; widely quoted but not in the inquiry report. Find a
  citable source or change to "hundreds of millions" (as the narration already says).

## Fact-check log

| Claim | Where | Status |
|---|---|---|
| Knight Capital lost "$440M in 45 minutes" | EP-00 post, roadmap, EP-00 audio | ⚠️ SEC says "more than $460 million"; $440M was Knight's own estimate the day after. Decide wording. |
| Ariane 5 "roughly $370 million" | EP-00 post | ⚠️ Widely quoted, not in the inquiry report. Find a citable source or soften. |
| Patriot clock drift "a third of a second" | EP-00, roadmap | ✅ GAO: about 0.34 s after 100 hours |
| CrowdStrike "8.5 million computers" | EP-00, roadmap | ✅ Microsoft's estimate, July 2024 (cite it) |
| Overflow display | Demo and video | ✅ Fixed: Ada raised Operand Error; no wrap to −32,768 |

## Production setup (one-time)

- [x] Domain `paramlab.dev` registered
- [x] GitHub repos `postmortem-lab` and `paramlab.dev` pushed
- [x] Site live at https://paramlab.dev (Cloudflare Workers static assets; domains in wrangler.jsonc)
- [x] ElevenLabs voice clone
- [x] Video pipeline: Remotion in `video/` (cue sheet from the audio's pauses → scenes)
- [ ] YouTube channel created
- [x] Range requests for /video and /audio via a small Worker, so playback and seeking work on iPhone

## Later ideas

- Season 2 candidates: Boeing 737 MAX MCAS, Toyota unintended acceleration, GPS week rollover, Heartbleed, the leap
  second outages, the 2003 Northeast blackout race condition
- React to major new outages with a quick breakable rebuild
