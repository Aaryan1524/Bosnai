/**
 * Renderer host: loads the selected biome, renders it, and sanitizes the
 * output. Biomes are untrusted community code landing in people's READMEs,
 * so the sanitizer is not optional.
 */

import type { Garden } from './garden';

export type RenderOptions = {
  biomeName: string;
};

/**
 * Render the given biome against the Garden and return a sanitized,
 * validated SVG string.
 *
 * Validates: well-formed XML, dimensions match the declared/overridden
 * width & height, no `<script>`, no `on*` attributes, no external
 * `href`/`src`/`xlink:href` (only `#fragment` or `data:` allowed).
 * TODO(scaffold): implement
 */
export function renderGarden(garden: Garden, options: RenderOptions): string {
  throw new Error('TODO(scaffold): implement renderGarden');
}

/** Strip disallowed constructs from a raw SVG string. TODO(scaffold): implement */
export function sanitizeSvg(svg: string): string {
  throw new Error('TODO(scaffold): implement sanitizeSvg');
}
