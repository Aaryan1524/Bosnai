import { describe, it } from 'vitest';

describe('renderGarden', () => {
  it.todo('produces a well-formed SVG for the bonsai biome');
  it.todo('produces a well-formed SVG for the neon-vine biome');
  it.todo('applies width/height overrides from Garden config');
});

describe('sanitizeSvg', () => {
  it.todo('strips <script> elements');
  it.todo('strips on* event attributes');
  it.todo('strips external href/src/xlink:href (keeps # and data: refs)');
  it.todo('throws on malformed SVG input');
});
