/**
 * The Garden: the botanically-neutral event schema every biome consumes.
 *
 * THIS IS THE LOAD-BEARING CONTRACT. Do not add biome-specific concepts
 * (branches, roots, coral polyps). If a biome needs something, it derives
 * it from the neutral properties or reads `meta`.
 */

import type { RepoHistory } from './history';

/** One neutral event in the repo's life. */
export type GrowthEvent = {
  /**
   * growth=commit, bloom=new contributor, wither=gap,
   * disruption=force-push, convergence=merge
   */
  kind: 'growth' | 'bloom' | 'wither' | 'disruption' | 'convergence';
  /** 0..1, normalized (e.g. commit size, or contributor commit count). */
  intensity: number;
  /** 0..1, position in the repo's timeline (0=oldest, 1=newest). */
  age: number;
  /** 0..1, stable per-actor spatial seed (hash of author email). */
  origin: number;
  /** Epoch ms, for ordering. */
  timestamp: number;
  /** Optional extras (author, sha). Biomes may read but must not require. */
  meta?: Record<string, string | number>;
};

/** Rendering configuration passed through to biomes. */
export type GardenConfig = {
  /** Biome name being rendered (informational for biomes). */
  theme: string;
  width: number;
  height: number;
  /** Optional palette overrides keyed by biome-defined slot names. */
  palette?: Record<string, string>;
};

/** Everything a biome receives. */
export type Garden = {
  events: GrowthEvent[];
  /** Derived from SHA of the normalized event list — biomes MUST use this for all randomness. */
  seed: number;
  stats: {
    totalCommits: number;
    contributors: number;
    gaps: number;
    /** Epoch ms of window start. */
    seasonStart: number;
    /** Epoch ms of window end. */
    seasonEnd: number;
  };
  config: GardenConfig;
};

/** Options controlling normalization. */
export type GardenOptions = {
  /** "all" or a duration like "365d" limiting how far back to look. */
  window: string;
  config: GardenConfig;
};

/**
 * Normalize raw git history into a Garden: map signals to neutral events,
 * apply the window, sort stably, compute stats, and derive the seed.
 * TODO(scaffold): implement
 */
export function buildGarden(history: RepoHistory, options: GardenOptions): Garden {
  throw new Error('TODO(scaffold): implement buildGarden');
}
