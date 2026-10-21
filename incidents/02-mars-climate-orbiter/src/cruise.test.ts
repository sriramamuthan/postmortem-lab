import { describe, expect, it } from 'vitest';
import { AS_FLOWN_ALTITUDE, cruise, FIRINGS_PER_DAY_EXPECTED, PLANNED_ALTITUDE, SURVIVABLE_ALTITUDE } from './cruise.ts';

describe('Mars Climate Orbiter as flown', () => {
  const flight = cruise();

  it('arrives at about 57 km instead of 226 km, and is lost', () => {
    expect(flight.finalAltitude).toBe(AS_FLOWN_ALTITUDE);
    expect(flight.outcome).toBe('lost');
  });

  it('counts each push at 1/4.45 of its real size', () => {
    const last = flight.days.at(-1)!;
    expect(last.trueImpulse / last.countedImpulse).toBeCloseTo(4.45, 2);
  });

  it('loses altitude gradually, firing by firing, not in one event', () => {
    const quarter = flight.days[Math.floor(flight.days.length / 4)]!;
    expect(quarter.actualAltitude).toBeLessThan(PLANNED_ALTITUDE);
    expect(quarter.actualAltitude).toBeGreaterThan(SURVIVABLE_ALTITUDE);
  });

  it('while navigation still expects 226 km', () => {
    expect(flight.days.every((d) => d.expectedAltitude === PLANNED_ALTITUDE)).toBe(true);
  });
});

describe('the same bug with firings as rare as expected', () => {
  it('survives: frequent firings turned a small error into a fatal one', () => {
    const flight = cruise({ firingsPerDay: FIRINGS_PER_DAY_EXPECTED });
    expect(flight.outcome).toBe('orbit');
    expect(flight.finalAltitude).toBeGreaterThan(200);
  });
});

describe('the fixes', () => {
  it('writing newton-seconds, as the interface specified, arrives at 226 km', () => {
    expect(cruise({ fileUnits: 'N·s' }).finalAltitude).toBe(PLANNED_ALTITUDE);
  });

  it('checking the unit at the interface catches the mismatch on the first file', () => {
    const flight = cruise({ checkUnits: true });
    expect(flight.unitErrorCaught).toMatch(/^Day \d+: Unit Error: got lbf·s/);
    expect(flight.finalAltitude).toBe(PLANNED_ALTITUDE);
    expect(flight.outcome).toBe('orbit');
  });
});
