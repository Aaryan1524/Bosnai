/**
 * Shared helpers for biome authors: seeded PRNG re-export, color-ramp
 * interpolation, and SVG path builders, so authors aren't reinventing trig.
 *
 * Every coordinate/measurement that reaches an SVG string should be passed
 * through `num()`. Trig (sin/cos/pow) can differ by a ULP across Node/V8
 * versions on values derived from seeded randomness; rounding to 2 decimal
 * places kills that entire class of cross-environment drift, in addition to
 * keeping the output compact.
 */

export { createPrng } from '../util/prng';
export type { Prng } from '../util/prng';

/** Round a number to 2 decimal places and format without trailing zeros. */
export function num(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  // Normalize -0 to 0.
  return (rounded === 0 ? 0 : rounded).toString();
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function toHex(r: number, g: number, b: number): string {
  const channel = (v: number): string =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Linear-interpolate between two hex colors ("#rrggbb"), t in [0,1]. */
export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Build a multi-stop color ramp sampler from an ordered list of hex colors. */
export function colorRamp(stops: readonly string[]): (t: number) => string {
  if (stops.length === 0) {
    throw new Error('colorRamp: requires at least one color stop');
  }
  return (t: number): string => {
    if (stops.length === 1) {
      return stops[0] as string;
    }
    const clamped = Math.min(1, Math.max(0, t));
    const scaled = clamped * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(scaled));
    const localT = scaled - i;
    return lerpColor(stops[i] as string, stops[i + 1] as string, localT);
  };
}

export type Point = { x: number; y: number };

/** Build a smooth SVG path `d` string through a sequence of points. */
export function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) {
    return '';
  }
  const first = points[0] as Point;
  if (points.length === 1) {
    return `M ${num(first.x)},${num(first.y)}`;
  }

  let d = `M ${num(first.x)},${num(first.y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i] as Point;
    const next = points[i + 1] as Point;
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${num(curr.x)},${num(curr.y)} ${num(midX)},${num(midY)}`;
  }
  const last = points[points.length - 1] as Point;
  d += ` L ${num(last.x)},${num(last.y)}`;
  return d;
}

/** Build a tapered quadrilateral branch segment path from `from` to `to`. */
export function branchSegment(from: Point, to: Point, widthStart: number, widthEnd: number): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const p1: Point = { x: from.x + (nx * widthStart) / 2, y: from.y + (ny * widthStart) / 2 };
  const p2: Point = { x: to.x + (nx * widthEnd) / 2, y: to.y + (ny * widthEnd) / 2 };
  const p3: Point = { x: to.x - (nx * widthEnd) / 2, y: to.y - (ny * widthEnd) / 2 };
  const p4: Point = { x: from.x - (nx * widthStart) / 2, y: from.y - (ny * widthStart) / 2 };

  return [
    `M ${num(p1.x)},${num(p1.y)}`,
    `L ${num(p2.x)},${num(p2.y)}`,
    `L ${num(p3.x)},${num(p3.y)}`,
    `L ${num(p4.x)},${num(p4.y)}`,
    'Z',
  ].join(' ');
}

/** Wrap inner SVG markup in a complete, namespaced `<svg>` document. */
export function svgDoc(width: number, height: number, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}">${inner}</svg>`;
}
