---
trigger: always_on
description: Build, validation, and test commands for Playwright Web BDS
globs:
---

# Build and Verification Rules

Always verify changes using the official repository scripts and commands.

---

## 1. Static Validation (Agent-Owned)

Run static checks before and during review:

```powershell
# Check TypeScript types
npm run typecheck

# Check ESLint (must have 0 warnings)
npm run lint

# Check formatting
npm run format:check
```

---

## 2. Spec-First Discussion Validation (Agent-Owned)

Validate persistent task memory files before phase transitions:

```powershell
# Validate discussion phase
node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase discussion --update-metadata

# Validate implementation phase
node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase implementation --update-metadata

# Validate review phase
node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase review --update-metadata

# Validate completion phase
node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase completion --update-metadata
```

---

## 3. Test Execution Commands (Agent-Owned)

Execute scoped tests to avoid running long or mutating suites unnecessarily:

```powershell
# Run a specific spec file
npx playwright test tests/authentication/login.boundary.spec.ts

# Run smoke tests
npm run test:smoke

# Run non-mutating authentication tests
npm run test:auth

# Run business catalog tests
npm run test:business

# Run framework component/unit tests
npm run test:framework
```

---

## 4. Test Reporting & Evidence

```powershell
# Generate Allure report
npm run report:allure:generate

# Clean old failure evidence
npm run evidence:cleanup
```
