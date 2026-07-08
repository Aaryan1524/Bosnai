import { describe, it } from 'vitest';

/**
 * The core invariant: same git history -> byte-identical SVG, every time.
 * Uses a fixed fixture Garden (not live git history) so these tests are
 * themselves deterministic and fast.
 */
describe('determinism', () => {
  it.todo('renders byte-identical SVG twice for the same fixture Garden (bonsai)');
  it.todo('renders byte-identical SVG twice for the same fixture Garden (neon-vine)');
  it.todo('changing one commit event changes the rendered output');
  it.todo('the derived seed is stable across repeated buildGarden calls for the same input');
});
