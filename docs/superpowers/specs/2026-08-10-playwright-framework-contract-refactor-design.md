# Playwright Framework Contract Refactor Design

## Purpose

Refactor the existing Propify Playwright framework to improve reliability, selector quality,
performance, and maintainability without changing its business behavior, project names, test-case
metadata, requirement traceability, or non-destructive production strategy.

## Scope

The refactor keeps the current dependency direction:

```text
Page Object -> Workflow/Helper -> Fixture -> Test
```

It covers the existing Playwright configuration, Page Objects and components, workflows, fixtures,
utilities, framework-level component tests, authentication setup, and the executable login test.
Profile, Listings, Appointments, and Transactions remain templates unless an existing executable
specification already covers them. The refactor does not fabricate feature coverage.

## Locator contract

Locators use the application interface visible to users. The preferred order is:

1. `getByRole()` with a stable accessible name;
2. `getByLabel()` for associated form controls;
3. `getByPlaceholder()` when the placeholder is stable and unique;
4. `getByText()` only for stable, unique text;
5. `getByTestId()` only when the deployed application already provides a verified stable test ID;
6. a short, semantic CSS selector only when no accessible locator exists.

The framework will not invent test IDs. It will not use positional selectors, dynamic classes,
long CSS chains, absolute XPath, or `nth()`. Ambiguous locators will be narrowed with a stable
semantic region when possible. If uniqueness cannot be established from the repository or focused
component tests, the risk will be recorded instead of hiding it behind a brittle selector.

## Synchronization and assertions

Tests use Playwright web-first assertions such as `toBeVisible()` and `toHaveAttribute()` so that
the assertion retries until the UI reaches the expected state. Page Objects expose locators or
intent-level wait methods where an observable state transition is part of the interaction.
Workflows coordinate actions but do not return snapshot booleans that encourage immediate-value
assertions.

Navigation relies on Playwright action auto-waiting plus a specific observable destination state
where that state is known. Generic `waitForLoadState()` wrappers and fixed sleeps are not used as
substitutes for application readiness. No `waitForTimeout()` is introduced.

## Architecture and duplication

The current Page Object, Workflow, fixture, and test layers remain intact. Refactoring is targeted:

- reusable UI regions remain components;
- Page Objects continue to own selectors and UI actions;
- workflows continue to coordinate multi-step business behavior;
- fixtures remain the composition root;
- tests retain scenarios and assertions;
- redundant pass-through methods or duplicate object construction are removed only when the public
  behavior remains equivalent;
- framework utilities remain technical and domain-independent.

Boolean `isVisible()` wrappers used only for assertions are replaced by locator-backed expectations.
The login flow retains an explicit authenticated-state synchronization point because authentication
completion is part of the workflow contract.

## Performance

Framework-only tests must not execute authentication setup. Playwright project dependencies remain
limited to authenticated end-to-end browser projects. Component and unit tests stay in the existing
`framework` project and use no new test runner or dependency.

Multiple file uploads are sent to the file input in one Playwright operation after validating all
paths, preserving the same selected-file intent while avoiding repeated replacement of the input's
file list.

Lint and formatting commands must operate on the intended checkout only. Generated output and the
ignored `.worktrees` directory are excluded so unrelated worktrees cannot make the active checkout's
verification fail.

## Focused framework tests

Tests are added or adjusted only where they protect a refactoring contract:

- login interactions use stable, scoped user-facing locators;
- authentication state is asserted with a web-first expectation;
- locator scoping prevents collisions with similar controls outside the target modal or region;
- multi-file upload performs one selection with all validated fixtures;
- framework project selection does not imply unimplemented feature coverage.

No executable Listings specification is created solely to claim coverage. Existing Test Case IDs,
tags, project names, and traceability mappings stay unchanged.

## Incremental verification

Each logical change group is verified with:

1. `npm run typecheck`;
2. `npm run lint`;
3. `npm run format:check`;
4. the relevant Playwright test selection.

The final verification repeats the complete framework-level suite. End-to-end login execution is
reported separately and only as passing if it is actually run successfully against the configured
environment. Missing executable Listings coverage is reported explicitly.

## Non-goals

- full framework rewrite;
- new application routes, API endpoints, accounts, business rules, or test IDs;
- destructive production tests;
- a new component-test framework or dependency;
- fabricated Profile, Listings, Appointments, or Transactions test coverage;
- changing existing test-case identifiers, tags, Playwright project names, or requirement mappings.

## Acceptance criteria

The refactor is complete when the targeted code smells and synchronization risks have been removed,
focused framework tests protect the changed contracts, and the recorded type-check, lint, formatting,
and relevant Playwright commands pass. Any locator that cannot be verified as unique and any feature
without an executable specification is called out in the final audit rather than represented as
verified coverage.
