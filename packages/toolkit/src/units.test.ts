import { describe, expect, it } from 'vitest';
import { NEWTONS_PER_POUND_FORCE, UnitError, expectUnit, impulse, toNewtonSeconds } from './units.ts';

describe('impulse units', () => {
  it('knows one pound-force second is about 4.45 newton-seconds', () => {
    expect(toNewtonSeconds(impulse(1, 'lbf·s'))).toBeCloseTo(4.45, 2);
    expect(NEWTONS_PER_POUND_FORCE).toBe(4.4482216152605);
  });

  it('leaves newton-seconds alone', () => {
    expect(toNewtonSeconds(impulse(2.5, 'N·s'))).toBe(2.5);
  });
});

describe('expectUnit', () => {
  it('passes values in the promised unit through', () => {
    expect(expectUnit(impulse(3, 'N·s'), 'N·s')).toBe(3);
  });

  it('refuses a value in another unit instead of guessing', () => {
    expect(() => expectUnit(impulse(3, 'lbf·s'), 'N·s')).toThrow(UnitError);
  });
});
