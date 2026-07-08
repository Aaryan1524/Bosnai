# Write a biome

A biome is a typed TypeScript module that turns a `Garden` — a normalized,
botanically-neutral description of a repo's history — into an SVG string.
There's no JSON theme format to learn: you write a `render()` function
with real loops, real trigonometry, and real seeded randomness. This page
covers the `Biome` interface, the `Garden` schema you'll consume, the
helpers in `kit.ts`, and a complete minimal biome built from scratch.

## The `Biome` interface

From [`src/biomes/types.ts`](https://github.com/Aaryan1524/Bosnai/blob/main/src/biomes/types.ts):

```ts
export type Biome = {
  name: string; // unique registry key, e.g. "bonsai", "coral", "neon-vine"
  displayName: string;
  author: string;
  description: string;
  render: (garden: Garden) => string; // returns a complete <svg>...</svg> string
  defaultDimensions?: { width: number; height: number };
};

export function defineBiome(biome: Biome): Biome;
```

`defineBiome()` is an identity function — it exists purely so your biome
object gets checked against the `Biome` type without you writing out the
annotation by hand.

## The `Garden` schema

This is the one thing your biome actually depends on. From
[`src/core/garden.ts`](https://github.com/Aaryan1524/Bosnai/blob/main/src/core/garden.ts):

```ts
export type GrowthEvent = {
  kind: 'growth' | 'bloom' | 'wither' | 'disruption' | 'convergence';
  //  growth=commit  bloom=new contributor  wither=gap
  //  disruption=force-push  convergence=merge
  intensity: number; // 0..1, normalized (e.g. commit size, or contributor commit count)
  age: number; // 0..1, position in the repo's timeline (0=oldest, 1=newest)
  origin: number; // 0..1, stable per-actor spatial seed (hash of author email)
  timestamp: number; // epoch ms, for ordering
  meta?: Record<string, string | number>; // e.g. { author, sha } — read but don't require
};

export type Garden = {
  events: GrowthEvent[]; // sorted, deterministic order
  seed: number; // derived from the event list — use this for ALL randomness
  stats: {
    totalCommits: number;
    contributors: number;
    gaps: number;
    seasonStart: number; // epoch ms
    seasonEnd: number; // epoch ms
  };
  config: GardenConfig; // { theme, width, height, palette? }
};
```

Three rules that matter more than anything else on this page:

1. **Never call `Math.random()` or `Date.now()`.** Seed a PRNG from
   `garden.seed` and use that for everything. `renderGarden()` (the host
   that calls your biome) doesn't enforce this — but the project's
   determinism test suite renders your biome twice against a fixed fixture
   and asserts byte-identical output, and a real installer's nightly cron
   will start committing noise on every run if you get this wrong.
2. **Stay neutral.** Don't add bonsai-specific concepts (branches, roots)
   or coral-specific ones to what you read from `Garden` — if you need
   something the schema doesn't give you, derive it from `intensity` /
   `age` / `origin`, or read `meta` (and don't *require* `meta` fields to
   be present; they're advisory).
3. **Respect `garden.config.width` / `garden.config.height`.** The
   renderer host validates that your root `<svg>` actually has these
   dimensions and rejects the render if it doesn't.

## The `kit.ts` helpers

From [`src/biomes/kit.ts`](https://github.com/Aaryan1524/Bosnai/blob/main/src/biomes/kit.ts) —
import these instead of reinventing them:

```ts
createPrng(seed: number): Prng
// rng.next() -> [0,1), rng.range(min,max), rng.int(n), rng.pick(arr)

num(n: number): string
// rounds to 2 decimals, formats compactly. Pass every coordinate you emit
// through this — it kills cross-environment floating-point drift from
// trig on seeded values, in addition to keeping output small.

lerpColor(a: string, b: string, t: number): string        // "#rrggbb" lerp
colorRamp(stops: string[]): (t: number) => string          // multi-stop sampler

smoothPath(points: Point[]): string                         // quadratic-through-points `d`
branchSegment(from: Point, to: Point, wStart: number, wEnd: number): string
// a tapered, filled quadrilateral — good for anything that should look
// like it has thickness (a trunk, a vine, a limb)

svgDoc(width: number, height: number, inner: string): string
// wraps markup in a namespaced <svg width=... height=... viewBox=...>
```

## Walkthrough: building `dots`

Let's build the simplest possible biome: growth events as dots along a
line, blooms as bigger highlighted dots, and a distinct little mark for
each of the other three event kinds. This is intentionally not
screenshot-worthy — it's meant to be the shortest path to "I understand
the whole loop," not a second flagship.

### 1. Scaffold the file

```ts
// src/biomes/dots/index.ts
import { defineBiome } from '../types';
import { createPrng, num, colorRamp, svgDoc } from '../kit';
import type { Garden } from '../../core/garden';

function render(garden: Garden): string {
  const { width, height } = garden.config;
  const rng = createPrng(garden.seed);
  const ramp = colorRamp(['#2b6cb0', '#38a169', '#d69e2e']);

  const marks = garden.events
    .map((event) => {
      const x = event.age * (width - 40) + 20;
      const jitter = (rng.next() - 0.5) * 20;
      const y = height / 2 + (event.origin - 0.5) * height * 0.6 + jitter;

      switch (event.kind) {
        case 'growth':
          return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(2 + event.intensity * 6)}" fill="${ramp(event.intensity)}"/>`;
        case 'bloom':
          return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(8 + event.intensity * 6)}" fill="none" stroke="#d53f8c" stroke-width="2"/>`;
        case 'wither':
          return `<line x1="${num(x - 6)}" y1="${num(y)}" x2="${num(x + 6)}" y2="${num(y)}" stroke="#a0522d" stroke-width="2"/>`;
        case 'disruption':
          return `<line x1="${num(x - 6)}" y1="${num(y - 6)}" x2="${num(x + 6)}" y2="${num(y + 6)}" stroke="#e53e3e" stroke-width="3"/>`;
        case 'convergence':
          return `<rect x="${num(x - 5)}" y="${num(y - 5)}" width="10" height="10" fill="none" stroke="#4a5568" stroke-width="2"/>`;
      }
    })
    .join('');

  const bg = `<rect x="0" y="0" width="${num(width)}" height="${num(height)}" fill="#f7fafc"/>`;
  return svgDoc(width, height, bg + marks);
}

