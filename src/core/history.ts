/**
 * Git reader: walks the repo's log via simple-git and produces raw signals.
 * This module owns all interaction with the actual git history; garden.ts
 * normalizes its output into the neutral GrowthEvent schema.
 */

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
   * reflog, which may not be available in all CI contexts (e.g. shallow
   * clones, or after the reflog has expired). Never throws — degrades to
   * an empty array when it can't determine this.
   */
  forcePushes: ForcePush[];
};

export type HistoryOptions = {
  /** Working directory of the git repo to read. */
  cwd: string;
  /** Days of silence that counts as a gap. */
  gapThresholdDays: number;
};

/**
 * Read and analyze the repo's git history.
 * TODO(scaffold): implement
 */
export async function readHistory(options: HistoryOptions): Promise<RepoHistory> {
  throw new Error('TODO(scaffold): implement readHistory');
}
