/**
 * Committer: writes the rendered SVG to disk, injects/updates the README
 * marker if present, and commits back only when content actually changed
 * (determinism means "unchanged input" -> "unchanged output" -> no-op).
 */

import { exec, getExecOutput } from '@actions/exec';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type CommitOptions = {
  cwd: string;
  outputPath: string;
  svg: string;
  /** If false, only write the file; do not touch git. */
  commit: boolean;
  githubToken: string;
  /** Relative path to the README to inject the marker into. Defaults to "README.md". */
  readmePath?: string;
  /**
   * Whether to `git push` after committing. Defaults to true. Exposed so
   * tests (and any caller without a configured remote) can commit locally
   * without attempting a push.
   */
  push?: boolean;
};

export type CommitResult = {
  svgPath: string;
  /** Empty string when no commit was made (unchanged, or commit: false). */
  commitSha: string;
};

const MARKER_START = '<!-- repo-garden:start -->';
const MARKER_END = '<!-- repo-garden:end -->';

/**
 * Replace the content between `<!-- repo-garden:start -->` and
 * `<!-- repo-garden:end -->` markers in a README string with an image
 * reference to `svgRelativePath`. Returns the README unchanged if no
 * markers are present.
 */
export function injectReadmeMarker(readme: string, svgRelativePath: string): string {
  const startIdx = readme.indexOf(MARKER_START);
  const endIdx = readme.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return readme;
  }
  const before = readme.slice(0, startIdx + MARKER_START.length);
  const after = readme.slice(endIdx);
  return `${before}\n![Repo Garden](${svgRelativePath})\n${after}`;
}

async function readFileIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
}

async function run(cwd: string, args: string[]): Promise<void> {
  await exec('git', args, { cwd });
}

async function runCapture(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await getExecOutput('git', args, { cwd });
  return stdout.trim();
}

/**
 * Point origin's push URL at an x-access-token-authenticated URL so pushes
 * work even if the checkout step ran with persist-credentials: false.
 * No-ops when GITHUB_REPOSITORY isn't set (e.g. local/test runs) so callers
 * outside a GitHub Actions job aren't forced to configure this.
 */
async function configureAuthRemote(cwd: string, githubToken: string): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo === undefined || githubToken === '') {
    return;
  }
  await run(cwd, ['remote', 'set-url', 'origin', `https://x-access-token:${githubToken}@github.com/${repo}.git`]);
}

/**
 * Write the SVG (skip if byte-identical to what's on disk), update the
 * README marker block if present, and commit+push when `commit` is true
 * and content changed.
 */
export async function writeAndCommit(options: CommitOptions): Promise<CommitResult> {
  const absOutputPath = join(options.cwd, options.outputPath);
  const existingSvg = await readFileIfExists(absOutputPath);
  if (existingSvg === options.svg) {
    return { svgPath: options.outputPath, commitSha: '' };
  }

  await writeFile(absOutputPath, options.svg, 'utf8');

  const readmeRelPath = options.readmePath ?? 'README.md';
  const readmeAbsPath = join(options.cwd, readmeRelPath);
  const readme = await readFileIfExists(readmeAbsPath);
  let readmeChanged = false;
  if (readme !== undefined) {
    const updated = injectReadmeMarker(readme, options.outputPath);
    if (updated !== readme) {
      await writeFile(readmeAbsPath, updated, 'utf8');
      readmeChanged = true;
    }
  }

  if (!options.commit) {
    return { svgPath: options.outputPath, commitSha: '' };
  }

  await run(options.cwd, ['config', 'user.name', 'github-actions[bot]']);
  await run(options.cwd, [
    'config',
    'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ]);
  await run(options.cwd, ['add', options.outputPath, ...(readmeChanged ? [readmeRelPath] : [])]);
  await run(options.cwd, ['commit', '-m', 'chore: grow repo garden \u{1F331} [skip ci]']);
  const commitSha = await runCapture(options.cwd, ['rev-parse', 'HEAD']);

  if (options.push ?? true) {
    await configureAuthRemote(options.cwd, options.githubToken);
    await run(options.cwd, ['push']);
  }

  return { svgPath: options.outputPath, commitSha };
}
