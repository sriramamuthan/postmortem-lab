# 01: Ariane 5, Flight 501 (1996)

> On its first flight, Europe’s Ariane 5 broke up about 37 seconds after launch. A 64-bit floating-point value was
> converted to a 16-bit signed integer and overflowed in both inertial reference computers.

**Status:** research. The facts below come from the inquiry board report summary and must be verified against the full
report before we build.

## Key facts to verify

- [ ] Launch 4 June 1996, Kourou; breakup about H0 + 37–39 s
- [ ] The failing software was in the Inertial Reference System (SRI), reused from Ariane 4
- [ ] The overflowing variable was the horizontal bias (BH), converted from 64-bit float to 16-bit signed integer
- [ ] Of seven variables at risk, only four were protected; BH was left unprotected (a CPU-load decision)
- [ ] The alignment function that failed served no purpose after lift-off, yet kept running for about 40 s by design
- [ ] The backup SRI failed first (about 72 ms earlier) with the identical error, so redundancy didn’t help
- [ ] The primary SRI’s diagnostic output was read by the flight computer as flight data, causing full nozzle
      deflection
- [ ] Ariane 5’s higher horizontal velocity early in flight drove BH beyond Ariane 4’s envelope
- [ ] The Ariane 4 trajectory data wasn’t updated for Ariane 5, so the overflow was never tested

## What we’ll simulate

1. **The SRI:** a fake flight-trajectory feed, the alignment code, and the checked int16 conversion from the toolkit
2. **Redundancy:** two identical SRIs running the same code on the same inputs (common-mode failure)
3. **The flight computer:** misreading diagnostic data as attitude data
4. **Ariane 4 vs Ariane 5 trajectories:** the same code, one flies and one doesn’t
5. **The fixes,** each tested: protect the conversion, saturate, stop alignment after lift-off, and test against the
   real trajectory

## Sources

1. ARIANE 5 Flight 501 Failure, Report by the Inquiry Board (chair: Prof. J. L. Lions), 19 July 1996. Primary source.
2. Jézéquel & Meyer, “Design by Contract: The Lessons of Ariane”, IEEE Computer, 1997
3. Nuseibeh, “Ariane 5: Who Dunnit?”, IEEE Software, 1997
