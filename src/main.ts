/**
 * Action entry point: reads inputs, orchestrates
 * history -> garden -> render -> commit, and sets outputs.
 */

import * as core from '@actions/core';
import { readHistory } from './core/history';
import { buildGarden } from './core/garden';
import { renderGarden } from './core/render';
import { writeAndCommit } from './core/commit';
import { getBiome } from './biomes/registry';

function parseIntInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : fallback;
}

/** Parses a positive-dimension input, falling back (with a warning) on anything else. */
function parseDimension(value: string, label: string, fallback: number): number {
  if (value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    core.warning(`Ignoring invalid "${label}" input "${value}" (must be a positive number); using ${fallback}.`);
    return fallback;
  }
  return parsed;
}

async function run(): Promise<void> {
  const cwd = process.env.GITHUB_WORKSPACE ?? process.cwd();

  const biomeName = core.getInput('biome') || 'bonsai';
  const outputPath = core.getInput('output-path') || 'garden.svg';
  const gapThresholdDays = parseIntInput(core.getInput('gap-threshold-days'), 21);
  const window = core.getInput('window') || 'all';
  const widthInput = core.getInput('width');
  const heightInput = core.getInput('height');
  const shouldCommit = core.getInput('commit') === '' || core.getBooleanInput('commit');
  const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
  if (githubToken !== '') {
    core.setSecret(githubToken);
  }

  const biome = getBiome(biomeName);
  const width = parseDimension(widthInput, 'width', biome.defaultDimensions?.width ?? 800);
  const height = parseDimension(heightInput, 'height', biome.defaultDimensions?.height ?? 600);

  const history = await readHistory({ cwd, gapThresholdDays });
  const garden = buildGarden(history, {
    window,
    config: { theme: biomeName, width, height },
  });

  const svg = renderGarden(garden, { biomeName });

  const result = await writeAndCommit({
    cwd,
    outputPath,
    svg,
    commit: shouldCommit,
    githubToken,
  });

  core.setOutput('svg-path', result.svgPath);
  core.setOutput('commit-sha', result.commitSha);
}

run().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
