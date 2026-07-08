import { describe, expect, it, vi } from 'vitest';
import { renderGarden, sanitizeSvg } from '../src/core/render';
import { seedFromEvents } from '../src/util/hash';
import type { Garden } from '../src/core/garden';
import type { Biome } from '../src/biomes/types';

function makeGarden(overrides: Partial<Garden['config']> = {}): Garden {
  return {
    events: [],
    seed: seedFromEvents([]),
    stats: { totalCommits: 0, contributors: 0, gaps: 0, seasonStart: 0, seasonEnd: 0 },
    config: { theme: 'bonsai', width: 800, height: 600, ...overrides },
  };
}

describe('renderGarden', () => {
  it('produces a well-formed SVG for the bonsai biome', () => {
    const svg = renderGarden(makeGarden(), { biomeName: 'bonsai' });
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('</svg>');
  });

  it('produces a well-formed SVG for the neon-vine biome', () => {
    const svg = renderGarden(makeGarden({ theme: 'neon-vine' }), { biomeName: 'neon-vine' });
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('</svg>');
  });

  it('applies width/height overrides from Garden config', () => {
    const svg = renderGarden(makeGarden({ width: 400, height: 300 }), { biomeName: 'bonsai' });
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="300"');
  });

  it('throws a clear error for an unknown biome', () => {
    expect(() => renderGarden(makeGarden(), { biomeName: 'does-not-exist' })).toThrow(/Unknown biome/);
  });

  it('rejects a biome that produces malformed SVG', async () => {
    vi.resetModules();
    vi.doMock('../src/biomes/registry', () => ({
      getBiome: (): Biome => ({
        name: 'broken',
        displayName: 'Broken',
        author: 'test',
        description: '',
        render: () => '<svg><rect></svg>',
      }),
    }));
    const { renderGarden: renderGardenMocked } = await import('../src/core/render');
    expect(() => renderGardenMocked(makeGarden(), { biomeName: 'broken' })).toThrow(/malformed SVG/);
    vi.doUnmock('../src/biomes/registry');
    vi.resetModules();
  });

  it('rejects a biome that ignores the configured dimensions', async () => {
    vi.resetModules();
    vi.doMock('../src/biomes/registry', () => ({
      getBiome: (): Biome => ({
        name: 'broken-dims',
        displayName: 'Broken Dims',
        author: 'test',
        description: '',
        render: () => '<svg width="1" height="1"></svg>',
      }),
    }));
    const { renderGarden: renderGardenMocked } = await import('../src/core/render');
    expect(() => renderGardenMocked(makeGarden(), { biomeName: 'broken-dims' })).toThrow(/rendered dimensions/);
    vi.doUnmock('../src/biomes/registry');
    vi.resetModules();
  });
});

describe('sanitizeSvg', () => {
  it('strips <script> elements', () => {
    const out = sanitizeSvg('<svg><script>alert(1)</script><rect/></svg>');
    expect(out).not.toContain('<script');
    expect(out).toContain('<rect/>');
  });

  it('strips on* event attributes', () => {
    const out = sanitizeSvg('<svg><rect onclick="alert(1)" fill="red"/></svg>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('fill="red"');
  });

  it('strips external href/src/xlink:href but keeps # and data: refs', () => {
    const out = sanitizeSvg(
      '<svg><use href="#local"/><image xlink:href="https://evil.example/x.png"/><image href="data:image/png;base64,AAAA"/></svg>',
    );
    expect(out).toContain('href="#local"');
    expect(out).toContain('href="data:image/png;base64,AAAA"');
    expect(out).not.toContain('evil.example');
  });

  it('leaves malformed input untouched (validation is renderGarden\'s job, not sanitizeSvg\'s)', () => {
    expect(sanitizeSvg('<svg><rect></svg>')).toBe('<svg><rect></svg>');
  });
});
