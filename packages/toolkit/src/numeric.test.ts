import { describe, expect, it } from 'vitest';
import {
  INT16,
  OperandError,
  rangeOf,
  toBits,
  toIntChecked,
  toIntSaturating,
  toIntWrapping,
} from './numeric.ts';

describe('rangeOf', () => {
  it('knows the classic limits', () => {
    expect(rangeOf(INT16)).toEqual({ min: -32768, max: 32767 });
    expect(rangeOf({ bits: 8, signed: false })).toEqual({ min: 0, max: 255 });
    expect(rangeOf({ bits: 32, signed: true })).toEqual({ min: -2147483648, max: 2147483647 });
  });
});

describe('toIntChecked', () => {
  it('converts values that fit, rounding like Ada', () => {
    expect(toIntChecked(20000.37)).toBe(20000);
    expect(toIntChecked(2.5)).toBe(3);
    expect(toIntChecked(-2.5)).toBe(-3);
    expect(toIntChecked(32767.4)).toBe(32767);
  });

  it('raises OperandError the moment a value does not fit', () => {
    expect(() => toIntChecked(32767.5)).toThrow(OperandError);
    expect(() => toIntChecked(-32768.5)).toThrow(OperandError);
    expect(() => toIntChecked(Number.NaN)).toThrow(OperandError);
    expect(() => toIntChecked(Infinity)).toThrow(/does not fit in int16/);
  });
});

describe('toIntWrapping', () => {
  it('silently keeps the low bits', () => {
    expect(toIntWrapping(32767)).toBe(32767);
    expect(toIntWrapping(32768)).toBe(-32768);
    expect(toIntWrapping(40000)).toBe(-25536);
    expect(toIntWrapping(65536 + 5)).toBe(5);
    expect(toIntWrapping(-32769)).toBe(32767);
  });
});

describe('toIntSaturating', () => {
  it('clamps to the representable range', () => {
    expect(toIntSaturating(1e9)).toBe(32767);
    expect(toIntSaturating(-1e9)).toBe(-32768);
    expect(toIntSaturating(123.6)).toBe(124);
  });
});

describe('toBits', () => {
  it('shows the two’s-complement pattern', () => {
    expect(toBits(1)).toBe('0000000000000001');
    expect(toBits(-1)).toBe('1111111111111111');
    expect(toBits(-32768)).toBe('1000000000000000');
  });
});
