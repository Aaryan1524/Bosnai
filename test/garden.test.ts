import { describe, it } from 'vitest';

describe('buildGarden', () => {
  it.todo('maps commits to growth events');
  it.todo('maps first-seen contributors to bloom events');
  it.todo('maps gaps to wither events');
  it.todo('maps merges to convergence events');
  it.todo('maps force-pushes to disruption events');
  it.todo('normalizes intensity/age/origin to [0, 1]');
  it.todo('sorts events stably by (timestamp, kind, sha)');
  it.todo('filters events outside the configured window (e.g. "365d")');
  it.todo('computes stats (totalCommits, contributors, gaps, seasonStart, seasonEnd)');
  it.todo('derives seed via seedFromEvents from the final normalized event list');
});
