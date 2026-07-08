import { describe, expect, it } from 'vitest';
import { buildGarden } from '../src/core/garden';
import { renderGarden } from '../src/core/render';
import type { RepoHistory } from '../src/core/history';

const NOW = new Date('2024-06-01T00:00:00Z').getTime();

function fixtureHistory(): RepoHistory {
  return {
    commits: [
      {
        sha: 'a'.repeat(40),
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
        message: 'init',
        parents: [],
        linesChanged: 12,
      },
      {
        sha: 'b'.repeat(40),
        authorName: 'Bob',
        authorEmail: 'bob@example.com',
        timestamp: new Date('2024-02-15T00:00:00Z').getTime(),
        message: 'feature work',
        parents: [],
        linesChanged: 340,
      },
      {
        sha: 'c'.repeat(40),
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        timestamp: new Date('2024-04-01T00:00:00Z').getTime(),
        message: 'merge feature',
        parents: ['a'.repeat(40), 'b'.repeat(40)],
        linesChanged: 0,
      },
    ],
    contributors: [
      { email: 'alice@example.com', name: 'Alice', firstSeen: new Date('2024-01-01T00:00:00Z').getTime(), commitCount: 2 },
      { email: 'bob@example.com', name: 'Bob', firstSeen: new Date('2024-02-15T00:00:00Z').getTime(), commitCount: 1 },
    ],
    gaps: [
      { start: new Date('2024-02-15T00:00:00Z').getTime(), end: new Date('2024-04-01T00:00:00Z').getTime(), days: 46 },
    ],
    merges: [
      {
        sha: 'c'.repeat(40),
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        timestamp: new Date('2024-04-01T00:00:00Z').getTime(),
        message: 'merge feature',
        parents: ['a'.repeat(40), 'b'.repeat(40)],
        linesChanged: 0,
      },
    ],
    forcePushes: [{ timestamp: new Date('2024-03-01T00:00:00Z').getTime() }],
  };
}

function gardenFor(history: RepoHistory, theme: string) {
  return buildGarden(history, { window: 'all', config: { theme, width: 800, height: 600 }, now: NOW });
}

describe('determinism', () => {
  it('renders byte-identical SVG twice for the same fixture Garden (bonsai)', () => {
    const history = fixtureHistory();
    const svgA = renderGarden(gardenFor(history, 'bonsai'), { biomeName: 'bonsai' });
    const svgB = renderGarden(gardenFor(fixtureHistory(), 'bonsai'), { biomeName: 'bonsai' });
    expect(svgA).toBe(svgB);
  });

  it('renders byte-identical SVG twice for the same fixture Garden (neon-vine)', () => {
    const history = fixtureHistory();
    const svgA = renderGarden(gardenFor(history, 'neon-vine'), { biomeName: 'neon-vine' });
    const svgB = renderGarden(gardenFor(fixtureHistory(), 'neon-vine'), { biomeName: 'neon-vine' });
    expect(svgA).toBe(svgB);
  });

  it('changing one commit event changes the rendered output', () => {
    const history = fixtureHistory();
    const baseline = renderGarden(gardenFor(history, 'bonsai'), { biomeName: 'bonsai' });

    const mutated = fixtureHistory();
    mutated.commits[1] = { ...mutated.commits[1]!, linesChanged: 999 };
    const changed = renderGarden(gardenFor(mutated, 'bonsai'), { biomeName: 'bonsai' });

    expect(changed).not.toBe(baseline);
  });

  it('the derived seed is stable across repeated buildGarden calls for the same input', () => {
    const gardenA = gardenFor(fixtureHistory(), 'bonsai');
    const gardenB = gardenFor(fixtureHistory(), 'bonsai');
    expect(gardenA.seed).toBe(gardenB.seed);
  });
});
