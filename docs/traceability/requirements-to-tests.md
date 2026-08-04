# Requirements-to-Tests Traceability

| Requirement                  | Implementation evidence                       | Automated evidence                             |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------- |
| Strict environment selection | `config/environment.*`                        | `tests/unit/config/environment.config.spec.ts` |
| Safe credential indirection  | `UserDataFactory`, `users.json`, `.gitignore` | `UserDataFactory.spec.ts`                      |
| Independent typed data       | `ListingDataFactory`                          | `ListingDataFactory.spec.ts`                   |
| Reusable utilities           | `utils/*`                                     | `tests/unit/utils/*`                           |
| Locator ownership            | `pages/*`, ESLint restricted syntax           | `npm run lint`                                 |
| Base Page inheritance        | `pages/base/BasePage.ts`                      | strict TypeScript compilation                  |
| BaseTest fixture composition | `fixtures/test.fixture.ts`                    | `test.fixture.spec.ts`                         |
| Modal login behavior         | `LoginPage`, `AuthenticationWorkflow`         | `LoginPage.spec.ts`                            |
| Authentication state         | `tests/setup/auth.setup.ts`                   | `auth-setup` Playwright project                |
| Multi-browser support        | `playwright.config.ts`                        | `npx playwright test --list`                   |
| Login smoke coverage         | `AUTH-LOGIN-001`                              | `tests/authentication/login.spec.ts`           |
| HTML and Allure reporting    | Playwright reporters                          | generated ignored report directories           |

## Future traceability

Profile, Listings, Appointments, and Transactions currently provide implementation templates. Add a
test-case ID and an automated evidence row when a safe, non-destructive executable scenario is added.
