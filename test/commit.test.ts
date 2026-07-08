import { describe, it } from 'vitest';

describe('injectReadmeMarker', () => {
  it.todo('inserts an image reference between existing markers');
  it.todo('updates an existing reference between markers idempotently');
  it.todo('returns the README unchanged when no markers are present');
});

describe('writeAndCommit', () => {
  it.todo('writes the SVG file to outputPath');
  it.todo('skips the commit entirely when the SVG content is unchanged');
  it.todo('commits with the expected message when content changed and commit=true');
  it.todo('does not touch git when commit=false');
});
