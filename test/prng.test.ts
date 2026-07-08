import { describe, expect, it } from 'vitest';
import { createPrng } from '../src/util/prng';

describe('createPrng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createPrng(1);
    const b = createPrng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays within [0, 1)', () => {
    const rng = createPrng(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range(min, max) stays within [min, max)', () => {
    const rng = createPrng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.range(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it('int(n) stays within [0, n)', () => {
    const rng = createPrng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick(arr) is deterministic for a given seed state', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const a = createPrng(555);
    const b = createPrng(555);
    const picksA = Array.from({ length: 10 }, () => a.pick(arr));
    const picksB = Array.from({ length: 10 }, () => b.pick(arr));
    expect(picksA).toEqual(picksB);
    for (const p of picksA) {
      expect(arr).toContain(p);
    }
  });
});
