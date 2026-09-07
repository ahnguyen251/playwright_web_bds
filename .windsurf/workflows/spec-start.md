---
description: Start the discussion phase for a Playwright Web BDS task (Spec-First Development)
---

1. Apply `../rules/spec-first-development.md`, especially **Task interpretation**, **Persistent task memory**, and the **Discussion** skill routing.
2. Read the complete task and identify its ticket or task ID (e.g. `BDS-101`, `AUTH-01`). If unavailable, ask the user and stop.
3. Search `docs/tasks/` for an existing discussion file matching the ticket and scope. Continue a matching file with `status: active` or `status: blocked` when appropriate. If multiple candidates exist or only a `completed` or `cancelled` file matches, ask the user whether to reactivate one or create a new discussion; never modify completed or cancelled task memory without explicit direction. Otherwise derive a concise, specific lowercase kebab-case topic.
4. Execute the rule's Discussion skill routing to resume task memory or create it with the routed template and metadata at:

   `docs/tasks/<ticket-number>-<discussion-topic>.md`

   The topic must describe the selected scope, remain distinguishable from other discussions for the ticket, and avoid generic names such as `implementation`, `changes`, `playwright`, or `test`.

5. Inspect the relevant codebase (`pages/`, `workflows/`, `fixtures/`, `tests/`, `test-cases/`) and DOM structure using `task-investigator` until its readiness gate is satisfied or progress is blocked.
6. Record already-known verification methods through the Discussion routing, but do not execute application test commands or modify source code.
7. Ask no more than one or two high-impact clarification questions when needed and route each answer through `discussion-maintainer` before continuing.
8. When the discussion is approved and ready for implementation, validate the file:
   `node scripts/validate_discussion.js docs/tasks/<ticket-number>-<discussion-topic>.md --phase discussion --update-metadata`
9. Tell the user: `Discussion is ready. Enter /spec-implement to begin implementation.`
