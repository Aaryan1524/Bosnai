import { describe, expect, it } from 'vitest';
import { fnv1a, hashToUnit, seedFromEvents } from '../src/util/hash';

describe('fnv1a', () => {
  it('returns a known-answer hash for a fixed input string', () => {
    // FNV-1a 32-bit of "" is the offset basis.
    expect(fnv1a('')).toBe(0x811c9dc5);
  });

  it('is stable across repeated calls', () => {
    expect(fnv1a('someone@example.com')).toBe(fnv1a('someone@example.com'));
  });

  it('produces different hashes for different inputs', () => {
    expect(fnv1a('alice@example.com')).not.toBe(fnv1a('bob@example.com'));
  });
});

describe('hashToUnit', () => {
  it('returns a value in [0, 1)', () => {
    for (const input of ['a', 'b', 'someone@example.com', '']) {
      const v = hashToUnit(input);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is stable for the same input', () => {
    expect(hashToUnit('x@y.com')).toBe(hashToUnit('x@y.com'));
  });
});

describe('seedFromEvents', () => {
  const fixture = [
    { kind: 'growth', intensity: 0.5, age: 0.1, origin: 0.2, timestamp: 1000 },
    { kind: 'bloom', intensity: 0.8, age: 0.5, origin: 0.3, timestamp: 2000 },
  ];

  it('is stable across runs for the same input', () => {
    expect(seedFromEvents(fixture)).toBe(seedFromEvents(fixture));
    expect(seedFromEvents(fixture)).toBe(seedFromEvents(JSON.parse(JSON.stringify(fixture))));
  });

  it('changes when one event changes', () => {
    const changed = [
      { ...fixture[0], intensity: 0.51 },
      fixture[1],
    ];
    expect(seedFromEvents(changed)).not.toBe(seedFromEvents(fixture));
  });

  it('does not depend on object key insertion order', () => {
    const reordered = fixture.map((e) => ({
      timestamp: e.timestamp,
      origin: e.origin,
      age: e.age,
      intensity: e.intensity,
      kind: e.kind,
    }));
    expect(seedFromEvents(reordered)).toBe(seedFromEvents(fixture));
  });

  it('returns a value representable as an unsigned 32-bit integer', () => {
    const seed = seedFromEvents(fixture);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
