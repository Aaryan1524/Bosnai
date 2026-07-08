/**
 * Test-only helper: builds a temp git repo with fixed author/committer
 * dates so history.ts tests are themselves deterministic (no reliance on
 * wall-clock time or the machine's git config).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function run(cwd: string, args: string[], env?: Record<string, string>): string {
  return execFileSync('git', args, { cwd, stdio: 'pipe', env: { ...process.env, ...env } })
    .toString()
    .trim();
}

/** Create an empty repo with a deterministic local identity. Caller must cleanupFixtureRepo(). */
export function createFixtureRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'repo-garden-fixture-'));
  run(dir, ['init', '-q', '-b', 'main']);
  run(dir, ['config', 'user.name', 'Fixture']);
  run(dir, ['config', 'user.email', 'fixture@example.com']);
  return dir;
}

export function cleanupFixtureRepo(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export type FixtureCommitOptions = {
  file: string;
  content: string;
  message: string;
  /** e.g. '2024-01-01T10:00:00' — used for both author and committer date. */
  date: string;
  authorName?: string;
  authorEmail?: string;
};

/** Write a file and commit it with a fixed date. Returns the new commit sha. */
export function commitFile(dir: string, opts: FixtureCommitOptions): string {
  const authorName = opts.authorName ?? 'Fixture';
  const authorEmail = opts.authorEmail ?? 'fixture@example.com';
  writeFileSync(join(dir, opts.file), opts.content);
  run(dir, ['add', opts.file]);
  run(
    dir,
    ['commit', '-q', '-m', opts.message, `--author=${authorName} <${authorEmail}>`],
    { GIT_AUTHOR_DATE: opts.date, GIT_COMMITTER_DATE: opts.date },
  );
  return run(dir, ['rev-parse', 'HEAD']);
}

export function createBranch(dir: string, name: string): void {
  run(dir, ['checkout', '-q', '-b', name]);
}

export function checkout(dir: string, name: string): void {
  run(dir, ['checkout', '-q', name]);
}

export type FixtureMergeOptions = {
  branch: string;
  message: string;
  date: string;
};

export function mergeBranch(dir: string, opts: FixtureMergeOptions): void {
  run(
    dir,
    ['merge', '--no-ff', '-q', '-m', opts.message, opts.branch],
    { GIT_AUTHOR_DATE: opts.date, GIT_COMMITTER_DATE: opts.date },
  );
}
