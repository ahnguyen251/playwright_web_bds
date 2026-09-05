---
name: page-component-design
description: Design, implement, and maintain Page Objects and UI Components in pages/ and pages/components/. Use when adding new pages, updating UI locators, encapsulating dialogs or forms, and enforcing strict mode locator safety.
---

# Page & Component Design

Construct resilient, maintainable Page Objects and Components for Propify web testing.

## Workflow

1. Determine whether the UI surface is an entire Page or a reusable Component:
   - Pages go to `pages/<domain>/<Name>Page.ts` (e.g. `pages/listings/ListingPage.ts`).
   - Reusable elements go to `pages/components/<Name>Component.ts` (e.g. `HeaderComponent.ts`).
2. Extend `BasePage` for pages, and call `super(page)`.
3. Declare private readonly `Locator` fields initialized in constructor.
4. Use accessible semantic locators (`getByRole`, `getByPlaceholder`, `getByText`, `getByTestId`).
5. Expose public async action methods that wait for element stability before interacting.
6. Expose state inspection methods that return primitive types (`boolean`, `string`, `number`).
7. Never import `@playwright/test` assertions into page classes.
8. Follow `references/locator-best-practices.md`.
