# 02: Mars Climate Orbiter (1999)

> NASA lost Mars Climate Orbiter on arrival at Mars because ground software reported thruster pushes in pound-force
> seconds while navigation read them as newton-seconds. Nine months of under-counted pushes put the spacecraft about
> 170 km lower than planned.

**Status:** simulation and tests done (`src/cruise.ts`, `src/cruise.test.ts`). Facts verified against the Mishap
Investigation Board's Phase I report (10 November 1999); page numbers refer to that report.

## Timeline

| Date (UTC) | Event | Source |
|---|---|---|
| 11 Dec 1998 | Launch | p. 6, 13 |
| Jan–Apr 1999 | Ground AMD files unusable (format errors); navigation models firings from emailed timings | p. 17–18 |
| Apr 1999 | Within a week of using the files, navigation sees the firings' effects are under-estimated; concerns raised only informally | p. 13, 18 |
| 15 Sep 1999 | Last planned correction (TCM-4) aims for a first closest approach of 226 km | p. 13 |
| week before arrival | Estimates fall to 150–170 km | p. 13 |
| ~1 h before | Better tracking data: as low as 110 km. Minimum survivable: 80 km | p. 13 |
| 23 Sep 1999, 09:00:46 | Orbit insertion engine burn starts | p. 13 |
| 09:04:52 | Signal lost behind Mars, 49 s earlier than predicted; never regained | p. 6, 13 |
| 29 Sep 1999 | Discovery: the small-forces impulses were low by a factor of 4.45 (lbf·s vs N·s) | p. 14 |
| afterwards | Reconstruction: first closest approach about 57 km | p. 14 |

## The mechanism

1. **Small pushes.** Solar pressure slowly spun up the spacecraft's reaction wheels. To unload them, it fired small
   thrusters: an *angular momentum desaturation* (AMD) (p. 17).
2. **A file between two teams.** Ground software, SM_FORCES, wrote each push's size (the *impulse bit*) to the AMD
   file. The Software Interface Specification required newton-seconds. SM_FORCES wrote pound-force seconds (p. 16–17).
3. **The reader assumed.** Navigation used the numbers as newton-seconds, so every push counted at 1/4.45 of its real
   size (p. 16–17). The spacecraft's own onboard software used metric correctly; only the ground software was wrong
   (p. 17).
4. **More pushes than expected.** The lopsided solar array made these firings happen 10–14 times more often than the
   navigation team expected (p. 6).
5. **Hard to see from Earth.** The pushes were mostly at right angles to the line of sight, so Doppler tracking could
   barely see them, and the error stayed hidden (p. 18).
6. **Warnings not acted on.** Discrepancies were noticed from April but reported informally; the emergency correction
   TCM-5 was discussed but never performed (p. 13, 19).

## What we simulate

`cruise(options)` runs the 286 days from launch to arrival: firings, the file written by SM_FORCES, navigation reading
it, and where the spacecraft really ends up.

**Simplifications:** the impulse per firing, the firing rate and how unmodelled impulse turns into lost altitude are
illustrative. Altitude loss is proportional to total unmodelled impulse, calibrated so the as-flown run reaches 57 km.
"As expected" firings are 12× rarer (inside the report's 10–14×).

## The fixes (each tested)

| Fix | Test |
|---|---|
| Write newton-seconds, as the interface specified | `writing newton-seconds… arrives at 226 km` |
| Check the unit at the interface instead of assuming (toolkit `expectUnit`) | `checking the unit at the interface…` |
| (Not a fix, a lesson) with firings as rare as expected, the same bug is survivable | `survives: frequent firings…` |

## Sources

1. Mars Climate Orbiter Mishap Investigation Board, Phase I Report, NASA, 10 November 1999.
   https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf (primary source)
2. NASA press release, 10 November 1999. https://nssdc.gsfc.nasa.gov/planetary/text/mco_pr_19991110.txt

## Not in the report (do not state as fact)

- The cost of the mission. Widely quoted figures ($125M, $327M) need a separate citable source.
