/**
 * Committer: writes the rendered SVG to disk, injects/updates the README
 * marker if present, and commits back only when content actually changed
 * (determinism means "unchanged input" -> "unchanged output" -> no-op).
 */

export type CommitOptions = {
  cwd: string;
  outputPath: string;
  svg: string;
  /** If false, only write the file; do not touch git. */
  commit: boolean;
  githubToken: string;
};

export type CommitResult = {
  svgPath: string;
  /** Empty string when no commit was made (unchanged, or commit: false). */
  commitSha: string;
};

/**
 * Write the SVG (skip if byte-identical to what's on disk), update the
 * README marker block if present, and commit+push when `commit` is true
 * and content changed.
 * TODO(scaffold): implement
 */
export async function writeAndCommit(options: CommitOptions): Promise<CommitResult> {
  throw new Error('TODO(scaffold): implement writeAndCommit');
}

/**
 * Replace the content between `<!-- repo-garden:start -->` and
 * `<!-- repo-garden:end -->` markers in a README string with an image
 * reference to `svgRelativePath`. Returns the README unchanged if no
 * markers are present.
 * TODO(scaffold): implement
 */
export function injectReadmeMarker(readme: string, svgRelativePath: string): string {
  throw new Error('TODO(scaffold): implement injectReadmeMarker');
}
