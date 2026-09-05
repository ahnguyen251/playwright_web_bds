# Task Memory Update & Merge Rules

## 1. Classification of Inputs

Whenever new information arrives from the user, codebase investigation, or test run:

| Type | Destination Section | Rule |
| :--- | :--- | :--- |
| **User Requirement** | `## Requirements` | Direct functional or test behavior requested by the user. |
| **Definition of Done** | `## Acceptance Criteria` | Tagged with stable sequential label `[DoD-1]`, `[DoD-2]`, etc. |
| **Derived Criteria** | `## Acceptance Criteria` | Tagged with `[Derived-1]`, `[Derived-2]`, etc. |
| **Code / DOM Fact** | `## Verified Findings` | Concrete locator, route, component, API endpoint discovered in the codebase. |
| **Confirmed Decision**| `## Confirmed Decisions` | Architectural or scoping choices explicitly approved by user. |
| **Technical Boundary**| `## Constraints` | E.g., no mutating tests on production, no direct Google OAuth, strict mode locators. |
| **Excluded Work** | `## Out of Scope` | E.g., Admin dashboard, destructive tests, payment gateways without mock. |
| **Architecture Plan** | `## Proposed Implementation`| Page Object design, workflow orchestration, fixture integration. |
| **File Plan** | `## Expected File Changes` | Exact paths of files to create, modify, or delete. |
| **Unresolved Query** | `## Open Questions` | Must be prefixed with `[blocking]` or `[non-blocking]`. |
| **Risk / Conflict** | `## Risks and Conflicts` | Potential flakiness, rate limiting, DOM changes, credential requirements. |
| **Impact Analysis** | `## Impact Analysis` | Direct consumers, shared fixtures, other tests impacted. |
| **Test Verification** | `## Verification Plan` | Specific commands (`npm run test:...`), manual steps, agent vs developer ownership. |
| **Test Evidence** | `## Verification Results` | Actual run outputs, exit codes, failure logs, screenshot/video paths. |
| **Code Baseline** | `## Change Reconciliation` | Pre-existing local diff, committed changes, reconciled file list. |

## 2. Merge Rules

1. **Replace, Don't Append Chronologically**:
   - The discussion file represents the *current authoritative state*, not an append-only meeting log.
   - If an assumption is proven false by `task-investigator`, update or remove it from **Current Understanding** and record the fact in **Verified Findings**.
   - If an open question is answered, move the answer to **Confirmed Decisions** or **Requirements** and delete the question from **Open Questions**.

2. **Definition of Done (DoD) Protection**:
   - Every item provided as Definition of Done must be preserved with stable identifier `[DoD-n]`.
   - Never remove or weaken a `[DoD-n]` item without explicit user confirmation.
   - Additional test assertions or regression checks must be labeled `[Derived-n]`.

3. **Material Memory Updates**:
   - Increment `memory-version` by 1 whenever requirements, implementation design, file changes, or acceptance criteria change materially.
   - Set `validation: pending`.
   - Update `last-updated: YYYY-MM-DD`.

4. **Safety Gates Enforcement**:
   - Never set `implementation-approved: true` without explicit user permission.
   - If any `[blocking]` question remains under `## Open Questions`, coding CANNOT begin.
