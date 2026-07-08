/**
 * Shared helpers for biome authors: seeded PRNG re-export, color-ramp
 * interpolation, and SVG path builders, so authors aren't reinventing trig.
 */

export { createPrng } from '../util/prng';
export type { Prng } from '../util/prng';

/** Linear-interpolate between two hex colors ("#rrggbb"), t in [0,1]. TODO(scaffold): implement */
export function lerpColor(a: string, b: string, t: number): string {
  throw new Error('TODO(scaffold): implement lerpColor');
}

/** Build a multi-stop color ramp sampler from an ordered list of hex colors. TODO(scaffold): implement */
export function colorRamp(stops: readonly string[]): (t: number) => string {
  throw new Error('TODO(scaffold): implement colorRamp');
}

export type Point = { x: number; y: number };

/** Build a smooth SVG path `d` string through a sequence of points. TODO(scaffold): implement */
export function smoothPath(points: readonly Point[]): string {
  throw new Error('TODO(scaffold): implement smoothPath');
}

/** Build a tapered quadratic branch segment path from `from` to `to`. TODO(scaffold): implement */
export function branchSegment(from: Point, to: Point, widthStart: number, widthEnd: number): string {
  throw new Error('TODO(scaffold): implement branchSegment');
}

/** Wrap inner SVG markup in a complete, namespaced `<svg>` document. TODO(scaffold): implement */
export function svgDoc(width: number, height: number, inner: string): string {
  throw new Error('TODO(scaffold): implement svgDoc');
}