export const dots = defineBiome({
  name: 'dots',
  displayName: 'Dots',
  author: 'you',
  description: 'The minimal reference biome — one mark per event, nothing more.',
  render,
  defaultDimensions: { width: 800, height: 300 },
});
```

Notice what this does and doesn't touch:

- `rng` comes from `garden.seed` — never `Math.random()`.
- Every coordinate passed into an SVG attribute goes through `num()`.
- `x` comes from `age`, `y`'s spread comes from `origin`, size/color come
  from `intensity` — no bonsai/coral-specific concept anywhere.
- `width`/`height` come from `garden.config`, and `svgDoc()` sets them on
  the root element — this is what the renderer host checks.

### 2. Register it

Add one line to [`src/biomes/registry.ts`](https://github.com/Aaryan1524/Bosnai/blob/main/src/biomes/registry.ts):

```ts
import { dots } from './dots';

const registry: Map<string, Biome> = new Map([
  [bonsai.name, bonsai],
  [neonVine.name, neonVine],
  [dots.name, dots], // add this line
]);
```

That's the entire integration surface. `getBiome('dots')` now works, and
`biome: dots` works as a workflow input.

### 3. Verify it

The fastest feedback loop is rendering a fixture `Garden` directly and
opening the SVG, without touching git or GitHub Actions at all:

```ts
import { dots } from './src/biomes/dots';
import { seedFromEvents } from './src/util/hash';

const events = [
  { kind: 'growth' as const, intensity: 0.6, age: 0.2, origin: 0.4, timestamp: 1 },
  { kind: 'bloom' as const, intensity: 0.5, age: 0.5, origin: 0.7, timestamp: 2 },
];
const garden = {
  events,
  seed: seedFromEvents(events),
  stats: { totalCommits: 1, contributors: 1, gaps: 0, seasonStart: 0, seasonEnd: 0 },
  config: { theme: 'dots', width: 800, height: 300 },
};

console.log(dots.render(garden));
```

Then run the project's determinism check against it the same way the
existing biomes are tested in
[`test/determinism.test.ts`](https://github.com/Aaryan1524/Bosnai/blob/main/test/determinism.test.ts):
render the same fixture twice and assert the strings are identical.

### 4. Ship it

Add tests mirroring
[`test/bonsai.test.ts`](https://github.com/Aaryan1524/Bosnai/blob/main/test/bonsai.test.ts) —
valid SVG output, every event kind renders without throwing, same-seed
determinism, different-seed divergence — and open a PR. The trunk (git
reading, normalization, sanitization, committing) never needs to change
for a new biome to exist.
