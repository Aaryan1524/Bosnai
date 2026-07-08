/**
 * Stable hashing utilities.
 *
 * These derive every "random-looking" number in the system from repo
 * content, so identical git histories always produce identical output.
 */

/**
 * FNV-1a 32-bit hash of a string, returned as an unsigned 32-bit integer.
 * Used for stable per-actor values (e.g. author email -> origin position).
 * TODO(scaffold): implement
 */
export function fnv1a(input: string): number {
  throw new Error('TODO(scaffold): implement fnv1a');
}

/**
 * FNV-1a mapped to a float in [0, 1). Convenience for spatial seeds.
 * TODO(scaffold): implement
 */
export function hashToUnit(input: string): number {
  throw new Error('TODO(scaffold): implement hashToUnit');
}

/**
 * Derive the Garden seed: stable-stringify the normalized event list,
 * SHA-256 it, and take the first 4 bytes as a uint32.
 * Input must already be sorted/normalized — this function adds no ordering.
 * TODO(scaffold): implement
 */
export function seedFromEvents(events: readonly unknown[]): number {
  throw new Error('TODO(scaffold): implement seedFromEvents');
}
