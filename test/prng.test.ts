import { describe, it } from 'vitest';

describe('createPrng', () => {
  it.todo('produces the same sequence for the same seed');
  it.todo('produces different sequences for different seeds');
  it.todo('next() stays within [0, 1)');
  it.todo('range(min, max) stays within [min, max)');
  it.todo('int(n) stays within [0, n)');
  it.todo('pick(arr) is deterministic for a given seed state');
});
