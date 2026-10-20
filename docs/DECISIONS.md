# Decisions

Short records of choices we made and why. Newest first.

## 2026-10-20: Initial setup

- **Name:** Post-Mortem Lab, tagline “Break it yourself.” It lives at `sriramamuthan.dev/lab` rather than its own
  domain, because the personal site outlives any one project.
- **Two repos:** `postmortem-lab` (code) and `sriramamuthan.dev` (site). The site also hosts a second series,
  *Show Me Why* (science and maths explainers), so it shouldn’t live inside this repo.
- **Stack:** TypeScript (strict) and Vitest. It runs in the browser for demos and in Node for tests with no
  translation. WASM only if a simulation needs it.
- **Video:** screen recording plus voiceover from an ElevenLabs clone of my own voice, disclosed in every video.
- **Cadence:** weekly. Hours aren’t the constraint with AI-assisted building; accuracy and polish are.
- **Toolkit conversions follow Ada semantics** (round to nearest, halves away from zero) because Ariane 5’s software
  was written in Ada.
