import { describe, expect, it } from 'vitest';
import { bonsai } from '../src/biomes/bonsai';
import { seedFromEvents } from '../src/util/hash';
import type { Garden, GrowthEvent } from '../src/core/garden';

function makeGarden(events: GrowthEvent[]): Garden {
  return {
    events,
    seed: seedFromEvents(events),
    stats: {
      totalCommits: events.filter((e) => e.kind === 'growth').length,
      contributors: 1,
      gaps: 0,
      seasonStart: 0,
      seasonEnd: 0,
    },
    config: { theme: 'bonsai', width: 800, height: 600 },
  };
}

describe('bonsai.render', () => {
  it('renders a well-formed svg document', () => {
    const svg = bonsai.render(makeGarden([]));
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain('</svg>');
  });

  it('does not crash on an empty event list', () => {
    expect(() => bonsai.render(makeGarden([]))).not.toThrow();
  });

  it('does not crash on a single growth event', () => {
    const events: GrowthEvent[] = [
      { kind: 'growth', intensity: 0.5, age: 0.5, origin: 0.3, timestamp: 1, meta: { sha: 'a'.repeat(40), author: 'solo' } },
    ];
    expect(() => bonsai.render(makeGarden(events))).not.toThrow();
  });

  it('renders every event kind without throwing', () => {
    const events: GrowthEvent[] = [
      { kind: 'growth', intensity: 0.4, age: 0.1, origin: 0.2, timestamp: 1, meta: { sha: 'a'.repeat(40), author: 'a' } },
      { kind: 'growth', intensity: 0.9, age: 0.9, origin: 0.6, timestamp: 9, meta: { sha: 'b'.repeat(40), author: 'b' } },
      { kind: 'bloom', intensity: 0.5, age: 0.2, origin: 0.4, timestamp: 2, meta: { email: 'a@x.com', author: 'a' } },
      { kind: 'wither', intensity: 0.7, age: 0.5, origin: 0.5, timestamp: 5, meta: { gapStart: 4, gapEnd: 6 } },
      { kind: 'convergence', intensity: 0.3, age: 0.6, origin: 0.7, timestamp: 6, meta: { sha: 'c'.repeat(40), author: 'a' } },
      { kind: 'disruption', intensity: 1, age: 0.7, origin: 0.8, timestamp: 7, meta: {} },
    ];
    const svg = bonsai.render(makeGarden(events));
    expect(svg).toContain('</svg>');
  });

  it('produces the same output for the same seed (same events)', () => {
    const events: GrowthEvent[] = [
      { kind: 'growth', intensity: 0.5, age: 0.5, origin: 0.3, timestamp: 1, meta: { sha: 'a'.repeat(40), author: 'solo' } },
    ];
    const svgA = bonsai.render(makeGarden(events));
    const svgB = bonsai.render(makeGarden(events));
    expect(svgA).toBe(svgB);
  });

  it('produces different output for a different seed', () => {
    const eventsA: GrowthEvent[] = [
      { kind: 'growth', intensity: 0.5, age: 0.5, origin: 0.3, timestamp: 1, meta: { sha: 'a'.repeat(40), author: 'solo' } },
    ];
    const eventsB: GrowthEvent[] = [
      { kind: 'growth', intensity: 0.5, age: 0.5, origin: 0.3, timestamp: 1, meta: { sha: 'b'.repeat(40), author: 'solo' } },
    ];
    const svgA = bonsai.render(makeGarden(eventsA));
    const svgB = bonsai.render(makeGarden(eventsB));
    expect(svgA).not.toBe(svgB);
  });

  it('respects width/height overrides from Garden config', () => {
    const garden = makeGarden([]);
    garden.config.width = 400;
    garden.config.height = 300;
    const svg = bonsai.render(garden);
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="300"');
  });
});
