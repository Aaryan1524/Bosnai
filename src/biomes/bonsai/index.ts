/**
 * bonsai — the flagship biome. A stylized bonsai tree: trunk grows from
 * `growth` events, branches fan out with commit-density-driven count/angle,
 * `bloom` events place blossoms at contributor origins, `wither` events
 * scatter falling autumn leaves, `disruption` snaps a branch, `convergence`
 * marks a graft.
 */

import { defineBiome } from '../types';
import { branchSegment, createPrng, num, svgDoc, type Point, type Prng } from '../kit';
import type { Garden, GrowthEvent } from '../../core/garden';

const PALETTE = {
  skyTop: '#fdf6e3',
  skyBottom: '#f6e2b3',
  ground: '#c9a267',
  pot: '#a85f3c',
  potRim: '#8a4a2e',
  barkDark: '#5b3a24',
  barkLight: '#8a5a34',
  canopy: ['#dff2c2', '#8fc76b', '#4a7c3a'],
  blossom: ['#ff9ecf', '#ffc94d'],
  autumn: ['#e0a940', '#c1440e', '#8a5a2c'],
  disruption: '#4a4a4a',
  crack: '#b23b3b',
  graft: '#6b4226',
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

type TrunkStage = { density: number; intensity: number };

/** Bucket growth events (in existing age order) into a fixed number of trunk stages. */
function bucketGrowth(events: readonly GrowthEvent[], stageCount: number): TrunkStage[] {
  if (events.length === 0) {
    return Array.from({ length: stageCount }, () => ({ density: 0, intensity: 0.3 }));
  }
  const bucketSize = Math.ceil(events.length / stageCount);
  const stages: TrunkStage[] = [];
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

type Limb = { points: Point[]; widths: number[] };

/** Build a gently bent 2-segment limb from `start` in direction `angleRad`. */
function buildLimb(
  start: Point,
  angleRad: number,
  length: number,
  widthStart: number,
  widthEnd: number,
  rng: Prng,
): Limb {
  const bend = rng.range(-0.35, 0.35);
  const mid: Point = {
    x: start.x + Math.cos(angleRad) * length * 0.5,
    y: start.y + Math.sin(angleRad) * length * 0.5,
  };
  const end: Point = {
    x: mid.x + Math.cos(angleRad + bend) * length * 0.5,
    y: mid.y + Math.sin(angleRad + bend) * length * 0.5,
  };
  const widthMid = (widthStart + widthEnd) / 2;
  return { points: [start, mid, end], widths: [widthStart, widthMid, widthEnd] };
}

function limbToSvg(limb: Limb, color: string): string {
  let out = '';
  for (let i = 0; i < limb.points.length - 1; i++) {
    const from = limb.points[i] as Point;
    const to = limb.points[i + 1] as Point;
    const wFrom = limb.widths[i] as number;
    const wTo = limb.widths[i + 1] as number;
    out += `<path d="${branchSegment(from, to, wFrom, wTo)}" fill="${color}"/>`;
  }
  return out;
}

/**
 * A layered foliage blob centered at `center`: a dark shadow mass at the
 * back, mid-green body blobs for volume, and a few light highlights biased
 * toward the upper-left (simulating a consistent light source) so clusters
 * read as rounded canopy mass rather than flat overlapping circles.
 */
function foliageCluster(center: Point, radius: number, rng: Prng): string {
  let out = '';

  // Shadow mass: slightly larger, offset down-right, darkest tone.
  out += `<ellipse cx="${num(center.x + radius * 0.12)}" cy="${num(center.y + radius * 0.18)}" rx="${num(radius * 0.95)}" ry="${num(radius * 0.78)}" fill="${PALETTE.canopy[2]}"/>`;

  // Body: several mid-tone blobs distributed around the center for an
  // irregular but cohesive silhouette.
  const bodyCount = 6;
  for (let i = 0; i < bodyCount; i++) {
    const angle = (i / bodyCount) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const dist = radius * rng.range(0.2, 0.5);
    const cx = center.x + Math.cos(angle) * dist;
    const cy = center.y + Math.sin(angle) * dist * 0.75;
    const r = radius * rng.range(0.5, 0.72);
    const tone = rng.next() > 0.4 ? PALETTE.canopy[1] : PALETTE.canopy[2];
    out += `<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(r)}" ry="${num(r * 0.82)}" fill="${tone}"/>`;
  }

  // Core: a solid mid-green mass tying the body together.
  out += `<ellipse cx="${num(center.x)}" cy="${num(center.y)}" rx="${num(radius * 0.62)}" ry="${num(radius * 0.52)}" fill="${PALETTE.canopy[1]}"/>`;

  // Highlights: small light blobs on the upper-left quadrant only.
  const highlightCount = 3;
  for (let i = 0; i < highlightCount; i++) {
    const angle = Math.PI * 1.0 + rng.range(0, Math.PI * 0.5);
    const dist = radius * rng.range(0.15, 0.45);
    const cx = center.x + Math.cos(angle) * dist;
    const cy = center.y + Math.sin(angle) * dist * 0.75;
    const r = radius * rng.range(0.22, 0.36);
    out += `<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(r)}" ry="${num(r * 0.85)}" fill="${PALETTE.canopy[0]}" opacity="0.85"/>`;
  }

  return out;
}

function blossomMark(center: Point, size: number, rng: Prng): string {
  const color = PALETTE.blossom[rng.int(PALETTE.blossom.length)] as string;
  const petalCount = 5;
  let out = '<g>';
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = center.x + Math.cos(angle) * size * 0.5;
    const py = center.y + Math.sin(angle) * size * 0.5;
    out += `<circle cx="${num(px)}" cy="${num(py)}" r="${num(size * 0.4)}" fill="${color}" opacity="0.9"/>`;
  }
  out += `<circle cx="${num(center.x)}" cy="${num(center.y)}" r="${num(size * 0.35)}" fill="#ffe9a8"/>`;
  out += '</g>';
  return out;
}

/** A small teardrop leaf shape, falling near/below the canopy. */
function autumnLeaf(center: Point, size: number, rng: Prng): string {
  const color = PALETTE.autumn[rng.int(PALETTE.autumn.length)] as string;
  const dx = rng.range(-40, 40);
  const dy = rng.range(15, 75);
  const rot = rng.range(0, 360);
  const x = center.x + dx;
  const y = center.y + dy;
  const d = [
    `M ${num(x)},${num(y - size)}`,
    `Q ${num(x + size * 0.9)},${num(y - size * 0.3)} ${num(x)},${num(y + size)}`,
    `Q ${num(x - size * 0.9)},${num(y - size * 0.3)} ${num(x)},${num(y - size)}`,
    'Z',
  ].join(' ');
  return `<path d="${d}" fill="${color}" opacity="0.88" transform="rotate(${num(rot)} ${num(x)} ${num(y)})"/>`;
}

/** A snapped branch stub: a short tapered stump ending in a jagged break, with a couple of wood-chip flecks. */
function disruptionMark(center: Point, rng: Prng): string {
  const dir = rng.pick([-1, 1]) as number;
  const stubLen = 22;
  const stubEnd: Point = { x: center.x + dir * stubLen, y: center.y - 6 };
  const stub = branchSegment(center, stubEnd, 12, 7);
  const jag = [
    { x: stubEnd.x, y: stubEnd.y - 7 },
    { x: stubEnd.x + dir * 7, y: stubEnd.y - 1 },
    { x: stubEnd.x - dir * 2, y: stubEnd.y + 4 },
    { x: stubEnd.x + dir * 6, y: stubEnd.y + 9 },
  ];
  const jagD = jag.map((p, i) => `${i === 0 ? 'M' : 'L'} ${num(p.x)},${num(p.y)}`).join(' ');
  const chip1: Point = { x: stubEnd.x + dir * 10, y: stubEnd.y - 10 };
  const chip2: Point = { x: stubEnd.x + dir * 4, y: stubEnd.y + 12 };
  return (
    `<path d="${stub}" fill="${PALETTE.barkDark}"/>` +
    `<path d="${jagD}" stroke="${PALETTE.crack}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${num(chip1.x)}" cy="${num(chip1.y)}" r="2.5" fill="${PALETTE.barkLight}"/>` +
    `<circle cx="${num(chip2.x)}" cy="${num(chip2.y)}" r="2" fill="${PALETTE.barkLight}"/>`
  );
}

/** A graft ring marking a merge, with small radiating ticks. */
function convergenceMark(center: Point): string {
  let ticks = '';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const inner: Point = { x: center.x + Math.cos(a) * 9, y: center.y + Math.sin(a) * 9 };
    const outer: Point = { x: center.x + Math.cos(a) * 13, y: center.y + Math.sin(a) * 13 };
    ticks += `<line x1="${num(inner.x)}" y1="${num(inner.y)}" x2="${num(outer.x)}" y2="${num(outer.y)}" stroke="${PALETTE.graft}" stroke-width="2"/>`;
  }
  return (
    ticks +
    `<circle cx="${num(center.x)}" cy="${num(center.y)}" r="8" fill="none" stroke="${PALETTE.graft}" stroke-width="3"/>` +
    `<circle cx="${num(center.x)}" cy="${num(center.y)}" r="3" fill="${PALETTE.graft}"/>`
  );
}

