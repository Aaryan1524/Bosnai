/**
 * Seeded pseudo-random number generation (mulberry32).
 *
 * Determinism is a hard requirement across the whole project: biomes must
 * never call Math.random(). All randomness flows through a PRNG created
 * from the Garden's seed.
 */

/** A seeded random source. Every method is deterministic for a given seed. */
export type Prng = {
  /** Next float in [0, 1). */
  next: () => number;
  /** Float in [min, max). */
  range: (min: number, max: number) => number;
  /** Integer in [0, n). */
  int: (n: number) => number;
  /** Deterministically pick one element. */
  pick: <T>(arr: readonly T[]) => T;
};

/**
 * Create a mulberry32 PRNG from a 32-bit unsigned seed.
 */
export function createPrng(seed: number): Prng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const range = (min: number, max: number): number => min + next() * (max - min);

  const int = (n: number): number => Math.floor(next() * n);

  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) {
      throw new Error('Prng.pick: cannot pick from an empty array');
    }
    return arr[int(arr.length)] as T;
  };

  return { next, range, int, pick };
}
