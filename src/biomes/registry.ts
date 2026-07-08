/**
 * Central biome registry. Adding a biome = drop a folder under src/biomes
 * and add one line here.
 */

import type { Biome } from './types';

/**
 * All registered biomes, keyed by name.
 * TODO(scaffold): populate with { bonsai } and { neonVine } once implemented.
 */
const registry: Map<string, Biome> = new Map();

/**
 * Look up a biome by name.
 * Throws a clear error listing available biomes if the name is unknown.
 * TODO(scaffold): implement
 */
export function getBiome(name: string): Biome {
  throw new Error('TODO(scaffold): implement getBiome');
}

/** List all registered biome names, sorted for deterministic output. TODO(scaffold): implement */
export function listBiomes(): string[] {
  throw new Error('TODO(scaffold): implement listBiomes');
}
