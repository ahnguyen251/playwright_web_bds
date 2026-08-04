# Framework Requirements

## Scope

Automate user-facing Propify features with Playwright, TypeScript, Node.js, npm, and the Playwright
Test runner. The initial executable coverage is authentication; Profile, Listings, Appointments, and
Transactions are represented by scalable Page Object and Workflow templates. Admin features are
excluded.

## Architecture requirements

1. Tests contain scenarios and assertions only.
2. Page Objects and components own all locators and UI interactions.
3. Workflows coordinate reusable business flows and contain no selectors.
4. Fixtures compose users, contexts, Pages, Workflows, and authentication state.
5. Types define all shared contracts.
6. Test data is non-sensitive and separate from test code.
7. Utilities contain only technical, reusable behavior.
8. Dependencies point from tests toward lower layers only.

## Runtime requirements

- dev, staging, and production environment selection;
- Chromium, Firefox, and WebKit projects;
- fully parallel execution;
- multiple user aliases and storage-state files;
- smoke and regression tags;
- screenshot, video, trace, and HTML reporting;
- Allure reporter preparation;
- CI-compatible scripts and secret handling.

## Current acceptance test

`AUTH-LOGIN-001` validates that a configured Propify user can sign in through the real login modal
and reaches the authenticated header state.
