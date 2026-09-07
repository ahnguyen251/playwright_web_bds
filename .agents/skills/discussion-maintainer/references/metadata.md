# Discussion Metadata

Every discussion file in `docs/tasks/<ticket-number>-<discussion-topic>.md` must begin with YAML frontmatter.

```yaml
---
ticket: BDS-101
topic: appointment-booking-flow
template-version: 1.1
status: active
phase: discussion
memory-version: 1
implementation-approved: false
has-dod: false
validation: pending
last-updated: 2026-09-06
---
```

## Fields

- `ticket`: Ticket identifier or task code (e.g. `BDS-101`, `AUTH-02`, `E2E-15`) used in the filename and document title.
- `topic`: Lowercase kebab-case scope identifier used in the filename (e.g. `appointment-booking-flow`, `login-validation`).
- `template-version`: Two-part semantic version of the discussion template layout (current is `1.1`).
- `status`: Overall lifecycle state. Allowed values: `active`, `blocked`, `completed`, `cancelled`.
- `phase`: Current work phase. Allowed values: `discussion`, `implementation`, `review`, `completed`.
- `memory-version`: Positive integer. Start at `1` and increment after every material memory update.
- `implementation-approved`: Whether the user has explicitly approved coding for the current recorded scope.
- `has-dod`: Whether the source task supplies an explicit Definition of Done. If true, criteria must use `[DoD-n]` tags.
- `validation`: Validation result for the current memory version. Allowed values: `pending`, `passed`, `failed`.
- `last-updated`: Date of the latest update in `YYYY-MM-DD` format.

## State Transitions

### 1. New Discussion (`spec-start`)

```yaml
status: active
phase: discussion
memory-version: 1
implementation-approved: false
has-dod: false # or true if DoD provided
template-version: 1.1
validation: pending
last-updated: YYYY-MM-DD
```

Run validation for the `discussion` phase:
`node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase discussion --update-metadata`

### 2. Implementation Approved (`spec-implement`)

Before coding:

```yaml
status: active
phase: implementation
implementation-approved: true
validation: pending
last-updated: YYYY-MM-DD
```

Run validation for `implementation` phase:
`node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase implementation --update-metadata`
Proceed only after validation passes (`validation: passed`).

### 3. Review & Verification (`spec-review`)

```yaml
status: active
phase: review
implementation-approved: true
validation: pending
last-updated: YYYY-MM-DD
```

Run automated Playwright checks (typecheck, lint, test) and record results in **Verification Results**.
Run validation for `review` phase:
`node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase review --update-metadata`

### 4. Completion

```yaml
status: completed
phase: completed
implementation-approved: true
validation: pending
last-updated: YYYY-MM-DD
```

Run completion validation:
`node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase completion --update-metadata`
Declare task completed only after validation is `passed`.

### 5. Blocked Task

Use `status: blocked` when a blocking dependency, credential requirement, or unanswered question halts progress. Keep `phase` unchanged and record at least one `[blocking]` item in **Open Questions**.
When the blocker is resolved, remove/reclassify the question and set `status: active`.
