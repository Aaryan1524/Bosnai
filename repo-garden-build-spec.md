# Repo Garden — build spec

We are building **Repo Garden**, a standalone open-source GitHub Action that reads a repository's git history and renders a procedurally-generated botanical SVG (a bonsai, coral, vine, etc.) into that repo's README. Commits become growth, contributors become blossoms, long gaps become falling autumn leaves, and force-pushes snap branches. The renderer is pluggable: the community ships "biomes" (visual themes) against a stable typed interface. I maintain the trunk; contributors maintain the forest.

This is a NEW repo, published on its own. It is not integrated into any existing project — other repos "use" it by adding a workflow file and a README marker.

## Tech decisions (already made — do not re-litigate)

- **Language:** TypeScript, compiled to a single bundled Node action (`@vercel/ncc`). GitHub Actions is Node-native and biome authors are web devs who think in JS/SVG.
- **Git parsing:** `simple-git`.
- **Action scaffolding:** `@actions/core`, `@actions/github`, `@actions/exec`.
- **Biome authoring:** each biome is a TS module exporting a typed `Biome` object with a `render(garden: Garden): string` function returning an SVG string. No JSON-declarative format — generative art needs real code (loops, trig, seeded randomness).
- **Output:** a single deterministic `.svg` file committed back into the repo. No server, no runtime — GitHub renders it as a static image.
- **Determinism is a hard requirement.** Same git history MUST produce a byte-identical SVG every run, or the repo churns with meaningless diffs on every cron tick. Seed ALL randomness from a hash of the commit history. Never use `Math.random()`. Use a seeded PRNG (mulberry32 or similar) seeded from a SHA of the normalized event list.

## Architecture — three layers

### 1. Trunk (core, I own it — must be rock solid)

**Git reader** (`src/core/history.ts`): uses `simple-git` to walk the log and produce raw signals:
- commits (sha, author, timestamp, message)
- contributors (unique authors, first-seen date, commit count)
- gaps (spans > N days with no commits — configurable, default 21)
- force-pushes / history rewrites (detect via reflog where available; degrade gracefully if not — this is best-effort, document the limitation)
- merges

**Normalizer** (`src/core/garden.ts`): maps raw signals into a **botanically-neutral** event schema so bonsai/coral/vine all consume the same input. This abstraction is the load-bearing contract — get it right early; it's the one thing that can't be refactored later without breaking every biome. Do NOT bake bonsai concepts (branches, roots) into it. Use neutral properties:

```ts
type GrowthEvent = {
  kind: 'growth' | 'bloom' | 'wither' | 'disruption' | 'convergence';
  //  growth=commit  bloom=new contributor  wither=gap  disruption=force-push  convergence=merge
  intensity: number;   // 0..1, normalized (e.g. commit size, or contributor commit count)
  age: number;         // 0..1, position in the repo's timeline (0=oldest, 1=newest)
  origin: number;      // 0..1, stable per-actor spatial seed (hash of author email) — where on the organism it emanates from
  timestamp: number;   // epoch ms, for ordering
  meta?: Record<string, string | number>; // e.g. { author: 'x', sha: 'abc' } — biomes may read but shouldn't require
};

type Garden = {
  events: GrowthEvent[];
  seed: number;              // derived from SHA of the normalized event list — biomes MUST use this for all randomness
  stats: {
    totalCommits: number;
    contributors: number;
    gaps: number;
    seasonStart: number;     // epoch ms of window start
    seasonEnd: number;
  };
  config: GardenConfig;      // theme, dimensions, palette overrides
};
```

