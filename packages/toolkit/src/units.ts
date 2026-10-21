/**
 * Quantities that carry their unit, so a number can't silently change meaning on its way from one program to another.
 *
 * Only impulse (force × time) for now, the quantity Mars Climate Orbiter got wrong.
 */

export type ImpulseUnit = 'N·s' | 'lbf·s';

/** One pound-force in newtons. Exact by definition (0.45359237 kg × 9.80665 m/s²). */
export const NEWTONS_PER_POUND_FORCE = 4.4482216152605;

export interface Impulse {
  value: number;
  unit: ImpulseUnit;
}

export const impulse = (value: number, unit: ImpulseUnit): Impulse => ({ value, unit });

export function toNewtonSeconds({ value, unit }: Impulse): number {
  return unit === 'N·s' ? value : value * NEWTONS_PER_POUND_FORCE;
}

/** Thrown when data arrives in a different unit from the one an interface promised. */
export class UnitError extends TypeError {
  readonly got: ImpulseUnit;
  readonly expected: ImpulseUnit;

  constructor(got: ImpulseUnit, expected: ImpulseUnit) {
    super(`Unit Error: got ${got}, the interface specifies ${expected}`);
    this.name = 'UnitError';
    this.got = got;
    this.expected = expected;
  }
}

/** Read a value at an interface that specifies `expected` units. Refuse anything else instead of guessing. */
export function expectUnit(i: Impulse, expected: ImpulseUnit): number {
  if (i.unit !== expected) throw new UnitError(i.unit, expected);
  return i.value;
}
