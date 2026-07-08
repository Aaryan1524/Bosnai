/**
 * Renderer host: loads the selected biome, renders it, and sanitizes the
 * output. Biomes are untrusted community code landing in people's READMEs,
 * so the sanitizer is not optional.
 */

import { XMLValidator } from 'fast-xml-parser';
import { getBiome } from '../biomes/registry';
import type { Garden } from './garden';

export type RenderOptions = {
  biomeName: string;
};

const SCRIPT_TAG = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const SELF_CLOSING_SCRIPT_TAG = /<script\b[^>]*\/>/gi;
const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi;
const REF_ATTR = /\s+(xlink:href|href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi;

function isAllowedRef(value: string): boolean {
  return value.startsWith('#') || value.startsWith('data:');
}

/** Strip disallowed constructs from a raw SVG string. */
export function sanitizeSvg(svg: string): string {
  let out = svg.replace(SCRIPT_TAG, '').replace(SELF_CLOSING_SCRIPT_TAG, '');
  out = out.replace(EVENT_HANDLER_ATTR, '');
  out = out.replace(REF_ATTR, (match, _attrName: string, _quoted: string, dq?: string, sq?: string) => {
    const value = dq ?? sq ?? '';
    return isAllowedRef(value) ? match : '';
  });
  return out;
}

function extractRootDimension(svg: string, attr: 'width' | 'height'): string | null {
  const rootMatch = /<svg\b[^>]*>/i.exec(svg);
  if (rootMatch === null) {
    return null;
  }
  const attrMatch = new RegExp(`\\b${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(rootMatch[0]);
  return attrMatch?.[2] ?? attrMatch?.[3] ?? null;
}

/**
 * Render the given biome against the Garden and return a sanitized,
 * validated SVG string.
 *
 * Validates: well-formed XML, dimensions match the Garden's configured
 * width & height, no `<script>`, no `on*` attributes, no external
 * `href`/`src`/`xlink:href` (only `#fragment` or `data:` allowed).
 */
export function renderGarden(garden: Garden, options: RenderOptions): string {
  const biome = getBiome(options.biomeName);
  const raw = biome.render(garden);
  const sanitized = sanitizeSvg(raw);

  const validation = XMLValidator.validate(sanitized);
  if (validation !== true) {
    throw new Error(
      `Biome "${options.biomeName}" produced malformed SVG: ${validation.err.msg} (line ${validation.err.line})`,
    );
  }

  const expectedWidth = String(garden.config.width);
  const expectedHeight = String(garden.config.height);
  const actualWidth = extractRootDimension(sanitized, 'width');
  const actualHeight = extractRootDimension(sanitized, 'height');
  if (actualWidth !== expectedWidth || actualHeight !== expectedHeight) {
    throw new Error(
      `Biome "${options.biomeName}" rendered dimensions ${actualWidth}x${actualHeight}, expected ${expectedWidth}x${expectedHeight}`,
    );
  }

  return sanitized;
}
