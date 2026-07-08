import { describe, expect, it } from 'vitest';
import { getBiome, listBiomes } from '../src/biomes/registry';

describe('getBiome', () => {
  it('returns the bonsai biome by name', () => {
    expect(getBiome('bonsai').name).toBe('bonsai');
  });

  it('returns the neon-vine biome by name', () => {
    expect(getBiome('neon-vine').name).toBe('neon-vine');
  });

  it('throws a clear error listing available biomes for an unknown name', () => {
    expect(() => getBiome('does-not-exist')).toThrow(/bonsai/);
    expect(() => getBiome('does-not-exist')).toThrow(/neon-vine/);
  });
});

describe('listBiomes', () => {
  it('returns registered biome names sorted', () => {
    expect(listBiomes()).toEqual(['bonsai', 'neon-vine']);
  });
});
