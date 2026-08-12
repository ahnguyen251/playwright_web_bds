# Full Project Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all feature work into `main`, verify the unified Playwright project, and leave only `D:\DATN\DATNver3` as the registered checkout.

**Architecture:** Commit recoverable feature-worktree changes first, then merge all feature branches on a temporary integration branch. Advance `main` only after the integrated tree passes repository checks, and remove worktrees and merged branches only after final verification.

**Tech Stack:** Git worktrees, PowerShell, Node.js, TypeScript, Playwright, ESLint, Prettier

## Global Constraints

- Include the current uncommitted authentication and Playwright contract-refactor work.
- Never commit OAuth client secrets, refresh tokens, passwords, or other live credentials.
- Preserve every module's tests, fixtures, workflows, data, and documentation when resolving conflicts.
- Prefer the refactored shared Playwright contract where shared framework APIs conflict.
- Do not update `main` or remove recovery worktrees until the integrated result has been verified.
- Do not push to the remote repository as part of this local integration.
- Finish with only `D:\DATN\DATNver3` listed by `git worktree list`.

---

### Task 1: Secure and Commit Authentication Worktree Changes

**Files:**
- Modify: `.worktrees/codex-authentication-module/.env.example`
- Commit: `.worktrees/codex-authentication-module/package.json`
- Commit: `.worktrees/codex-authentication-module/package-lock.json`
- Commit: `.worktrees/codex-authentication-module/playwright.config.ts`
- Commit: `.worktrees/codex-authentication-module/test-cases/authentication/registration.test-cases.ts`
- Commit: `.worktrees/codex-authentication-module/tests/component/pages/RegisterPage.spec.ts`
- Commit: `.worktrees/codex-authentication-module/tests/unit/config/package.scripts.spec.ts`
- Commit: `.worktrees/codex-authentication-module/tests/unit/config/playwright.config.spec.ts`

**Interfaces:**
- Consumes: the dirty `codex/authentication-module` checkout.
- Produces: a clean authentication branch containing all intended non-secret changes.

- [ ] **Step 1: Replace live OAuth values with placeholders**

  Edit `.env.example` so `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` contain descriptive `replace-with-*` values. Retain the newly documented registration and Gmail option names.

- [ ] **Step 2: Verify that no known live-secret pattern is staged or committed**

  Run:

  ```powershell
  git -C .worktrees/codex-authentication-module diff --check
  git -C .worktrees/codex-authentication-module diff -- .env.example
  git log --all -S 'GOCSPX-' --format='%h %D' -- .env.example
  ```

  Expected: no whitespace errors; `.env.example` shows placeholders; the history search prints no commits.

- [ ] **Step 3: Run focused authentication checks**

  Run:

  ```powershell
  npm --prefix .worktrees/codex-authentication-module run typecheck
  npm --prefix .worktrees/codex-authentication-module exec playwright test -- tests/unit/config/package.scripts.spec.ts tests/unit/config/playwright.config.spec.ts tests/component/pages/RegisterPage.spec.ts --project=framework
  ```

  Expected: both commands exit with code 0.

- [ ] **Step 4: Commit the exact authentication files**

  Run:

  ```powershell
  git -C .worktrees/codex-authentication-module add -- .env.example package.json package-lock.json playwright.config.ts test-cases/authentication/registration.test-cases.ts tests/component/pages/RegisterPage.spec.ts tests/unit/config/package.scripts.spec.ts tests/unit/config/playwright.config.spec.ts
  git -C .worktrees/codex-authentication-module diff --cached --check
  git -C .worktrees/codex-authentication-module commit -m "test: finalize registration coverage"
  git -C .worktrees/codex-authentication-module status --short --branch
  ```

  Expected: the commit succeeds and the worktree is clean.

### Task 2: Normalize the Contract-Refactor Worktree

**Files:**
- Inspect: `.worktrees/codex-playwright-contract-refactor/pages/authentication/RegisterPage.ts`

**Interfaces:**
- Consumes: the dirty `codex/playwright-contract-refactor` checkout.
- Produces: a clean refactor branch, with a commit only if a real content change exists.

- [ ] **Step 1: Determine whether the reported modification changes content**

  Run:

  ```powershell
  git -C .worktrees/codex-playwright-contract-refactor diff --ignore-space-at-eol --exit-code -- pages/authentication/RegisterPage.ts
  ```

  Expected: exit code 0 means only filesystem or line-ending metadata differs; a nonzero exit code means a real patch must be reviewed.

