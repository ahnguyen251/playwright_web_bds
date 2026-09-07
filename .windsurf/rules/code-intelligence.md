---
trigger: always_on
description: Code navigation, DOM inspection, and intelligence guidelines for Playwright Web BDS
globs:
---

# Code Intelligence and Investigation

Rules for efficient codebase exploration in `playwright_web_bds`.

---

## 1. Traceability First

Before writing tests, trace requirements back to:
- `docs/traceability/requirements-to-tests.md`: Business requirements mapped to case IDs.
- `test-cases/<module>/`: Typed test case definitions with priority and tags.
- `document/`: Product backlogs, screen descriptions, and PDF business specs.

---

## 2. Locating Page Objects & Workflows

- Always check `pages/` to locate existing locators and methods before writing new ones.
- Check `pages/components/` for shared components like `HeaderComponent`.
- Check `workflows/` for existing journey orchestrations.

---

## 3. DOM & UI Inspection

- If DOM elements are unknown or dynamic, inspect using:
  - `node dump_dom.js`
  - `node dump_labels.js`
- Look for accessible names (`name` option in `getByRole`), placeholders, or unique texts.
- Do not inspect live production by guessing locators; verify against known DOM structures.

---

## 4. Run Result & Flakiness Intelligence

- SQLite database records past runs in `database/`.
- Use `npx ts-node scripts/query-verification.ts` to inspect recent test failures and flakiness trends.
