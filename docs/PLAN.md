# Plan

**Current:** Ep 00 (launch) → Ep 01 Ariane 5
**Cadence:** one episode a week. AI-assisted building; the bottleneck is accuracy and polish, not typing.

## Episode loop

| Step | Output | Done when |
|---|---|---|
| 1. Research | `incidents/NN/README.md`: timeline, mechanism, sources | Every fact has a source |
| 2. Build | Simulation, bug, fix, tests | Test fails with bug and passes with fix |
| 3. Demo | Interactive component on the site | Works on phone, light and dark |
| 4. Write | Post in `paramlab.dev/src/content/posts/lab/` | Hook → story → break it → fix → lesson |
| 5. Script | `incidents/NN/SCRIPT.md`, 8–12 minute voiceover | Read aloud under 12 minutes |
| 6. Record | Voice (ElevenLabs clone) + screen (Screen Studio) | Captions checked |
| 7. Ship | Tag `ep-NN`, publish post, YouTube, newsletter | Post links tag; video links post |

## Definition of done (quality bar)

- [ ] Story is accurate and sourced; simplifications called out in the post
- [ ] Bug reproduces deterministically; fix is tested
- [ ] Demo explains the bug without needing the video
- [ ] Post has one "try it yourself" moment and one clear lesson
- [ ] Video has a hook in the first 15 seconds and shows the bug happening
- [ ] Thumbnail, title and description written; AI narration disclosed

## Season 1

| Ep | Incident | Toolkit addition |
|---|---|---|
| 00 | Launch | `numeric`: checked, wrapping and saturating conversions ✅ |
| 01 | Ariane 5 | Redundancy model: primary and backup that share a fault |
| 02 | Mars Climate Orbiter | Unit-tagged quantities |
| 03 | Patriot missile | Fixed-point clocks and drift |
| 04 | Therac-25 | Deterministic scheduler for reproducing races |
| 05 | Knight Capital | Feature flags and partial-deploy simulator |
| 06 | Cloudflare regex | Backtracking regex engine with step counter |
| 07 | CrowdStrike | Config validation and blast-radius model |
| 08 | Viewers’ choice | — |

## Production setup (one-time)

- [x] Domain `paramlab.dev` registered
- [ ] GitHub repos `postmortem-lab` and `paramlab.dev` pushed; Cloudflare Pages connected to the site repo
- [ ] YouTube channel created (name: Post-Mortem Lab, or personal name with Lab as a playlist)
- [ ] ElevenLabs Creator plan; record about 30 minutes of clean audio for a professional voice clone
- [ ] Screen Studio installed
- [ ] Newsletter (Buttondown) and comments (Giscus) wired into the site

## Later ideas

- Video as code: scripted demo footage with Playwright and assembly with Remotion (would make a good episode too)
- Season 2 candidates: Boeing 737 MAX MCAS, Toyota unintended acceleration, Y2K-style date bugs (GPS week rollover),
  Heartbleed, the leap second outages, the 2003 Northeast blackout race condition
