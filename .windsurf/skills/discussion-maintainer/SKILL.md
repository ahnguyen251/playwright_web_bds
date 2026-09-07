---
name: discussion-maintainer
description: Maintain Playwright Web BDS development discussion files as persistent task memory. Use whenever a discussion file must be created, updated, reconciled, resumed, transitioned between phases, or validated; when user clarifications, verified findings, decisions, conflicts, scope changes, implementation progress, or completion results must be merged into task memory; and before implementation begins or a task is declared complete.
---

# Discussion Maintainer

Maintain the selected discussion file as the latest authoritative state of the Playwright Web BDS task.

## Workflow

1. Read the complete existing discussion file, including YAML metadata, before editing it.
2. If creating a new file, use `references/discussion-template.md` and follow `references/metadata.md`.
3. Classify each new item as requirement, verified finding, confirmed decision, constraint, out of scope, implementation detail, open question, risk/conflict, acceptance criterion, verification plan/result, change reconciliation, or expected file change. Follow `references/update-rules.md`.
4. Treat each task-supplied DoD item as a mandatory acceptance criterion labeled `[DoD-n]` in source order. Label additional criteria `[Derived-n]`.
5. Update every related section, not only the most obvious section. Replace outdated or contradictory content rather than keeping a chronological diary.
6. For a material memory update:
   - increment `memory-version` by 1;
   - set `validation: pending`;
   - update `last-updated`;
   - save the file before acting on the new information.
7. Run `node scripts/validate_discussion.js <file> --phase <phase> --update-metadata`:
   - immediately after creating a discussion file;
   - before beginning implementation (`--phase implementation`);
   - after completing review reconciliation (`--phase review`);
   - before declaring completion (`--phase completion`).
8. Do not continue across a phase boundary unless validation passes.
9. Refer to `references/validation-checklist.md` for semantic quality checks.

## Safety & Layering Rules

- Discussion files are persistent memory in `docs/tasks/<ticket-number>-<discussion-topic>.md`.
- Never set `implementation-approved: true` without explicit user confirmation.
- Keep unresolved blocking questions prefixed with `[blocking]`. If work cannot proceed, set `status: blocked`.
- For Playwright tasks, ensure the proposed implementation respects the 4-layer architecture (`tests/`, `fixtures/`, `workflows/`, `pages/`) and obeys the mutation safety gates (`RUN_MUTATING_E2E`).
