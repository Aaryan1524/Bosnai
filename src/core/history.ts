/**
 * Git reader: walks the repo's log via simple-git and produces raw signals.
 * This module owns all interaction with the actual git history; garden.ts
 * normalizes its output into the neutral GrowthEvent schema.
 */

import { simpleGit } from 'simple-git';

export type RawCommit = {
  sha: string;
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
  /** Parent SHAs; more than one means a merge commit. */
  parents: string[];
  /** Lines added + removed, from `git log --numstat`. */
  linesChanged: number;
};

export type Contributor = {
  email: string;
  name: string;
  firstSeen: number;
  commitCount: number;
};

export type Gap = {
  /** Epoch ms when the gap started (last commit before the silence). */
  start: number;
  /** Epoch ms when the gap ended (first commit after the silence). */
  end: number;
  days: number;
};

export type ForcePush = {
  /** Epoch ms, best-effort — derived from reflog when available. */
  timestamp: number;
  /** SHA that was discarded, if determinable. */
  discardedSha?: string;
};

export type RepoHistory = {
  commits: RawCommit[];
  contributors: Contributor[];
  gaps: Gap[];
  merges: RawCommit[];
  /**
   * Force-push / history-rewrite detections. Best-effort: relies on the
   * reflog, which only covers activity since the *local* clone's HEAD was
   * created. In the common CI path (`actions/checkout`, a fresh shallow or
   * full clone) the reflog starts at checkout time, so this is effectively
   * a no-op there — it only has a chance of firing on a long-lived local
   * clone or self-hosted runner with persistent history. Never throws;
   * degrades to an empty array whenever the reflog is unavailable or
   * unparsable.
   */
  forcePushes: ForcePush[];
};

export type HistoryOptions = {
  /** Working directory of the git repo to read. */
  cwd: string;
  /** Days of silence that counts as a gap. */
  gapThresholdDays: number;
};

const COMMIT_MARKER = 'COMMIT';
const FIELD_SEP = '\t';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse the raw `git log --numstat --pretty=format:...` output into commits, oldest first. */
function parseLog(raw: string): RawCommit[] {
  const commits: RawCommit[] = [];
  let current: RawCommit | null = null;

  for (const line of raw.split('\n')) {
    if (line.startsWith(COMMIT_MARKER + FIELD_SEP)) {
      const [, sha, parentsRaw, authorName, authorEmail, atRaw, ...subjectParts] =
        line.split(FIELD_SEP);
      current = {
        sha: sha ?? '',
        authorName: authorName ?? '',
        authorEmail: authorEmail ?? '',
        timestamp: Number(atRaw ?? '0') * 1000,
        message: subjectParts.join(FIELD_SEP),
        parents: (parentsRaw ?? '').split(' ').filter(Boolean),
        linesChanged: 0,
      };
      commits.push(current);
      continue;
    }

    if (line.trim() === '' || current === null) {
      continue;
    }

    const [addedRaw, removedRaw] = line.split(FIELD_SEP);
    const added = addedRaw === '-' ? 0 : Number(addedRaw ?? '0');
    const removed = removedRaw === '-' ? 0 : Number(removedRaw ?? '0');
    if (Number.isFinite(added) && Number.isFinite(removed)) {
      current.linesChanged += added + removed;
    }
  }

  return commits;
}

function computeContributors(commits: readonly RawCommit[]): Contributor[] {
  const byEmail = new Map<string, { name: string; firstSeen: number; commitCount: number }>();

  for (const commit of commits) {
    const existing = byEmail.get(commit.authorEmail);
    if (existing === undefined) {
      byEmail.set(commit.authorEmail, {
        name: commit.authorName,
        firstSeen: commit.timestamp,
        commitCount: 1,
      });
    } else {
      existing.firstSeen = Math.min(existing.firstSeen, commit.timestamp);
      existing.commitCount += 1;
    }
  }

  return Array.from(byEmail.entries())
    .map(([email, v]) => ({ email, name: v.name, firstSeen: v.firstSeen, commitCount: v.commitCount }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

function computeGaps(commits: readonly RawCommit[], gapThresholdDays: number): Gap[] {
  const gaps: Gap[] = [];
  const thresholdMs = gapThresholdDays * DAY_MS;

  for (let i = 1; i < commits.length; i++) {
    const prev = commits[i - 1];
    const curr = commits[i];
    if (prev === undefined || curr === undefined) {
      continue;
    }
    const delta = curr.timestamp - prev.timestamp;
    if (delta > thresholdMs) {
      gaps.push({ start: prev.timestamp, end: curr.timestamp, days: delta / DAY_MS });
    }
  }

  return gaps;
}

/**
 * Best-effort force-push detection via the reflog. See the `forcePushes`
 * doc comment on RepoHistory for why this rarely fires in CI. Any failure
 * (no reflog, not a full clone, git version differences) degrades silently
 * to an empty array rather than failing the whole read.
 */
async function detectForcePushes(cwd: string): Promise<ForcePush[]> {
  try {
    const git = simpleGit(cwd);
    const raw = await git.raw([
      'reflog',
      'show',
      '--date=unix',
      "--format=%gs\t%gd\t%cd",
      'HEAD',
    ]);

    const forcePushes: ForcePush[] = [];
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      const [subject, , dateRaw] = line.split(FIELD_SEP);
      if (subject !== undefined && /force|forced-update/i.test(subject)) {
        const timestamp = Number(dateRaw ?? '0') * 1000;
        if (Number.isFinite(timestamp) && timestamp > 0) {
          forcePushes.push({ timestamp });
        }
      }
    }
    return forcePushes;
  } catch {
    return [];
  }
}

/**
 * Read and analyze the repo's git history.
 */
export async function readHistory(options: HistoryOptions): Promise<RepoHistory> {
  const git = simpleGit(options.cwd);

  const raw = await git.raw([
    'log',
    '--reverse',
    '--numstat',
    `--pretty=format:${COMMIT_MARKER}%x09%H%x09%P%x09%an%x09%ae%x09%at%x09%s`,
  ]);

  const commits = parseLog(raw);
  const contributors = computeContributors(commits);
  const gaps = computeGaps(commits, options.gapThresholdDays);
  const merges = commits.filter((c) => c.parents.length > 1);
  const forcePushes = await detectForcePushes(options.cwd);

  return { commits, contributors, gaps, merges, forcePushes };
}
