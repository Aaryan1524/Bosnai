/**
 * Seeded pseudo-random number generation (mulberry32).
 *
 * Determinism is a hard requirement across the whole project: biomes must
 * never call Math.random(). All randomness flows through a PRNG created
 * from the Garden's seed.
 */

/** A seeded random source. Every method is deterministic for a given seed. */
export type Prng = {
  /** Next float in [0, 1). TODO(scaffold): implement */
  next: () => number;
  /** Float in [min, max). TODO(scaffold): implement */
  range: (min: number, max: number) => number;
  /** Integer in [0, n). TODO(scaffold): implement */
  int: (n: number) => number;
  /** Deterministically pick one element. TODO(scaffold): implement */
  pick: <T>(arr: readonly T[]) => T;
};

/**
 * Create a mulberry32 PRNG from a 32-bit unsigned seed.
 * TODO(scaffold): implement
 */
export function createPrng(seed: number): Prng {
  throw new Error('TODO(scaffold): implement createPrng');
}
