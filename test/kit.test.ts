import { describe, expect, it } from 'vitest';
import { branchSegment, colorRamp, lerpColor, num, smoothPath, svgDoc } from '../src/biomes/kit';

describe('num', () => {
  it('rounds to 2 decimal places', () => {
    expect(num(1.23456)).toBe('1.23');
  });

  it('strips trailing zeros via numeric formatting', () => {
    expect(num(3)).toBe('3');
    expect(num(3.1)).toBe('3.1');
  });

  it('normalizes negative zero to 0', () => {
    expect(num(-0)).toBe('0');
  });
});

describe('lerpColor', () => {
  it('returns the start color at t=0 and end color at t=1', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000');
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('interpolates midpoint colors correctly', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('colorRamp', () => {
  it('samples across multiple stops in order', () => {
    const ramp = colorRamp(['#000000', '#ff0000', '#ffffff']);
    expect(ramp(0)).toBe('#000000');
    expect(ramp(0.5)).toBe('#ff0000');
    expect(ramp(1)).toBe('#ffffff');
  });

  it('clamps t outside [0, 1]', () => {
    const ramp = colorRamp(['#000000', '#ffffff']);
    expect(ramp(-1)).toBe('#000000');
    expect(ramp(2)).toBe('#ffffff');
  });
});

describe('smoothPath', () => {
  it('produces a valid SVG path d string through given points', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }]);
    expect(d).toMatch(/^M 0,0/);
    expect(d).toContain('Q');
    expect(d).toContain('L');
  });

  it('handles a single point', () => {
    expect(smoothPath([{ x: 5, y: 5 }])).toBe('M 5,5');
  });

  it('handles an empty list', () => {
    expect(smoothPath([])).toBe('');
  });
});

describe('branchSegment', () => {
  it('produces a tapered closed path from widthStart to widthEnd', () => {
    const d = branchSegment({ x: 0, y: 0 }, { x: 0, y: 100 }, 10, 2);
    expect(d).toMatch(/^M /);
    expect(d).toContain('Z');
    expect(d.split('L')).toHaveLength(4);
  });
});

describe('svgDoc', () => {
  it('wraps inner markup in a namespaced svg root with given dimensions', () => {
    const doc = svgDoc(800, 600, '<circle cx="1" cy="1" r="1"/>');
    expect(doc).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(doc).toContain('width="800"');
    expect(doc).toContain('height="600"');
    expect(doc).toContain('viewBox="0 0 800 600"');
    expect(doc).toContain('<circle cx="1" cy="1" r="1"/>');
  });
});
