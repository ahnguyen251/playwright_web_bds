---
name: task-investigator
description: Investigate development task assumptions and existing system behavior in Playwright Web BDS. Inspect code layers, Page Objects, locators, DOM snapshots, network contracts, test case catalogs, database run results, and Git history to produce evidence-backed Verified Findings before implementation begins.
---

# Task Investigator

Investigate only what is necessary to resolve material questions in the active Playwright Web BDS discussion.

## Investigation Workflow

1. Read the active discussion file (`docs/tasks/<ticket>-<topic>.md`) and identify the exact question to verify.
2. Prefer least-invasive sources in this order:
   - Existing Page Objects and components (`pages/`);
   - Existing test suites and fixtures (`tests/`, `fixtures/`, `workflows/`);
   - Typed test catalogs (`test-cases/`) and traceability matrix (`docs/traceability/`);
   - DOM dumps and locator tools (`dump_dom.js`, `dump_labels.js`);
   - Configuration and environment schemas (`config/`, `constants/`);
   - Git history and blame (`git log -S`, `git blame`);
   - SQLite run database records (`scripts/query-verification.ts`).
3. Follow `references/dom-selector-investigation.md` when analyzing UI locators and user interactions.
4. Follow `references/test-case-traceability.md` when tracing business requirements to code.
5. Distinguish clearly between:
   - verified current behavior;
   - historical context;
   - developer assumptions;
   - user-confirmed decisions.
6. Record verified facts under `## Verified Findings` with exact file paths, line numbers, or locator signatures.
7. Put unresolved ambiguity into `## Open Questions` labeled `[blocking]` or `[non-blocking]`. Discovered incompatibilities go into `## Risks and Conflicts`.
