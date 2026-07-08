import { describe, it } from 'vitest';

/**
 * Uses a fixture temp git repo (see test/fixtures/create-fixture-repo.ts)
 * built with fixed GIT_AUTHOR_DATE/GIT_COMMITTER_DATE so expected commit
 * counts/gaps/merges are deterministic.
 */
describe('readHistory', () => {
  it.todo('reads all commits with sha/author/timestamp/message');
  it.todo('identifies merge commits (>1 parent)');
  it.todo('detects gaps longer than gapThresholdDays');
  it.todo('computes contributors with first-seen date and commit count');
  it.todo('computes linesChanged per commit from numstat');
  it.todo('degrades gracefully (empty forcePushes) when reflog is unavailable');
});
