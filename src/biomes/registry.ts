/**
 * Central biome registry. Adding a biome = drop a folder under src/biomes
 * and add one line here.
 */

import type { Biome } from './types';
import { bonsai } from './bonsai';
import { neonVine } from './neon-vine';

const registry: Map<string, Biome> = new Map([
  [bonsai.name, bonsai],
  [neonVine.name, neonVine],
]);

/**
 * Look up a biome by name.
 * Throws a clear error listing available biomes if the name is unknown.
 */
export function getBiome(name: string): Biome {
  const biome = registry.get(name);
  if (biome === undefined) {
    throw new Error(`Unknown biome "${name}". Available biomes: ${listBiomes().join(', ')}`);
  }
  return biome;
}

/** List all registered biome names, sorted for deterministic output. */
export function listBiomes(): string[] {
  return Array.from(registry.keys()).sort();
}
