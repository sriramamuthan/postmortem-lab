import { describe, expect, it } from 'vitest';
import { HotStandby, type Unit } from './redundancy.ts';

const unit = (name: string) => {
  let ok = true;
  return { name, healthy: () => ok, output: () => (ok ? `${name}: data` : `${name}: diagnostic`), fail: () => (ok = false) } satisfies Unit<string> & { fail(): void };
};

describe('HotStandby', () => {
  it('reads the active unit while it is healthy', () => {
    const a = unit('A');
    const pair = new HotStandby(a, unit('B'));
    expect(pair.read()).toMatchObject({ value: 'A: data', switched: false, degraded: false });
  });

  it('switches to the standby when the active unit fails (a random fault)', () => {
    const a = unit('A');
    const pair = new HotStandby(a, unit('B'));
    a.fail();
    expect(pair.read()).toMatchObject({ value: 'B: data', switched: true, degraded: false });
  });

  it('has nowhere to go when both fail (a shared fault) and returns the failed unit’s output', () => {
    const a = unit('A');
    const b = unit('B');
    const pair = new HotStandby(a, b);
    b.fail();
    a.fail();
    expect(pair.read()).toMatchObject({ value: 'A: diagnostic', switched: false, degraded: true });
  });
});