function pointAtAge(trunkPoints: readonly Point[], age: number): Point {
  const idx = clamp(Math.round(age * (trunkPoints.length - 1)), 0, trunkPoints.length - 1);
  return trunkPoints[idx] as Point;
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

  const stageCount = clamp(growthEvents.length || 6, 6, 22);
  const stages = bucketGrowth(growthEvents, stageCount);

  const potTopY = height * 0.86;
  const baseX = width / 2;
  const baseY = potTopY;
  const trunkHeight = height * 0.58;
  const stepHeight = trunkHeight / stageCount;

  const trunkPoints: Point[] = [{ x: baseX, y: baseY }];
  const trunkWidths: number[] = [];
  const maxWidth = 20;
  const minWidth = 4;

  let angle = -Math.PI / 2;
  let x = baseX;
  let y = baseY;

  const branchLimbs: { limb: Limb; color: string }[] = [];
  const foliageCenters: Point[] = [];

  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i] as TrunkStage;
    const sway = (rng.next() - 0.5) * (0.25 + stage.density * 0.35);
    // Gently pull the angle back toward vertical each stage so the trunk
    // sways organically but doesn't random-walk into an implausible,
    // ever-increasing lean over many growth stages.
    const restoring = (angle - -Math.PI / 2) * -0.2;
    angle = clamp(angle + sway + restoring, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    x += Math.cos(angle) * stepHeight;
    y += Math.sin(angle) * stepHeight;
    trunkPoints.push({ x, y });
    const widthT = 1 - i / stageCount;
    trunkWidths.push(minWidth + (maxWidth - minWidth) * widthT);

    const isBranchStage = i >= 2 && i % 3 === 0 && i <= stageCount - 2;
    if (isBranchStage) {
      const side = i % 6 === 0 ? -1 : 1;
      const branchAngle = -Math.PI / 2 + side * (0.55 + rng.range(0, 0.5));
      const branchLen = 45 + stage.density * 70 + stage.intensity * 30 + rng.range(0, 20);
      const widthHere = minWidth + (maxWidth - minWidth) * (1 - i / stageCount);
      const limb = buildLimb(
        { x, y },
        branchAngle,
        branchLen,
        clamp(widthHere * 0.6, 2, maxWidth),
        minWidth,
        rng,
      );
      branchLimbs.push({ limb, color: rng.next() > 0.5 ? PALETTE.barkDark : PALETTE.barkLight });
      const tip = limb.points[limb.points.length - 1] as Point;
      foliageCenters.push(tip);
    }
  }

  trunkWidths.push(minWidth);
  foliageCenters.push(trunkPoints[trunkPoints.length - 1] as Point);

  let trunkSvg = '';
  for (let i = 0; i < trunkPoints.length - 1; i++) {
    const from = trunkPoints[i] as Point;
    const to = trunkPoints[i + 1] as Point;
    const wFrom = trunkWidths[i] as number;
    const wTo = trunkWidths[i + 1] as number;
    trunkSvg += `<path d="${branchSegment(from, to, wFrom, wTo)}" fill="${PALETTE.barkDark}"/>`;
  }

  const branchSvg = branchLimbs.map(({ limb, color }) => limbToSvg(limb, color)).join('');

  const foliageSvg = foliageCenters.map((center) => foliageCluster(center, 55 + rng.range(-8, 8), rng)).join('');

  /** Nearest canopy cluster for a given timeline position, so blooms/leaves land among the foliage. */
  const clusterAtAge = (age: number): Point => {
    const idx = clamp(Math.round(age * (foliageCenters.length - 1)), 0, foliageCenters.length - 1);
    return foliageCenters[idx] as Point;
  };

  const blossomSvg = bloomEvents
    .map((e) => {
      const anchor = clusterAtAge(e.age);
      const center: Point = {
        x: clamp(anchor.x + (e.origin - 0.5) * 90, 20, width - 20),
        y: clamp(anchor.y + (e.origin - 0.5) * 60, 20, height - 20),
      };
      return blossomMark(center, 12 + e.intensity * 7, rng);
    })
    .join('');

  const leafSvg = witherEvents
    .flatMap((e) => {
      const anchor = clusterAtAge(e.age);
      const count = 3 + Math.round(e.intensity * 5);
      return Array.from({ length: count }, () => autumnLeaf(anchor, 10 + e.intensity * 7, rng));
    })
    .join('');

  const disruptionSvg = disruptionEvents
    .map((e) => disruptionMark(pointAtAge(trunkPoints, e.age), rng))
    .join('');

  const convergenceSvg = convergenceEvents
    .map((e) => convergenceMark(pointAtAge(trunkPoints, e.age)))
    .join('');

  const groundY = potTopY + 10;
  const potWidth = 140;
  const potHeight = 34;

  const scene = `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${PALETTE.skyTop}"/>
        <stop offset="1" stop-color="${PALETTE.skyBottom}"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${num(width)}" height="${num(height)}" fill="url(#sky)"/>
    <ellipse cx="${num(baseX)}" cy="${num(groundY + 8)}" rx="${num(potWidth * 0.75)}" ry="14" fill="${PALETTE.ground}" opacity="0.6"/>
    <path d="M ${num(baseX - potWidth / 2)},${num(groundY)} L ${num(baseX - potWidth / 2 + 12)},${num(groundY + potHeight)} L ${num(baseX + potWidth / 2 - 12)},${num(groundY + potHeight)} L ${num(baseX + potWidth / 2)},${num(groundY)} Z" fill="${PALETTE.pot}"/>
    <rect x="${num(baseX - potWidth / 2 - 4)}" y="${num(groundY - 6)}" width="${num(potWidth + 8)}" height="10" rx="3" fill="${PALETTE.potRim}"/>
    ${trunkSvg}
    ${branchSvg}
    ${foliageSvg}
    ${blossomSvg}
    ${leafSvg}
    ${disruptionSvg}
    ${convergenceSvg}
  `;

  return svgDoc(width, height, scene);
}

export const bonsai = defineBiome({
  name: 'bonsai',
  displayName: 'Bonsai',
  author: 'Aaryan',
  description: 'A stylized bonsai tree that grows from your commit history.',
  render,
  defaultDimensions: { width: 800, height: 600 },
});
