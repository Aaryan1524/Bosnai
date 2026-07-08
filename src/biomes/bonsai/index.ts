/**
 * bonsai — the flagship biome. A stylized bonsai tree: trunk grows from
 * `growth` events, branches fan out with commit-density-driven count/angle,
 * `bloom` events place blossoms at contributor origins, `wither` events
 * scatter falling autumn leaves, `disruption` snaps a branch.
 */

import { defineBiome } from '../types';
import type { Garden } from '../../core/garden';

/** TODO(scaffold): implement full bonsai render */
function render(garden: Garden): string {
  throw new Error('TODO(scaffold): implement bonsai render');
}

export const bonsai = defineBiome({
  name: 'bonsai',
  displayName: 'Bonsai',
  author: 'Aaryan',
  description: 'A stylized bonsai tree that grows from your commit history.',
  render,
  defaultDimensions: { width: 800, height: 600 },
});
