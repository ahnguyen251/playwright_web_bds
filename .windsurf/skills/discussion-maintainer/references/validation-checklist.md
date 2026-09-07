# Semantic Validation Checklist

Use this checklist in addition to `scripts/validate_discussion.js` before crossing phase boundaries.

## 1. Discussion Gate (`spec-start` -> Ready for Implementation)

- [ ] **Ticket & Topic**: Matches filename `docs/tasks/<ticket>-<topic>.md` and title `# <ticket> - <topic>`.
- [ ] **Objective & Scope**: Single, coherent task. Not an unbounded project.
- [ ] **Definition of Done**: If supplied, tagged as `[DoD-1]`, `[DoD-2]`, etc. All items testable.
- [ ] **Verified Findings**: Grounded in current code (`pages/`, `workflows/`, `fixtures/`, `tests/`) or DOM inspection, not guesses.
- [ ] **Open Questions**: No unresolved `[blocking]` questions. Any optional details marked `[non-blocking]`.
- [ ] **Proposed Implementation**: Clearly identifies affected layers:
  - `pages/`: Page Object or Component changes.
  - `workflows/`: Business flow coordination.
  - `fixtures/`: Test fixtures or policy injection.
  - `tests/`: Spec files, tags (`@smoke`, `@regression`, `@mutating`).
- [ ] **Safety & Constraints**: Checks whether tests mutate production data; confirms mutating test policies (`RUN_MUTATING_E2E`).
- [ ] **Validation Script**: `node scripts/validate_discussion.js <file> --phase discussion` returns code 0.

## 2. Implementation Gate (`spec-implement` -> Ready for Review)

- [ ] **Approval Verified**: User gave explicit approval to code. `implementation-approved: true`.
- [ ] **Layer Conformance**:
  - NO locators in `tests/`.
  - NO assertions in `pages/` (except assertions in testing base or explicit boolean return / verification helpers).
  - Page objects extend `BasePage`.
  - Workflows coordinate multi-page flows and do not store state across tests.
- [ ] **Locator Safety**: Uses resilient locators (`getByRole`, `getByPlaceholder`, `getByTestId`); avoids CSS classes or brittle XPath.
- [ ] **Asynchronous Safety**: Uses web-first auto-retrying assertions (`expect(locator)...`). No hardcoded `page.waitForTimeout()`.
- [ ] **Type & Syntax**: `npm run typecheck` passes with zero errors.
- [ ] **Lint & Format**: `npm run lint` passes with zero warnings.
- [ ] **Reconciliation**: All changed files listed under `## Expected File Changes` and `## Change Reconciliation`.
- [ ] **Validation Script**: `node scripts/validate_discussion.js <file> --phase implementation` returns code 0.

## 3. Review Gate (`spec-review` -> Task Completion)

- [ ] **Diff Analysis**: Analyzed exact Git diff of touched files.
- [ ] **Impact Analysis**: Identified direct consumers and related test suites.
- [ ] **Automated Test Results**:
  - Targeted tests ran and passed (or expected failures documented).
  - Evidence recorded in `## Verification Results` with exit codes.
- [ ] **DoD & Acceptance Criteria**: Every `[DoD-n]` item verified with explicit evidence.
- [ ] **Developer-Owned Checks**: Any manual verification (real OTP, payment callback) clearly designated with instructions for developer.
- [ ] **Validation Script**: `node scripts/validate_discussion.js <file> --phase completion` returns code 0.
