# Impact Report Format (Spec-First Mode)

When `technical-reviewer` completes analysis during `spec-review`, it must return an Impact Report formatted as follows for `discussion-maintainer` to record in `## Impact Analysis`:

```markdown
### Direct Consumers
- `workflows/authentication/LoginWorkflow.ts`: Uses updated `LoginPage.submitCredentials`.
- `tests/authentication/login.negative.spec.ts`: Depends on new error message locator.

### Shared Fixtures & State Impact
- `fixtures/page.fixture.ts`: Exposes `loginPage` instance. No breaking signature change.
- Storage State: Does not modify `.auth/defaultUser.json`.

### Risk & Flakiness Assessment
- Risk: Low. Target modal animation takes up to 200ms; mitigated by `await this.heading.waitFor({ state: 'visible' })`.

### Conformance Verdict
- Architectural Layering: PASSED (No locators in tests; no assertions in pages).
- Locator Reliability: PASSED (Semantic role & placeholder locators used).
- Flakiness Prevention: PASSED (Zero `waitForTimeout` calls).
- Mutation Safety: PASSED (Read-only scenario; no production mutation).
```
