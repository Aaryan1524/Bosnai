import { describe, it } from 'vitest';

describe('fnv1a', () => {
  it.todo('returns a known-answer hash for a fixed input string');
  it.todo('is stable across repeated calls');
});

describe('hashToUnit', () => {
  it.todo('returns a value in [0, 1)');
  it.todo('is stable for the same input');
});

describe('seedFromEvents', () => {
  it.todo('is stable across runs for the same input');
  it.todo('changes when one event changes');
  it.todo('does not depend on object key insertion order');
});
