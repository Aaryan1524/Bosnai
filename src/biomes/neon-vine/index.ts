/**
 * neon-vine — a climbing cyberpunk vine on a dark background. Proves the
 * plugin system works with a totally different aesthetic while consuming
 * the identical Garden schema as bonsai: same event kinds, same seed,
 * completely different visual vocabulary (glowing strokes instead of
 * filled wood, circuit-style nodes instead of organic blobs).
 */

import { defineBiome } from '../types';
import { createPrng, num, smoothPath, svgDoc, type Point, type Prng } from '../kit';
import type { Garden, GrowthEvent } from '../../core/garden';

const PALETTE = {
  bgTop: '#0a0e27',
  bgBottom: '#1a0b2e',
  vine: '#00ffc8',
  vineDim: '#0d3d33',
  tendril: '#ff2fd0',
  leaf: '#39ff14',
  bloom: ['#00fff2', '#ff2fd0', '#faff00'],
  glitch: ['#ff003c', '#00fff2'],
  node: '#faff00',
  grid: '#2a2a5a',
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

type Stage = { density: number; intensity: number };

/** Bucket growth events (in existing age order) into a fixed number of climb stages. */
function bucketGrowth(events: readonly GrowthEvent[], stageCount: number): Stage[] {
  if (events.length === 0) {
    return Array.from({ length: stageCount }, () => ({ density: 0, intensity: 0.3 }));
  }
  const bucketSize = Math.ceil(events.length / stageCount);
  const stages: Stage[] = [];
  let maxCount = 1;
  const rawBuckets: GrowthEvent[][] = [];
  for (let i = 0; i < stageCount; i++) {
    const bucket = events.slice(i * bucketSize, (i + 1) * bucketSize);
    rawBuckets.push(bucket);
    maxCount = Math.max(maxCount, bucket.length);
  }
  for (const bucket of rawBuckets) {
    stages.push({
      density: bucket.length / maxCount,
      intensity: bucket.length === 0 ? 0 : mean(bucket.map((e) => e.intensity)),
    });
  }
  return stages;
}

/** Wrap markup in a soft glow filter reference. Filter defs are local (url(#id)), never external. */
function glow(inner: string, filterId: string): string {
  return `<g filter="url(#${filterId})">${inner}</g>`;
}

function diamondLeaf(center: Point, size: number, rot: number): string {
  const pts: Point[] = [
    { x: center.x, y: center.y - size },
    { x: center.x + size * 0.6, y: center.y },
    { x: center.x, y: center.y + size },
    { x: center.x - size * 0.6, y: center.y },
  ];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${num(p.x)},${num(p.y)}`).join(' ') + ' Z';
  return `<path d="${d}" fill="${PALETTE.leaf}" opacity="0.85" transform="rotate(${num(rot)} ${num(center.x)} ${num(center.y)})"/>`;
}

function tendril(start: Point, angleRad: number, length: number, rng: Prng): { d: string; tip: Point } {
  const curl = rng.range(0.6, 1.3) * (rng.next() > 0.5 ? 1 : -1);
  const mid: Point = {
    x: start.x + Math.cos(angleRad) * length * 0.5,
    y: start.y + Math.sin(angleRad) * length * 0.5,
  };
  const tip: Point = {
    x: mid.x + Math.cos(angleRad + curl) * length * 0.4,
    y: mid.y + Math.sin(angleRad + curl) * length * 0.4,
  };
  return { d: smoothPath([start, mid, tip]), tip };
}

function bloomNode(center: Point, size: number, rng: Prng, glowId: string): string {
  const color = PALETTE.bloom[rng.int(PALETTE.bloom.length)] as string;
  return (
    glow(`<circle cx="${num(center.x)}" cy="${num(center.y)}" r="${num(size)}" fill="${color}"/>`, glowId) +
    `<circle cx="${num(center.x)}" cy="${num(center.y)}" r="${num(size * 0.45)}" fill="#ffffff"/>`
  );
}

/** A dimmed, flickering stretch of vine: a broken dashed ring with static ticks radiating out. */
function flickerMark(center: Point, rng: Prng): string {
  let out = `<circle cx="${num(center.x)}" cy="${num(center.y)}" r="15" fill="none" stroke="${PALETTE.vineDim}" stroke-width="2.5" stroke-dasharray="4 5" opacity="0.9"/>`;
  for (let i = 0; i < 5; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const inner = 16 + rng.range(0, 3);
    const len = rng.range(5, 11);
    const x1 = center.x + Math.cos(angle) * inner;
    const y1 = center.y + Math.sin(angle) * inner;
    const x2 = center.x + Math.cos(angle) * (inner + len);
    const y2 = center.y + Math.sin(angle) * (inner + len);
    out += `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${PALETTE.vine}" stroke-width="1.5" opacity="0.45"/>`;
  }
  return out;
}

/** A glitch-cut: an RGB-split displaced bar marking a force-push/rewrite. */
function glitchMark(center: Point, rng: Prng): string {
  let out = '';
  for (let i = 0; i < PALETTE.glitch.length; i++) {
    const color = PALETTE.glitch[i] as string;
    const offset = (i === 0 ? -1 : 1) * rng.range(4, 9);
    out += `<rect x="${num(center.x - 22 + offset)}" y="${num(center.y - 3 + i * 4)}" width="44" height="3" fill="${color}" opacity="0.75"/>`;
  }
  out += `<line x1="${num(center.x - 26)}" y1="${num(center.y)}" x2="${num(center.x + 26)}" y2="${num(center.y)}" stroke="#ffffff" stroke-width="1" opacity="0.5"/>`;
  return out;
}

