import { describe, expect, it } from 'vitest';
import { ARIANE_4, ARIANE_5, fly, horizontalBias } from './flight.ts';

const firstEvent = (r: ReturnType<typeof fly>, source: string) => r.events.find((e) => e.source === source);

describe('Ariane 5 flight 501 as flown', () => {
  const flight = fly(ARIANE_5);

  it('is lost', () => {
    expect(flight.outcome).toBe('lost');
  });

  it('loses the backup SRI 1 first, at H0 + 36.7 s', () => {
    const sri1 = firstEvent(flight, 'SRI 1')!;
    expect(sri1.t).toBeCloseTo(36.7, 1);
    expect(sri1.message).toMatch(/Operand Error/);
  });

  it('loses the active SRI 2 about 0.05 s later, in the next data cycle, for the same reason', () => {
    const sri1 = firstEvent(flight, 'SRI 1')!;
    const sri2 = firstEvent(flight, 'SRI 2')!;
    expect(sri2.t - sri1.t).toBeCloseTo(0.05, 2);
    expect(sri2.message).toMatch(/Operand Error/);
  });

  it('never switches: redundancy cannot help when both units share the fault', () => {
    expect(flight.events.some((e) => e.message.startsWith('Active SRI failed; switched'))).toBe(false);
  });

  it('reads diagnostic data as flight data and commands full nozzle deflection', () => {
    expect(flight.events.some((e) => /error report as if it were directions/.test(e.message))).toBe(true);
    expect(flight.samples.at(-1)!.boosters).toBe(1);
  });

  it('breaks up at about H0 + 39 s', () => {
    expect(flight.breakupAt).toBeCloseTo(39, 0);
  });
});

describe('the same software on Ariane 4', () => {
  it('flies, because BH stays well inside int16 for the whole alignment window', () => {
    const flight = fly(ARIANE_4);
    expect(flight.outcome).toBe('nominal');
    expect(Math.max(...flight.samples.map((s) => s.bh))).toBeLessThan(32767 / 2);
  });

  it('builds horizontal velocity five times more slowly than Ariane 5', () => {
    expect(horizontalBias(30, ARIANE_5) / horizontalBias(30, ARIANE_4)).toBe(5);
  });
});

describe('the fixes, each enough on its own', () => {
  it('R1: switching the alignment off at lift-off means BH is never computed in flight', () => {
    const flight = fly(ARIANE_5, { stopAlignmentAtLiftOff: true });
    expect(flight.outcome).toBe('nominal');
    expect(flight.samples.filter((s) => s.t > 7).every((s) => s.bh === 0)).toBe(true);
  });

  it('protecting the conversion, like the other four variables, keeps both SRIs running', () => {
    const flight = fly(ARIANE_5, { protectConversion: true });
    expect(flight.outcome).toBe('nominal');
    expect(flight.samples.at(-1)).toMatchObject({ sri1: 'ok', sri2: 'ok' });
  });

  it('R3: handling the exception and sending best-effort data keeps the launcher flying', () => {
    const flight = fly(ARIANE_5, { bestEffortData: true });
    expect(flight.outcome).toBe('nominal');
    expect(flight.events.filter((e) => /handled/.test(e.message))).toHaveLength(2);
  });
});
