# 01: Ariane 5, Flight 501 (1996)

> On 4 June 1996, Europe’s new Ariane 5 broke up 39 seconds after main engine ignition on its first flight. Both
> inertial reference computers shut down after the same unprotected 64-bit float to 16-bit integer conversion
> overflowed.

**Status:** simulation and tests done (`src/flight.ts`, `src/flight.test.ts`). Facts verified against the inquiry
board report; section numbers below refer to it.

## Timeline

Times are from H0, main engine ignition (report §1.1). Lift-off was about 7 s later (§3.1 e: H0 + 36.7 s was
"approx. 30 seconds after lift-off").

| Time | Event | Source |
|---|---|---|
| H0 − 3 s | Flight mode starts in both SRIs; the alignment function will run for another 50 s | §2.1 |
| H0 ≈ 09:33:59 local | Vulcain ignition, then lift-off; nominal flight | §1.1 |
| H0 + 36.7 s | Backup SRI 1 raises Operand Error converting BH and shuts down | §2.1, §3.1 e |
| ≈ 0.05 s later | Active SRI 2 fails the same way, one 72 ms data cycle later | §2.1, §3.1 f |
| just after | OBC reads SRI 2’s diagnostic bit pattern as flight data; commands full deflection of the booster nozzles, then the Vulcain nozzle | §2.1, §3.1 g–h |
| H0 + 39 s | Angle of attack above 20°; boosters separate; self-destruct at about 4 km altitude | §2.1, §3.1 i–j |

## The mechanism

1. **Reused code.** The inertial reference system (SRI) and its software were practically the same as Ariane 4’s
   (§2.1).
2. **Code that should not have been running.** The alignment function only produces useful results before lift-off,
   yet ran for about 40 s of flight. That 50 s window was an Ariane 4 requirement, kept on Ariane 5 for commonality
   (§2.1, §2.2, §3.1 m).
3. **An unprotected conversion.** Seven float-to-integer conversions were found to be at risk of Operand Error. Four
   were protected; three, including the horizontal bias BH, were not, under a maximum workload target of 80% for the
   SRI computer. The reasoning that BH was physically limited “turned out to be faulty” (§2.2).
4. **A different trajectory.** Ariane 5 builds horizontal velocity five times faster than Ariane 4, so BH grew past
   what a 16-bit signed integer holds (§2.1, §3.1 p). Ariane 5 trajectory data was not in the SRI specification, and
   no test exercised the SRI with it (§2.2, §2.3, §3.1 r).
5. **Shutdown on any exception.** The specification said to report the failure, store the context and stop the
   processor. That suits random hardware faults, where the backup takes over. Here both SRIs ran the same software on
   the same data, so both stopped (§2.2).
6. **Diagnostic data read as flight data.** The OBC used SRI 2’s diagnostic output as attitude data and steered hard
   for a deviation that had not happened (§2.1, §3.1 g–h).

## What we simulate

`fly(launcher, fixes)` runs H0 − 3 s to H0 + 45 s in 72 ms cycles: two SRIs on the toolkit’s `HotStandby`, the
alignment function with the checked int16 conversion from `numeric.ts`, the OBC, and the angle of attack.

**Simplifications** (the real numbers are in the board’s restricted technical report):

- BH is modelled as proportional to the square of time since lift-off, calibrated to cross 32,767 at H0 + 36.7 s.
  Ariane 4 builds up five times more slowly, as the report states. Our BH values are illustrative, not flight data.
- Lift-off at H0 + 7 s; the SRI cycle offset and the attitude response are tuned to reproduce the report’s timings.

## The fixes (each tested)

| Fix | Report | Test |
|---|---|---|
| Switch alignment off at lift-off | R1 | `R1: switching the alignment off…` |
| Protect the BH conversion like the other four | §2.2 | `protecting the conversion…` |
| Keep sending best-effort data instead of stopping | R3 | `R3: handling the exception…` |
| Test with the real trajectory | R2 | The whole `flight.test.ts`: it flies Ariane 5’s trajectory through the SRI code |

## Sources

1. ARIANE 5 Flight 501 Failure, Report by the Inquiry Board (chair: Prof. J. L. Lions), Paris, 19 July 1996.
   https://esamultimedia.esa.int/docs/esa-x-1819eng.pdf (primary source for everything above)
2. Jézéquel & Meyer, “Design by Contract: The Lessons of Ariane”, IEEE Computer, 1997
3. Nuseibeh, “Ariane 5: Who Dunnit?”, IEEE Software, 1997

## Not in the report (do not state as fact)

- The cost of the loss. Widely quoted figures (for example “$370 million”) need a separate citable source.