/** A circuit-style junction node marking a merge. */
function junctionNode(center: Point): string {
  const r = 9;
  return (
    `<rect x="${num(center.x - r)}" y="${num(center.y - r)}" width="${num(r * 2)}" height="${num(r * 2)}" fill="none" stroke="${PALETTE.node}" stroke-width="2" transform="rotate(45 ${num(center.x)} ${num(center.y)})"/>` +
    `<line x1="${num(center.x - r)}" y1="${num(center.y)}" x2="${num(center.x + r)}" y2="${num(center.y)}" stroke="${PALETTE.node}" stroke-width="1.5"/>` +
    `<line x1="${num(center.x)}" y1="${num(center.y - r)}" x2="${num(center.x)}" y2="${num(center.y + r)}" stroke="${PALETTE.node}" stroke-width="1.5"/>`
  );
}

function pointAtAge(points: readonly Point[], age: number): Point {
  const idx = clamp(Math.round(age * (points.length - 1)), 0, points.length - 1);
  return points[idx] as Point;
}

function render(garden: Garden): string {
  const width = garden.config.width || 800;
  const height = garden.config.height || 600;
  const rng = createPrng(garden.seed);

  const growthEvents = garden.events.filter((e) => e.kind === 'growth');
  const bloomEvents = garden.events.filter((e) => e.kind === 'bloom');
  const witherEvents = garden.events.filter((e) => e.kind === 'wither');
  const disruptionEvents = garden.events.filter((e) => e.kind === 'disruption');
  const convergenceEvents = garden.events.filter((e) => e.kind === 'convergence');

  const stageCount = clamp(growthEvents.length || 6, 6, 26);
  const stages = bucketGrowth(growthEvents, stageCount);

  const baseX = width / 2;
  const baseY = height - 40;
  const climbHeight = height * 0.82;
  const stepHeight = climbHeight / stageCount;

  const vinePoints: Point[] = [{ x: baseX, y: baseY }];
  const tendrilSvgParts: string[] = [];
  const leafSvgParts: string[] = [];
  const tendrilTips: Point[] = [];

  let x = baseX;
  let y = baseY;
  let wavePhase = rng.range(0, Math.PI * 2);

  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i] as Stage;
    wavePhase += 0.4 + stage.density * 0.2;
    const amplitude = 30 + stage.density * 45;
    x = baseX + Math.sin(wavePhase) * amplitude;
    y -= stepHeight;
    vinePoints.push({ x, y });

    const isTendrilStage = i >= 1 && i % 2 === 0;
    if (isTendrilStage) {
      const side = rng.next() > 0.5 ? 1 : -1;
      const angle = side > 0 ? -0.3 : Math.PI + 0.3;
      const len = 35 + stage.density * 55 + stage.intensity * 25;
      const { d, tip } = tendril({ x, y }, angle, len, rng);
      tendrilSvgParts.push(`<path d="${d}" stroke="${PALETTE.tendril}" stroke-width="2.5" fill="none" opacity="0.85"/>`);
      tendrilTips.push(tip);
      if (rng.next() > 0.4) {
        leafSvgParts.push(diamondLeaf(tip, 9 + stage.intensity * 5, rng.range(0, 360)));
      }
    }
    if (rng.next() > 0.55) {
      leafSvgParts.push(diamondLeaf({ x, y }, 7 + stage.intensity * 4, rng.range(0, 360)));
    }
  }

  const vinePath = smoothPath(vinePoints);
  const anchors = vinePoints.concat(tendrilTips);

  const blossomSvg = bloomEvents
    .map((e) => {
      const anchor = pointAtAge(anchors, e.age);
      const center: Point = {
        x: clamp(anchor.x + (e.origin - 0.5) * 70, 20, width - 20),
        y: clamp(anchor.y + (e.origin - 0.5) * 50, 20, height - 20),
      };
      return bloomNode(center, 6 + e.intensity * 4, rng, 'glow-soft');
    })
    .join('');

  const flickerSvg = witherEvents.map((e) => flickerMark(pointAtAge(vinePoints, e.age), rng)).join('');
  const glitchSvg = disruptionEvents.map((e) => glitchMark(pointAtAge(vinePoints, e.age), rng)).join('');
  const junctionSvg = convergenceEvents.map((e) => junctionNode(pointAtAge(vinePoints, e.age))).join('');

  let gridSvg = '';
  const gridSpacing = 60;
  for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
    gridSvg += `<line x1="${num(gx)}" y1="0" x2="${num(gx)}" y2="${num(height)}" stroke="${PALETTE.grid}" stroke-width="1" opacity="0.25"/>`;
  }
  for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
    gridSvg += `<line x1="0" y1="${num(gy)}" x2="${num(width)}" y2="${num(gy)}" stroke="${PALETTE.grid}" stroke-width="1" opacity="0.25"/>`;
  }

  const scene = `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${PALETTE.bgTop}"/>
        <stop offset="1" stop-color="${PALETTE.bgBottom}"/>
      </linearGradient>
      <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="glow-soft" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="0" y="0" width="${num(width)}" height="${num(height)}" fill="url(#bg)"/>
    ${gridSvg}
    ${tendrilSvgParts.join('')}
    ${glow(`<path d="${vinePath}" stroke="${PALETTE.vine}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`, 'glow-strong')}
    ${leafSvgParts.join('')}
    ${blossomSvg}
    ${flickerSvg}
    ${glitchSvg}
    ${junctionSvg}
  `;

  return svgDoc(width, height, scene);
}

export const neonVine = defineBiome({
  name: 'neon-vine',
  displayName: 'Neon Vine',
  author: 'Aaryan',
  description: 'A climbing cyberpunk vine that glows with your commit history.',
  render,
  defaultDimensions: { width: 800, height: 600 },
});
