---
name: spec-start
description: Start or resume the discussion phase of a Playwright Web BDS Spec-First development task.
---

# spec-start

Start the discussion phase for a Playwright Web BDS development or test task.

Read and follow `.windsurf/workflows/spec-start.md` completely before taking task actions.

## Procedure

1. Read the complete user request and identify the ticket/task ID (e.g. `BDS-101`). If missing, ask the user.
2. Search `docs/tasks/` for an existing discussion file `docs/tasks/<ticket-number>-<discussion-topic>.md`.
3. If creating a new file, copy `.windsurf/skills/discussion-maintainer/references/discussion-template.md`.
4. Inspect the codebase using `task-investigator` (Page Objects in `pages/`, catalogs in `test-cases/`, DOM dumps, contracts).
5. Record verified findings in `## Verified Findings`, define testable acceptance criteria, and preserve `[DoD-n]` items.
6. Ask at most 1-2 high impact clarification questions if ambiguity exists. Do NOT modify application code.
7. Validate the discussion file:
   `node scripts/validate_discussion.js docs/tasks/<ticket-number>-<discussion-topic>.md --phase discussion --update-metadata`
8. When ready, notify the user: `Discussion is ready. Enter /spec-implement (or run skill spec-implement) to begin implementation.`
