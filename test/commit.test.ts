import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { injectReadmeMarker, writeAndCommit } from '../src/core/commit';
import { cleanupFixtureRepo, commitFile, createFixtureRepo } from './helpers/fixture-repo';

describe('injectReadmeMarker', () => {
  it('inserts an image reference between existing markers', () => {
    const readme = '# Title\n\n<!-- repo-garden:start -->\n<!-- repo-garden:end -->\n\nfooter';
    const out = injectReadmeMarker(readme, 'garden.svg');
    expect(out).toContain('![Repo Garden](garden.svg)');
    expect(out.indexOf('<!-- repo-garden:start -->')).toBeLessThan(out.indexOf('![Repo Garden]'));
    expect(out.indexOf('![Repo Garden]')).toBeLessThan(out.indexOf('<!-- repo-garden:end -->'));
  });

  it('updates an existing reference between markers idempotently', () => {
    const readme = '<!-- repo-garden:start -->\n![Repo Garden](old.svg)\n<!-- repo-garden:end -->';
    const once = injectReadmeMarker(readme, 'garden.svg');
    const twice = injectReadmeMarker(once, 'garden.svg');
    expect(once).toBe(twice);
    expect(once).not.toContain('old.svg');
    expect(once).toContain('garden.svg');
  });

  it('returns the README unchanged when no markers are present', () => {
    const readme = '# Just a title\n\nSome content.';
    expect(injectReadmeMarker(readme, 'garden.svg')).toBe(readme);
  });
});

describe('writeAndCommit', () => {
  let dir: string;

  beforeEach(() => {
    dir = createFixtureRepo();
    commitFile(dir, { file: 'README.md', content: '# Repo\n', message: 'init', date: '2024-01-01T00:00:00' });
  });

  afterEach(() => {
    cleanupFixtureRepo(dir);
  });

  it('writes the SVG file to outputPath', async () => {
    await writeAndCommit({
      cwd: dir,
      outputPath: 'garden.svg',
      svg: '<svg/>',
      commit: false,
      githubToken: '',
    });
    const content = await readFile(join(dir, 'garden.svg'), 'utf8');
    expect(content).toBe('<svg/>');
  });

  it('does not touch git when commit=false', async () => {
    const result = await writeAndCommit({
      cwd: dir,
      outputPath: 'garden.svg',
      svg: '<svg/>',
      commit: false,
      githubToken: '',
    });
    expect(result.commitSha).toBe('');
  });

  it('commits with the expected message when content changed and commit=true', async () => {
    const result = await writeAndCommit({
      cwd: dir,
      outputPath: 'garden.svg',
      svg: '<svg/>',
      commit: true,
      githubToken: '',
      push: false,
    });
    expect(result.commitSha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('skips the commit entirely when the SVG content is unchanged', async () => {
    const first = await writeAndCommit({
      cwd: dir,
      outputPath: 'garden.svg',
      svg: '<svg>same</svg>',
      commit: true,
      githubToken: '',
      push: false,
    });
    expect(first.commitSha).not.toBe('');

    const second = await writeAndCommit({
      cwd: dir,
      outputPath: 'garden.svg',
      svg: '<svg>same</svg>',
      commit: true,
      githubToken: '',
      push: false,
    });
    expect(second.commitSha).toBe('');
  });

  it('injects the README marker when present and commits both files', async () => {
    commitFile(dir, {
      file: 'README.md',
      content: '# Repo\n\n<!-- repo-garden:start -->\n<!-- repo-garden:end -->\n',
      message: 'add markers',
      date: '2024-01-02T00:00:00',
    });

    await writeAndCommit({
      cwd: dir,
      outputPath: 'garden.svg',
      svg: '<svg/>',
      commit: true,
      githubToken: '',
      push: false,
    });

    const readme = await readFile(join(dir, 'README.md'), 'utf8');
    expect(readme).toContain('![Repo Garden](garden.svg)');
  });
});
