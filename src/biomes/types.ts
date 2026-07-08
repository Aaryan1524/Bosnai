/**
 * The biome plugin contract. Community authors implement this interface;
 * the trunk never needs to change for a new biome to exist.
 */

import type { Garden } from '../core/garden';

export type Biome = {
  /** Unique registry key, e.g. "bonsai", "coral", "neon-vine". */
  name: string;
  displayName: string;
  author: string;
  description: string;
  /** Render a complete `<svg>...</svg>` string. Must be deterministic given `garden`. */
  render: (garden: Garden) => string;
  defaultDimensions?: { width: number; height: number };
};

/**
 * Identity helper that gives authors type inference/checking when defining
 * a biome object, without needing to annotate every field by hand.
 */
export function defineBiome(biome: Biome): Biome {
  return biome;
}
