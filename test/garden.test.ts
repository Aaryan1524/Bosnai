import { describe, expect, it } from 'vitest';
import { buildGarden } from '../src/core/garden';
import type { RepoHistory } from '../src/core/history';

const NOW = new Date('2024-06-01T00:00:00Z').getTime();

function baseConfig() {
  return { theme: 'bonsai', width: 800, height: 600 };
}

function makeHistory(overrides: Partial<RepoHistory> = {}): RepoHistory {
  return {
    commits: [],
    contributors: [],
    gaps: [],
    merges: [],
    forcePushes: [],
    ...overrides,
  };
}

describe('buildGarden', () => {
  it('maps commits to growth events', () => {
    const history = makeHistory({
      commits: [
        {
          sha: 'a'.repeat(40),
          authorName: 'Alice',
          authorEmail: 'alice@example.com',
          timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
          message: 'init',
          parents: [],
          linesChanged: 10,
        },
      ],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    const growth = garden.events.filter((e) => e.kind === 'growth');
    expect(growth).toHaveLength(1);
    expect(growth[0]?.meta?.sha).toBe('a'.repeat(40));
  });

  it('maps first-seen contributors to bloom events', () => {
    const history = makeHistory({
      contributors: [
        { email: 'alice@example.com', name: 'Alice', firstSeen: new Date('2024-01-01T00:00:00Z').getTime(), commitCount: 3 },
      ],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    const blooms = garden.events.filter((e) => e.kind === 'bloom');
    expect(blooms).toHaveLength(1);
    expect(blooms[0]?.meta?.email).toBe('alice@example.com');
  });

  it('maps gaps to wither events', () => {
    const history = makeHistory({
      gaps: [{ start: new Date('2024-01-01T00:00:00Z').getTime(), end: new Date('2024-03-01T00:00:00Z').getTime(), days: 60 }],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    const withers = garden.events.filter((e) => e.kind === 'wither');
    expect(withers).toHaveLength(1);
    expect(withers[0]?.intensity).toBeCloseTo(60 / 90, 5);
  });

  it('maps merges to convergence events', () => {
    const history = makeHistory({
      merges: [
        {
          sha: 'm'.repeat(40),
          authorName: 'Bob',
          authorEmail: 'bob@example.com',
          timestamp: new Date('2024-02-01T00:00:00Z').getTime(),
          message: 'merge',
          parents: ['p1', 'p2'],
          linesChanged: 0,
        },
      ],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    const convergences = garden.events.filter((e) => e.kind === 'convergence');
    expect(convergences).toHaveLength(1);
    expect(convergences[0]?.meta?.sha).toBe('m'.repeat(40));
  });

  it('maps force-pushes to disruption events with intensity 1', () => {
    const history = makeHistory({
      forcePushes: [{ timestamp: new Date('2024-02-15T00:00:00Z').getTime() }],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    const disruptions = garden.events.filter((e) => e.kind === 'disruption');
    expect(disruptions).toHaveLength(1);
    expect(disruptions[0]?.intensity).toBe(1);
  });

  it('normalizes intensity/age/origin to [0, 1]', () => {
    const history = makeHistory({
      commits: [
        {
          sha: 'a'.repeat(40),
          authorName: 'Alice',
          authorEmail: 'alice@example.com',
          timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
          message: 'small',
          parents: [],
          linesChanged: 2,
        },
        {
          sha: 'b'.repeat(40),
          authorName: 'Alice',
          authorEmail: 'alice@example.com',
          timestamp: new Date('2024-02-01T00:00:00Z').getTime(),
          message: 'big',
          parents: [],
          linesChanged: 200,
        },
      ],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    for (const event of garden.events) {
      expect(event.intensity).toBeGreaterThanOrEqual(0);
      expect(event.intensity).toBeLessThanOrEqual(1);
      expect(event.age).toBeGreaterThanOrEqual(0);
      expect(event.age).toBeLessThanOrEqual(1);
      expect(event.origin).toBeGreaterThanOrEqual(0);
      expect(event.origin).toBeLessThan(1);
    }
    // the smaller commit should have lower intensity than the larger one
    const growth = garden.events.filter((e) => e.kind === 'growth');
    expect(growth[0]?.intensity).toBeLessThan(growth[1]?.intensity ?? 0);
    // oldest event should have age 0, newest should have age 1
    expect(growth[0]?.age).toBe(0);
    expect(growth[1]?.age).toBe(1);
  });

  it('sorts events stably by (timestamp, kind, meta tiebreak)', () => {
    const sameTimestamp = new Date('2024-01-01T00:00:00Z').getTime();
    const history = makeHistory({
      commits: [
        { sha: 'b'.repeat(40), authorName: 'B', authorEmail: 'b@example.com', timestamp: sameTimestamp, message: 'b', parents: [], linesChanged: 1 },
        { sha: 'a'.repeat(40), authorName: 'A', authorEmail: 'a@example.com', timestamp: sameTimestamp, message: 'a', parents: [], linesChanged: 1 },
      ],
    });

    const gardenA = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });
    const gardenB = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    expect(gardenA.events.map((e) => e.meta?.sha)).toEqual(gardenB.events.map((e) => e.meta?.sha));
    // deterministic order regardless of input array order: sha 'aaaa...' sorts before 'bbbb...'
    expect(gardenA.events[0]?.meta?.sha).toBe('a'.repeat(40));
  });

  it('sorts pre-1970 (negative epoch ms) commits chronologically, not lexicographically', () => {
    const history = makeHistory({
      commits: [
        {
          sha: 'later'.padEnd(40, '0'),
          authorName: 'Later',
          authorEmail: 'later@example.com',
          timestamp: new Date('1969-06-01T00:00:00Z').getTime(), // negative epoch ms
          message: 'later (still before 1970)',
          parents: [],
          linesChanged: 1,
        },
        {
          sha: 'earlier'.padEnd(40, '0'),
          authorName: 'Earlier',
          authorEmail: 'earlier@example.com',
          timestamp: new Date('1969-01-01T00:00:00Z').getTime(), // more negative epoch ms
          message: 'earlier',
          parents: [],
          linesChanged: 1,
        },
      ],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });
    const growth = garden.events.filter((e) => e.kind === 'growth');

    expect(growth[0]?.meta?.sha).toBe('earlier'.padEnd(40, '0'));
    expect(growth[1]?.meta?.sha).toBe('later'.padEnd(40, '0'));
  });

  it('filters events outside the configured window (e.g. "365d")', () => {
    const history = makeHistory({
      commits: [
        {
          sha: 'old'.padEnd(40, '0'),
          authorName: 'Old',
          authorEmail: 'old@example.com',
          timestamp: new Date('2022-01-01T00:00:00Z').getTime(),
          message: 'old commit',
          parents: [],
          linesChanged: 5,
        },
        {
          sha: 'new'.padEnd(40, '0'),
          authorName: 'New',
          authorEmail: 'new@example.com',
          timestamp: new Date('2024-05-01T00:00:00Z').getTime(),
          message: 'recent commit',
          parents: [],
          linesChanged: 5,
        },
      ],
    });

    const garden = buildGarden(history, { window: '365d', config: baseConfig(), now: NOW });

    expect(garden.events).toHaveLength(1);
    expect(garden.events[0]?.meta?.sha).toBe('new'.padEnd(40, '0'));
  });

  it('throws on an invalid window format', () => {
    const history = makeHistory();
    expect(() => buildGarden(history, { window: 'bogus', config: baseConfig(), now: NOW })).toThrow();
  });

  it('computes stats (totalCommits, contributors, gaps, seasonStart, seasonEnd)', () => {
    const t1 = new Date('2024-01-01T00:00:00Z').getTime();
    const t2 = new Date('2024-02-01T00:00:00Z').getTime();
    const history = makeHistory({
      commits: [
        { sha: 'a'.repeat(40), authorName: 'A', authorEmail: 'a@example.com', timestamp: t1, message: 'a', parents: [], linesChanged: 1 },
        { sha: 'b'.repeat(40), authorName: 'B', authorEmail: 'b@example.com', timestamp: t2, message: 'b', parents: [], linesChanged: 1 },
      ],
      gaps: [{ start: t1, end: t2, days: 31 }],
    });

    const garden = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    expect(garden.stats.totalCommits).toBe(2);
    expect(garden.stats.contributors).toBe(2);
    expect(garden.stats.gaps).toBe(1);
    expect(garden.stats.seasonStart).toBe(t1);
    expect(garden.stats.seasonEnd).toBe(t2);
  });

  it('derives seed via seedFromEvents from the final normalized event list', () => {
    const history = makeHistory({
      commits: [
        { sha: 'a'.repeat(40), authorName: 'A', authorEmail: 'a@example.com', timestamp: new Date('2024-01-01T00:00:00Z').getTime(), message: 'a', parents: [], linesChanged: 1 },
      ],
    });

    const gardenA = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });
    const gardenB = buildGarden(history, { window: 'all', config: baseConfig(), now: NOW });

    expect(gardenA.seed).toBe(gardenB.seed);
    expect(Number.isInteger(gardenA.seed)).toBe(true);
  });
});
