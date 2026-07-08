/**
 * Action entry point: reads inputs, orchestrates
 * history -> garden -> render -> commit, and sets outputs.
 */

import * as core from '@actions/core';

/** TODO(scaffold): implement full orchestration */
async function run(): Promise<void> {
  throw new Error('TODO(scaffold): implement run');
}

run().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
