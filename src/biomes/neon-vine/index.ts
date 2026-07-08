/**
 * neon-vine — a climbing cyberpunk vine on a dark background. Proves the
 * plugin system works with a totally different aesthetic while consuming
 * the identical Garden schema as bonsai.
 */

import { defineBiome } from '../types';
import type { Garden } from '../../core/garden';

/** TODO(scaffold): implement full neon-vine render */
function render(garden: Garden): string {
  throw new Error('TODO(scaffold): implement neon-vine render');
}

export const neonVine = defineBiome({
  name: 'neon-vine',
  displayName: 'Neon Vine',
  author: 'Aaryan',
  description: 'A climbing cyberpunk vine that glows with your commit history.',
  render,
  defaultDimensions: { width: 800, height: 600 },
});
