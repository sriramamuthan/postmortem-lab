/**
 * Fixed-width integer conversions, in the three flavours real systems use:
 *
 * - checked:    raise an error when the value does not fit (Ada's behaviour, and Ariane 5's)
 * - wrapping:   keep the low bits and silently produce garbage (typical C behaviour)
 * - saturating: clamp to the nearest representable value (a common fix)
 */

export type Bits = 8 | 16 | 32;

export interface IntType {
  bits: Bits;
  signed: boolean;
}

export const INT16: IntType = { bits: 16, signed: true };

/** Thrown when a checked conversion overflows. Named after the Ada exception that downed Ariane 5. */
export class OperandError extends RangeError {
  constructor(
    readonly value: number,
    readonly type: IntType,
  ) {
    const { min, max } = rangeOf(type);
    super(`Operand Error: ${value} does not fit in ${describe(type)} [${min}, ${max}]`);
    this.name = 'OperandError';
  }
}

export function rangeOf({ bits, signed }: IntType): { min: number; max: number } {
  const span = 2 ** bits;
  return signed ? { min: -span / 2, max: span / 2 - 1 } : { min: 0, max: span - 1 };
}

export const describe = ({ bits, signed }: IntType) => `${signed ? 'int' : 'uint'}${bits}`;

/** Ada rounds float-to-integer conversions to the nearest integer, with halves going away from zero. */
const roundAda = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

export function toIntChecked(value: number, type: IntType = INT16): number {
  const n = roundAda(value);
  const { min, max } = rangeOf(type);
  if (!Number.isFinite(n) || n < min || n > max) throw new OperandError(value, type);
  return n;
}

export function toIntWrapping(value: number, type: IntType = INT16): number {
  if (!Number.isFinite(value)) return 0;
  const span = 2 ** type.bits;
  const low = ((Math.trunc(value) % span) + span) % span;
  return type.signed && low >= span / 2 ? low - span : low;
}

export function toIntSaturating(value: number, type: IntType = INT16): number {
  const { min, max } = rangeOf(type);
  if (Number.isNaN(value)) return 0;
  return Math.min(max, Math.max(min, roundAda(value)));
}

/** Two's-complement bit pattern of an in-range integer, most significant bit first. */
export function toBits(n: number, type: IntType = INT16): string {
  const span = 2 ** type.bits;
  return (((n % span) + span) % span).toString(2).padStart(type.bits, '0');
}
