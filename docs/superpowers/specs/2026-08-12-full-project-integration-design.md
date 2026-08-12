# Full Project Integration Design

## Goal

Combine the appointment booking, authentication, listings, and Playwright contract-refactor branches into `main`, including the currently uncommitted worktree changes, and finish with a single project directory at `D:\DATN\DATNver3`.

## Current State

- `main` is clean and tracks `origin/main`.
- Four feature branches are checked out under `.worktrees/`.
- `codex/authentication-module` has eight modified files that are not committed.
- `codex/playwright-contract-refactor` has one modified file that is not committed.
- Every feature branch contains commits that are not yet present in `main`.

## Integration Strategy

1. Review and commit the uncommitted changes on their existing feature branches so no work is omitted.
2. Create `integration/full-project` from the current `main` commit.
3. Merge feature branches in this semantic order:
   - `codex/authentication-module`
   - `codex/listings-module`
   - `codex/appointment-booking`
   - `codex/playwright-contract-refactor`
4. Resolve conflicts by preserving the behavior, tests, test data, fixtures, and documentation of every module. Where shared framework contracts conflict, retain the refactored contract while adapting module code to it.
5. Verify the integrated branch before changing `main`.
6. Fast-forward `main` to the verified integration result and verify the final `main` checkout again.

The temporary integration branch keeps `main` unchanged while conflicts and integration failures are handled. Existing feature branches remain recovery points until final verification succeeds.

## Verification

Run these checks on the integrated result:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
```

If an end-to-end test is blocked by unavailable credentials, browser access, or an external environment, preserve the integrated state and report the exact blocker. Do not remove recovery worktrees until repository-local verification is complete and the merge result is structurally sound.

## Cleanup and Naming

After the verified result is on `main`:

- Remove all four registered feature worktrees with Git-aware cleanup.
- Delete the merged feature branches and the temporary integration branch.
- Prune stale worktree metadata.
- Remove the empty `.worktrees` directory.
- Leave `D:\DATN\DATNver3` as the only project checkout.

Because the worktrees are removed, no directory with the `codex-` prefix remains. The repository content itself is not reorganized into feature-named top-level folders.

## Success Criteria

- All committed and currently uncommitted feature work is represented in `main`.
- Shared framework conflicts are resolved without silently dropping module coverage.
- Repository verification results are recorded from the final integrated commit.
- `git worktree list` reports only `D:\DATN\DATNver3`.
- The main working tree is clean after cleanup.