- [ ] **Step 2: Preserve a real change or refresh a metadata-only change**

  If Step 1 prints a patch, inspect it, run the component test below, then stage and commit it:

  ```powershell
  npm --prefix .worktrees/codex-playwright-contract-refactor exec playwright test -- tests/component/pages/RegisterPage.spec.ts --project=framework
  git -C .worktrees/codex-playwright-contract-refactor add -- pages/authentication/RegisterPage.ts
  git -C .worktrees/codex-playwright-contract-refactor diff --cached --check
  git -C .worktrees/codex-playwright-contract-refactor commit -m "fix: finalize registration page contract"
  ```

  If Step 1 exits with code 0, refresh Git's index without changing file content:

  ```powershell
  git -C .worktrees/codex-playwright-contract-refactor update-index --refresh
  ```

- [ ] **Step 3: Confirm the refactor worktree is clean**

  Run:

  ```powershell
  git -C .worktrees/codex-playwright-contract-refactor status --short --branch
  ```

  Expected: no modified or untracked paths.

### Task 3: Create the Recovery-Safe Integration Branch

**Files:**
- Modify: Git references only.

**Interfaces:**
- Consumes: clean feature branches and the current `main` commit.
- Produces: `integration/full-project` rooted at the current `main`.

- [ ] **Step 1: Confirm every checkout is clean**

  Run `git status --short --branch` in the root and each path returned by `git worktree list --porcelain`.

  Expected: every checkout has no modified or untracked paths.

- [ ] **Step 2: Create the integration branch in the main checkout**

  Run:

  ```powershell
  git switch -c integration/full-project
  ```

  Expected: the root checkout is on `integration/full-project` and `main` remains at its pre-integration commit.

### Task 4: Merge the Authentication Module

**Files:**
- Modify: files changed by `codex/authentication-module` and any shared conflict resolutions.

**Interfaces:**
- Consumes: `integration/full-project` and `codex/authentication-module`.
- Produces: an integration commit containing authentication functionality and coverage.

- [ ] **Step 1: Merge with an explicit merge commit**

  Run:

  ```powershell
  git merge --no-ff codex/authentication-module -m "merge: integrate authentication module"
  ```

- [ ] **Step 2: Resolve conflicts without dropping either side**

  If Git reports conflicts, list them with `git diff --name-only --diff-filter=U`. For each listed file, inspect its base, current-branch, and incoming-branch stages with `git show` using the corresponding stage-qualified path. Edit with `apply_patch`, confirm `git status` contains only merge-related changes, then run `git add --all`, `git diff --cached --check`, and `git commit --no-edit`.

- [ ] **Step 3: Verify the framework after authentication integration**

  Run:

  ```powershell
  npm install
  npm run typecheck
  npx playwright test --project=framework
  ```

  Expected: all commands exit with code 0.

### Task 5: Merge the Listings Module

**Files:**
- Modify: files changed by `codex/listings-module` and shared framework conflict resolutions.

**Interfaces:**
- Consumes: the authentication-integrated branch and `codex/listings-module`.
- Produces: an integration commit containing authentication and listings behavior.

- [ ] **Step 1: Merge the listings branch**

  Run:

  ```powershell
  git merge --no-ff codex/listings-module -m "merge: integrate listings module"
  ```

- [ ] **Step 2: Resolve listings conflicts without dropping authentication contracts**

  If Git reports conflicts, run `git diff --name-only --diff-filter=U`. Inspect the base, current-branch, and incoming-branch stages of every listed file with `git show`; preserve authentication fixtures and contracts while adding listings pages, workflows, types, data, traceability, and tests. Edit with `apply_patch`, confirm `git status` contains only merge-related changes, then run `git add --all`, `git diff --cached --check`, and `git commit --no-edit`.

- [ ] **Step 3: Verify the combined framework tests**

  Run:

  ```powershell
  npm install
  npm run typecheck
  npx playwright test --project=framework
  ```

  Expected: all commands exit with code 0.

### Task 6: Merge the Appointment Booking Module

**Files:**
- Modify: files changed by `codex/appointment-booking` and shared framework conflict resolutions.

**Interfaces:**
- Consumes: the authentication-and-listings integration and `codex/appointment-booking`.
- Produces: an integration commit containing all three functional modules.

- [ ] **Step 1: Merge the appointment branch**

  Run:

  ```powershell
  git merge --no-ff codex/appointment-booking -m "merge: integrate appointment booking module"
  ```

- [ ] **Step 2: Resolve appointment conflicts without dropping existing modules**

  If Git reports conflicts, run `git diff --name-only --diff-filter=U`. Inspect the base, current-branch, and incoming-branch stages of every listed file with `git show`; preserve authentication and listings fixture composition while adding appointment pages, workflows, types, data, safety gates, traceability, and tests. Edit with `apply_patch`, confirm `git status` contains only merge-related changes, then run `git add --all`, `git diff --cached --check`, and `git commit --no-edit`.

