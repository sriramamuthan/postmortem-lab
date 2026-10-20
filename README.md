# Post-Mortem Lab

**Break it yourself.** History’s most expensive engineering failures, rebuilt as small simulations you can run, break
and fix.

Each episode takes one real incident and ships:

- **A faithful simulation** of the system and the exact mechanism that failed
- **The bug**, reproducible on demand
- **The fix**, with tests proving the bug happens without it and doesn’t with it
- **An interactive demo** embedded in the write-up at [paramlab.dev/lab](https://paramlab.dev/lab/)
- **A video** walking through all of it

Every episode is a git tag (`ep-01`, `ep-02`, …), so you can check out exactly what you saw.

## Season 1

| Ep | Incident | Year | Concept |
|---|---|---|---|
| 01 | [Ariane 5](incidents/01-ariane-5) | 1996 | Integer overflow, reused code, unchecked assumptions |
| 02 | Mars Climate Orbiter | 1999 | Units at system boundaries |
| 03 | Patriot missile, Dhahran | 1991 | Floating-point error that grows over time |
| 04 | Therac-25 | 1985–87 | Race conditions, removing hardware safety interlocks |
| 05 | Knight Capital | 2012 | Dead code, feature flags, partial deploys |
| 06 | Cloudflare outage | 2019 | Catastrophic regex backtracking |
| 07 | CrowdStrike | 2024 | Unvalidated config input, kernel-level blast radius |
| 08 | Viewers’ choice | — | — |

## Layout

```
packages/toolkit/     Shared primitives for safely causing failures
incidents/NN-name/    One folder per episode: simulation, bug, fix, tests, demo
docs/                 Plan, decisions and build journal
```

## Run it

```sh
npm install
npm test
```

Requires Node 22+.

## Sources and respect

Every incident links the official investigation reports it is based on. Several of these failures cost lives. They are
rebuilt to learn from them, never to make light of them.

## License

MIT
