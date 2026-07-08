import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readHistory } from '../src/core/history';
import {
  checkout,
  cleanupFixtureRepo,
  commitFile,
  createBranch,
  createFixtureRepo,
  mergeBranch,
} from './helpers/fixture-repo';

describe('readHistory', () => {
  let dir: string;

  beforeEach(() => {
    dir = createFixtureRepo();
  });

  afterEach(() => {
    cleanupFixtureRepo(dir);
  });

  it('reads all commits with sha/author/timestamp/message', async () => {
    commitFile(dir, {
      file: 'a.txt',
      content: 'hello\n',
      message: 'first commit',
      date: '2024-01-01T10:00:00',
    });
    commitFile(dir, {
      file: 'b.txt',
      content: 'world\n',
      message: 'second commit',
      date: '2024-01-02T10:00:00',
    });

    const history = await readHistory({ cwd: dir, gapThresholdDays: 21 });

    expect(history.commits).toHaveLength(2);
    expect(history.commits[0]?.message).toBe('first commit');
    expect(history.commits[1]?.message).toBe('second commit');
    expect(history.commits[0]?.authorEmail).toBe('fixture@example.com');
    expect(history.commits[0]?.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(history.commits[1]?.timestamp).toBeGreaterThan(history.commits[0]?.timestamp ?? 0);
  });

  it('identifies merge commits (>1 parent)', async () => {
    commitFile(dir, { file: 'a.txt', content: 'a\n', message: 'root', date: '2024-01-01T10:00:00' });
    createBranch(dir, 'feature');
    commitFile(dir, {
      file: 'feature.txt',
      content: 'f\n',
      message: 'feature work',
      date: '2024-01-02T10:00:00',
    });
    checkout(dir, 'main');
    commitFile(dir, {
      file: 'main.txt',
      content: 'm\n',
      message: 'main work',
      date: '2024-01-03T10:00:00',
    });
    mergeBranch(dir, { branch: 'feature', message: 'merge feature', date: '2024-01-04T10:00:00' });

    const history = await readHistory({ cwd: dir, gapThresholdDays: 21 });

    expect(history.merges).toHaveLength(1);
    expect(history.merges[0]?.message).toBe('merge feature');
    expect(history.merges[0]?.parents.length).toBeGreaterThan(1);
  });

  it('detects gaps longer than gapThresholdDays', async () => {
    commitFile(dir, { file: 'a.txt', content: 'a\n', message: 'before gap', date: '2024-01-01T10:00:00' });
    commitFile(dir, {
      file: 'b.txt',
      content: 'b\n',
      message: 'after gap',
      date: '2024-03-01T10:00:00',
    });

    const history = await readHistory({ cwd: dir, gapThresholdDays: 21 });

    expect(history.gaps).toHaveLength(1);
    expect(history.gaps[0]?.days).toBeGreaterThan(21);
  });

  it('does not report a gap shorter than the threshold', async () => {
    commitFile(dir, { file: 'a.txt', content: 'a\n', message: 'day 1', date: '2024-01-01T10:00:00' });
    commitFile(dir, { file: 'b.txt', content: 'b\n', message: 'day 5', date: '2024-01-05T10:00:00' });

    const history = await readHistory({ cwd: dir, gapThresholdDays: 21 });

    expect(history.gaps).toHaveLength(0);
  });

  it('computes contributors with first-seen date and commit count', async () => {
    commitFile(dir, {
      file: 'a.txt',
      content: 'a\n',
      message: 'alice 1',
      date: '2024-01-01T10:00:00',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
    });
    commitFile(dir, {
      file: 'b.txt',
      content: 'b\n',
      message: 'bob 1',
      date: '2024-01-02T10:00:00',
      authorName: 'Bob',
      authorEmail: 'bob@example.com',
    });
    commitFile(dir, {
      file: 'c.txt',
      content: 'c\n',
      message: 'alice 2',
      date: '2024-01-03T10:00:00',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
    });

    const history = await readHistory({ cwd: dir, gapThresholdDays: 21 });

    expect(history.contributors).toHaveLength(2);
    // sorted by email: alice before bob
    expect(history.contributors[0]?.email).toBe('alice@example.com');
    expect(history.contributors[0]?.commitCount).toBe(2);
    expect(history.contributors[0]?.firstSeen).toBe(new Date('2024-01-01T10:00:00').getTime());
    expect(history.contributors[1]?.email).toBe('bob@example.com');
    expect(history.contributors[1]?.commitCount).toBe(1);
  });

  it('computes linesChanged per commit from numstat', async () => {
    commitFile(dir, {
      file: 'a.txt',
      content: 'line1\nline2\nline3\n',
      message: 'three lines',
      date: '2024-01-01T10:00:00',
    });

    const history = await readHistory({ cwd: dir, gapThresholdDays: 21 });

    expect(history.commits[0]?.linesChanged).toBe(3);
  });

  it('degrades gracefully (does not throw) when computing force-pushes', async () => {
    commitFile(dir, { file: 'a.txt', content: 'a\n', message: 'only commit', date: '2024-01-01T10:00:00' });

    const history = await readHistory({ cwd: dir, gapThresholdDays: 21 });

    expect(Array.isArray(history.forcePushes)).toBe(true);
  });
});
