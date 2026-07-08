/**
 * Stable hashing utilities.
 *
 * These derive every "random-looking" number in the system from repo
 * content, so identical git histories always produce identical output.
 */

import { createHash } from 'node:crypto';

/**
 * FNV-1a 32-bit hash of a string, returned as an unsigned 32-bit integer.
 * Used for stable per-actor values (e.g. author email -> origin position).
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * FNV-1a mapped to a float in [0, 1). Convenience for spatial seeds.
 */
export function hashToUnit(input: string): number {
  return fnv1a(input) / 4294967296;
}

/**
 * Recursively stringify a value with object keys sorted, so key insertion
 * order never affects the result. Arrays keep their existing order —
 * callers are responsible for sorting arrays that carry meaning (e.g. the
 * event list) before hashing.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
  );
  return `{${entries.join(',')}}`;
}

/**
 * Derive the Garden seed: stable-stringify the normalized event list,
 * SHA-256 it, and take the first 4 bytes as a uint32.
 * Input must already be sorted/normalized — this function adds no ordering.
 */
export function seedFromEvents(events: readonly unknown[]): number {
  const digest = createHash('sha256').update(stableStringify(events)).digest();
  return digest.readUInt32BE(0);
}
