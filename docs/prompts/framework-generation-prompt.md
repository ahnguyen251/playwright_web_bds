# AI-Assisted Framework Generation Prompt

## Objective

Design and extend an enterprise Playwright + TypeScript framework for a real-estate website using a
pragmatic Clean Page Object Model.

## Guardrails

- Keep tests declarative: scenario calls and assertions only.
- Put every locator in a Page Object or Page component.
- Put reusable, multi-page business operations in Workflows.
- Use typed fixtures for dependency composition and multiple users.
- Use strict TypeScript, async/await, SOLID boundaries, and independent parallel data.
- Never emit credentials, storage-state content, authorization headers, or destructive production
  steps.
- Add a failing behavioral test before implementing new behavior.
- Preserve requirement and test-case traceability.

## Expected extension output

For each new module, generate or update its types, safe test data, Page Objects, Workflow, fixtures,
test-case metadata, executable scenario, and traceability row. Verify typecheck, lint, formatting,
focused tests, and non-destructive browser behavior before completion.