- [ ] **Step 3: Verify the three-module framework**

  Run:

  ```powershell
  npm install
  npm run typecheck
  npx playwright test --project=framework
  ```

  Expected: all commands exit with code 0.

### Task 7: Apply the Playwright Contract Refactor

**Files:**
- Modify: files changed by `codex/playwright-contract-refactor` and shared contract conflict resolutions.

**Interfaces:**
- Consumes: the three-module integration and `codex/playwright-contract-refactor`.
- Produces: the complete project using the final shared Playwright contracts.

- [ ] **Step 1: Merge the contract-refactor branch last**

  Run:

  ```powershell
  git merge --no-ff codex/playwright-contract-refactor -m "merge: integrate Playwright contract refactor"
  ```

- [ ] **Step 2: Resolve shared-contract conflicts in favor of the final compatible APIs**

  If Git reports conflicts, run `git diff --name-only --diff-filter=U`. Inspect the base, current-branch, and incoming-branch stages of every listed file with `git show`; keep all module coverage, but prefer refactored Page Object, fixture, utility, and environment APIs where interfaces conflict. Adapt module consumers rather than restoring superseded shared contracts. Edit with `apply_patch`, confirm `git status` contains only merge-related changes, then run `git add --all`, `git diff --cached --check`, and `git commit --no-edit`.

- [ ] **Step 3: Verify the final integration branch**

  Run:

  ```powershell
  npm install
  npm run typecheck
  npm run lint
  npm run format:check
  npm test
  ```

  Expected: repository-local checks exit with code 0. If a live end-to-end test is blocked by external credentials or environment availability, record the exact failing project and keep all worktrees for recovery.

### Task 8: Advance Main and Re-verify

**Files:**
- Modify: Git references only.

**Interfaces:**
- Consumes: the verified `integration/full-project` branch.
- Produces: `main` pointing to the integrated result.

- [ ] **Step 1: Fast-forward main**

  Run:

  ```powershell
  git switch main
  git merge --ff-only integration/full-project
  ```

  Expected: `main` advances without a new conflict or divergent merge.

- [ ] **Step 2: Run final verification from main**

  Run:

  ```powershell
  npm install
  npm run typecheck
  npm run lint
  npm run format:check
  npm test
  git status --short --branch
  ```

  Expected: checks exit with code 0 and the main working tree is clean.

### Task 9: Remove Merged Worktrees and Branches

**Files:**
- Remove: `.worktrees/appointment-booking`
- Remove: `.worktrees/codex-authentication-module`
- Remove: `.worktrees/codex-listings-module`
- Remove: `.worktrees/codex-playwright-contract-refactor`
- Remove: `.worktrees/` after confirming it is empty.

**Interfaces:**
- Consumes: verified `main` and clean, fully merged worktrees.
- Produces: one registered project checkout with no `codex-` worktree directories.

- [ ] **Step 1: Confirm branches are merged and worktrees are clean**

  Run:

  ```powershell
  git branch --merged main
  git worktree list --porcelain
  ```

  Run `git status --short --branch` in each worktree and stop if any path is dirty.

- [ ] **Step 2: Remove the exact registered worktrees**

  Run from `D:\DATN\DATNver3`:

  ```powershell
  git worktree remove 'D:/DATN/DATNver3/.worktrees/appointment-booking'
  git worktree remove 'D:/DATN/DATNver3/.worktrees/codex-authentication-module'
  git worktree remove 'D:/DATN/DATNver3/.worktrees/codex-listings-module'
  git worktree remove 'D:/DATN/DATNver3/.worktrees/codex-playwright-contract-refactor'
  git worktree prune
  ```

- [ ] **Step 3: Delete only fully merged local branches**

  Run:

  ```powershell
  git branch -d codex/appointment-booking codex/authentication-module codex/listings-module codex/playwright-contract-refactor integration/full-project
  ```

  Expected: all deletions succeed without `-D`.

- [ ] **Step 4: Verify and remove the empty worktree container**

  Resolve `D:\DATN\DATNver3\.worktrees`, verify that its parent is exactly `D:\DATN\DATNver3`, and confirm `Get-ChildItem -Force` returns no entries. Then run:

  ```powershell
  Remove-Item -LiteralPath 'D:\DATN\DATNver3\.worktrees'
  ```

- [ ] **Step 5: Record final repository state**

  Run:

  ```powershell
  git worktree list
  git status --short --branch
  git log --oneline --decorate -10
  ```

  Expected: only `D:/DATN/DATNver3` is listed, `main` is clean, and the integration commits are visible.