**Renderer host** (`src/core/render.ts`): loads the selected biome by name, calls `biome.render(garden)`, validates the returned SVG (well-formed, within declared dimensions, no external refs / no `<script>` / no remote `<image href>` — biomes are untrusted community code rendered into people's READMEs, so sanitize the output), and returns the final SVG string.

**Committer** (`src/core/commit.ts`): writes the SVG to the configured output path and commits it back only if the content changed (diff the file — skip the commit entirely if identical, to honor determinism and avoid noise). Use the Action's `GITHUB_TOKEN`. Commit message like `chore: grow repo garden 🌱 [skip ci]`.

**Entry point** (`src/main.ts`): reads inputs from `action.yml`, orchestrates the four steps above, sets outputs, handles errors with `core.setFailed`.

### 2. Biome plugin API (the interface contract)

```ts
// src/biomes/types.ts
export type Biome = {
  name: string;              // 'bonsai', 'coral', 'neon-vine', 'miami-palm'
  displayName: string;
  author: string;
  description: string;
  render: (garden: Garden) => string;   // returns a complete <svg>...</svg> string
  defaultDimensions?: { width: number; height: number };
};
```

Biomes live in `src/biomes/<name>/index.ts` and self-register in a central registry (`src/biomes/registry.ts`). Adding a biome = drop a folder + one registry line. Provide a `defineBiome()` helper for type inference and a documented set of SVG helper utilities biomes can import (seeded PRNG, color-ramp interpolation, path builders) in `src/biomes/kit.ts` so authors aren't reinventing trig.

Registry pattern: a `Map<string, Biome>`, plus `getBiome(name)` that throws a clear error listing available biomes if the name is unknown.

### 3. Biomes (MVP ships two)

- **`bonsai`** (the flagship — must be genuinely screenshot-worthy; this is the art bar that determines whether anyone installs it): a stylized bonsai. Trunk grows from `growth` events; branches fan out with count/angle driven by commit density; `bloom` events place blossoms (colored circles) at contributor `origin` positions; `wither` events add falling autumn leaves near the canopy; `disruption` snaps a branch (a broken/severed branch stub). Warm earth tones for wood, green canopy, pink/amber blossoms. Use the seeded PRNG so it's deterministic.
- **`neon-vine`** (proves the plugin system works with a totally different aesthetic): a climbing cyberpunk vine, same events, dark background, neon strokes, glowing nodes for blooms. Consumes the identical `Garden` — demonstrates that the abstraction holds.

## Repo layout

```
repo-garden/
├── action.yml                 # composite/node20 action definition
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── core/
│   │   ├── history.ts         # simple-git → raw signals
│   │   ├── garden.ts          # raw → normalized Garden + seed
│   │   ├── render.ts          # load biome, render, sanitize SVG
│   │   └── commit.ts          # write + conditional commit
│   ├── biomes/
│   │   ├── types.ts           # Biome interface
│   │   ├── kit.ts             # PRNG, color, path helpers for authors
│   │   ├── registry.ts
│   │   ├── bonsai/index.ts
│   │   └── neon-vine/index.ts
│   └── util/
│       ├── prng.ts            # mulberry32 seeded PRNG
│       └── hash.ts            # stable SHA of event list → seed
├── dist/                      # ncc-bundled output (committed, referenced by action.yml)
├── docs/                      # docs site (see below)
├── examples/                  # sample workflow + rendered SVGs for the README
├── test/                      # vitest
└── README.md
```

## action.yml inputs

- `biome` (default `bonsai`)
- `output-path` (default `garden.svg`)
- `gap-threshold-days` (default `21`)
- `window` (default `all` — or e.g. `365d` to only render the last year)
- `width` / `height` (optional dimension overrides)
- `commit` (default `true` — if false, just write the file and set an output, letting the user commit)
- Standard: uses `GITHUB_TOKEN`.

Outputs: `svg-path`, `commit-sha` (if committed).

## What an INSTALLER does (put this in the README, verbatim, so the "how do I use it" story is concrete)

1. Add a marker to their README where the art should appear:
```html
<!-- repo-garden:start -->
<!-- repo-garden:end -->
```
(The committer injects/updates the SVG reference between these markers if present; otherwise writes the standalone SVG file and the user embeds `![garden](garden.svg)` themselves. Support both — marker-injection is the nicer UX.)

2. Add `.github/workflows/garden.yml`:
```yaml
name: Repo Garden
on:
  schedule: [{ cron: '0 3 * * *' }]   # nightly
  push: { branches: [main] }
  workflow_dispatch:
permissions:
  contents: write
jobs:
  grow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }       # full history — required
      - uses: aaryan/repo-garden@v1
        with:
          biome: bonsai
```

## Determinism test (write this test — it's the core invariant)

A vitest that builds a `Garden` from a fixed fixture event list, renders it twice, and asserts the two SVG strings are byte-identical. Add a second test asserting that changing one commit changes the output (so we know it's actually responsive, not frozen). Also test the seed is stable across runs for the same input.

## Docs site (MVP scope includes this)

Simple static docs (Astro or a single-page VitePress — pick the lighter one) with:
- Landing page: what it is, a live-rendered example gallery of both biomes.
- "Install" page: the two steps above.
- "Write a biome" page: the `Biome` interface, the `Garden` schema, the `kit.ts` helpers, and a walkthrough building a minimal biome from scratch. This page is the growth engine — make it genuinely good.
- Deploy config for GitHub Pages.

## Build order (do it in this sequence)

1. Scaffold: `package.json`, `tsconfig.json`, `action.yml`, ncc build script, vitest config.
2. `util/prng.ts` + `util/hash.ts` + the determinism test (red first).
3. `core/history.ts` — git reading, with a fixture-based test using a temp git repo.
4. `core/garden.ts` — normalization + seed. Make the determinism test pass.
5. `biomes/types.ts`, `kit.ts`, `registry.ts`.
6. `biomes/bonsai` — spend real effort here on the visual quality.
7. `biomes/neon-vine` — validate the abstraction holds with a second aesthetic.
8. `core/render.ts` (load + sanitize) and `core/commit.ts` (conditional commit).
9. `main.ts` wiring + `action.yml` finalize.
10. ncc bundle into `dist/`, commit it.
11. README with the installer instructions + example art.
12. Docs site.

## Guardrails / gotchas to respect

- **Determinism above all** — no `Math.random()`, no `Date.now()` in rendered output, no unsorted `Map`/`Set` iteration leaking into the SVG. Sort everything.
- **Sanitize biome SVG output** — strip `<script>`, `on*` attributes, and external `href`/`src`. Community biomes are untrusted code landing in people's repos.
- **Skip the commit when the SVG is unchanged** — critical for not spamming commit history.
- **Force-push detection is best-effort** — document that it may not fire in all CI contexts; degrade gracefully, never crash.
- **The neutral event schema is the contract** — resist adding bonsai-specific fields. If a biome needs something, it derives it from the neutral properties or reads `meta`.
- Keep the flagship bonsai art bar high: the whole distribution loop depends on the first render being something people *want* on their profile.

Start with step 1 and the determinism scaffolding. Ask me before making any decision that would compromise determinism or leak bonsai concepts into the core schema.
