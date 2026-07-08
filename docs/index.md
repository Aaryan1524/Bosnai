---
layout: home

hero:
  name: Repo Garden
  text: Your commit history, growing in your README
  tagline: A deterministic, procedurally-generated botanical SVG rendered from your repo's git log — committed back only when the history actually changes.
  actions:
    - theme: brand
      text: Get Started
      link: /install
    - theme: alt
      text: Write a Biome
      link: /write-a-biome
    - theme: alt
      text: View on GitHub
      link: https://github.com/Aaryan1524/Bosnai

features:
  - title: Deterministic by construction
    details: Same git history always renders a byte-identical SVG. Every seed derives from a SHA of the normalized event list — no Math.random(), no Date.now() in the render path, no commit-history churn from meaningless diffs.
  - title: A real plugin system
    details: Biomes are typed TypeScript modules with a render(garden) function, not a JSON theme format. Generative art needs loops and trigonometry, not declarative config.
  - title: Two biomes, one Garden
    details: bonsai and neon-vine consume the identical neutral event schema with wildly different aesthetics — proof the abstraction holds for whatever biome you write next.
---

## Gallery

Both renders below come from the *exact same* sample git history — the
same commits, contributors, gaps, merges, and force-push. Only the biome
differs.

<div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-top:32px">
  <figure style="margin:0;text-align:center">
    <img src="/bonsai.svg" width="380" alt="Bonsai biome example" />
    <figcaption><code>bonsai</code></figcaption>
  </figure>
  <figure style="margin:0;text-align:center">
    <img src="/neon-vine.svg" width="380" alt="Neon Vine biome example" />
    <figcaption><code>neon-vine</code></figcaption>
  </figure>
</div>
