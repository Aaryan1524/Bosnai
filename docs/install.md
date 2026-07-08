# Install

Two steps: a marker in your README, and a workflow file.

## 1. Add a marker to your README

Add these two lines wherever you want the art to appear:

```html
<!-- repo-garden:start -->
<!-- repo-garden:end -->
```

If the markers are present, the action injects (and later updates) an
`![Repo Garden](path)` reference between them on every run. If the markers
are absent, it just writes the SVG file to disk and sets an output — you
embed it yourself. Marker injection is the nicer experience, but not
required.

## 2. Add a workflow

Create `.github/workflows/garden.yml`:

```yaml
name: Repo Garden
on:
  schedule: [{ cron: '0 3 * * *' }] # nightly
  push: { branches: [main] }
  workflow_dispatch:
permissions:
  contents: write
jobs:
  grow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 } # full history — required
      - uses: Aaryan1524/Bosnai@v1
        with:
          biome: bonsai
```

`fetch-depth: 0` is required — a shallow checkout only has one commit of
history, and there's nothing to grow from.

`permissions: contents: write` is required so the action can commit the
rendered SVG (and the updated README) back to the repo using the
workflow's `GITHUB_TOKEN`.

That's it. On the next scheduled run, push to `main`, or manual dispatch,
the action reads your history and commits the art.

## Inputs

| Input                | Default                | What it does                                                       |
| --------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `biome`               | `bonsai`                | Which registered biome to render (`bonsai`, `neon-vine`, ...).         |
| `output-path`         | `garden.svg`            | Where the rendered SVG is written, relative to the repo root.          |
| `gap-threshold-days`  | `21`                    | Days of silence before a span counts as a `wither` event.               |
| `window`              | `all`                   | `all`, or a duration like `365d` to only render recent history.         |
| `width` / `height`    | *(biome default)*       | Optional pixel overrides for the rendered SVG's dimensions.             |
| `commit`              | `true`                  | If `false`, only writes the file and sets outputs — you commit it.     |
| `github-token`        | the workflow's `GITHUB_TOKEN` | Token used to push the commit.                                  |

**Outputs:** `svg-path` (where the SVG was written) and `commit-sha`
(empty string if nothing changed, or if `commit: false`).

## Choosing a window

By default the action renders your *entire* history. For a repo with
years of commits, that can mean a very dense trunk. Set `window: 365d` (or
any `<n>d` duration) to only grow from the last year — older events are
excluded entirely, not just visually de-emphasized.

```yaml
- uses: Aaryan1524/Bosnai@v1
  with:
    biome: bonsai
    window: 365d
```

## If nothing seems to happen

The action skips the commit entirely when the rendered SVG is
byte-identical to what's already committed — this is intentional, not a
bug. See [Determinism](/#gallery) in the README for why. If you push new
commits and still see no change, check that:

- `fetch-depth: 0` is set on the checkout step (a shallow clone changes
  what history is visible, which changes the render).
- The workflow actually ran — check the Actions tab for the job's log.
- `commit` wasn't set to `false`.
