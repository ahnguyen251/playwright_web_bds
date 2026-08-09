# Listings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production-ready Playwright coverage for Propify Listings UC-08 through UC-17 with Page Object Model, complete traceability, independent tests, and a centralized opt-in gate for all mutations.

**Architecture:** Extend the existing test -> fixture -> workflow -> Page Object/component -> utility/data dependency direction. Reuse one listing form for create/edit and one listing-card abstraction for public/favorite results; expose typed observations through `ListingWorkflow`. Read-only tests use the ordinary fixture, while every state-changing scenario imports one auto-skipping `mutatingTest` fixture.

**Tech Stack:** Node.js >=20, TypeScript 6 strict mode, Playwright Test 1.62.1, Zod 4.4.3, ESLint 10, Prettier 3, HTML and Allure reporters.

## Global Constraints

- `document/NghiepvuPropify.pdf` UC-08 through UC-17 is the source of truth.
- Preserve the duplicated source UC-11; use `UC-11-WITHDRAW` only as the unambiguous internal identifier.
- Do not fabricate `Chờ duyệt` -> `Đang đăng` or any admin approval transition.
- `Gỡ tin đăng` changes status to `Đã gỡ`; it never physically deletes the database record.
- Mutating tests run only when the strict flag `ALLOW_MUTATING_E2E=true` is present.
- Never execute mutating tests against the currently configured production target during implementation or verification.
- Read-only tests run by default; UC-10 remains read-only even though viewing increments view count.
- Prefer guest UC-16 tests so authenticated search history is not polluted.
- Tests contain scenarios and assertions only; locators remain in Page Objects/components.
- Workflows contain no selectors, assertions, environment reads, or database access.
- Independent E2E tests must not consume another test's output or depend on execution order.
- Unavailable controlled state causes an explicit data-state skip; tests never select arbitrary production records for edit, favorite, or withdrawal.
- Automate network, upload, timeout, and server failures only through deterministic routing or a stable application mechanism; otherwise retain manual traceability.

---

## File Structure

### Create

- `fixtures/mutating.fixture.ts`: one auto-skipping mutation fixture.
- `fixtures/listing-state.fixture.ts`: typed controlled-listing resolution and data-state skips.
- `constants/listings.ts`: current UI limits and exact status labels shared by data and Pages.
- `pages/components/ListingCardComponent.ts`: shared public/favorite card observations and favorite interaction.
- `pages/listings/FavoritesPage.ts`: favorites list navigation and observations.
- `test-data/factories/ListingReferenceFactory.ts`: environment-backed controlled listing references.
- `test-cases/listings/listing.test-cases.ts`: immutable UC/scenario metadata.
- `tests/unit/test-data/ListingReferenceFactory.spec.ts`: controlled-state factory tests.
- `tests/unit/test-cases/listing.test-cases.spec.ts`: scenario ID and traceability contract tests.
- `tests/component/fixtures/mutating.fixture.spec.ts`: auto-skip safety proof.
- `tests/component/pages/ListingFormComponent.spec.ts`: form/create/edit behavior.
- `tests/component/pages/ListingListPage.spec.ts`: UC-16/UC-17 page behavior.
- `tests/component/pages/ListingDetailPage.spec.ts`: UC-10 page behavior.
- `tests/component/pages/MyListingsPage.spec.ts`: UC-09 and withdrawal behavior.
- `tests/component/pages/FavoritesPage.spec.ts`: UC-12 card/favorite behavior.
- `tests/listings/view-own-listings.read-only.spec.ts`: UC-09 safe E2E.
- `tests/listings/listing-detail.read-only.spec.ts`: UC-10 safe E2E.
- `tests/listings/search-listing.read-only.spec.ts`: UC-16 safe E2E.
- `tests/listings/filter-listing.read-only.spec.ts`: UC-17 safe E2E.
- `tests/listings/create-listing.mutating.spec.ts`: UC-08 gated E2E.
- `tests/listings/edit-listing.mutating.spec.ts`: UC-11 edit gated E2E.
- `tests/listings/withdraw-listing.mutating.spec.ts`: UC-11-WITHDRAW gated E2E.
- `tests/listings/favorite-listing.mutating.spec.ts`: UC-12 gated E2E.
- `test-data/files/listing-images/property.png`: synthetic valid image.
- `test-data/files/listing-videos/property.mp4`: synthetic valid one-second video.
- `test-data/files/listing-files/invalid.txt`: invalid media fixture.

### Modify

- `.env.example`: document mutation flag and controlled listing keys.
- `README.md`: Listings commands, controlled state, and production safety.
- `config/environment.schema.ts`: parse strict mutation opt-in.
- `config/environment.config.ts`: expose parsed opt-in.
- `constants/routes.ts`: add current `/post-listing` route.
- `fixtures/page.fixture.ts`: register `FavoritesPage`.
- `fixtures/workflow.fixture.ts`: provide all Listings Page Objects to `ListingWorkflow`.
- `fixtures/test.fixture.ts`: compose the controlled-listing fixture into the exported base test.
- `pages/components/ListingFormComponent.ts`: match the current create/edit form and media behavior.
- `pages/listings/CreateListingPage.ts`: create readiness, submission, success, and status.
- `pages/listings/EditListingPage.ts`: prefilled edit, update, success, and status.
- `pages/listings/ListingDetailPage.ts`: complete UC-10 observations and favorite state.
- `pages/listings/ListingListPage.ts`: UC-16 search/sort/pagination and UC-17 filters.
- `pages/listings/MyListingsPage.ts`: owned list/search/filter/pagination and withdrawal.
- `test-data/factories/ListingDataFactory.ts`: nested immutable valid listing generation.
- `test-data/static/listing.json`: deterministic, non-sensitive valid create data.
- `tests/component/fixtures/test.fixture.spec.ts`: assert new Page/Workflow composition.
- `tests/unit/config/environment.config.spec.ts`: safety flag parsing.
- `tests/unit/test-data/ListingDataFactory.spec.ts`: validation and boundary cases.
- `types/environment.types.ts`: add `allowMutatingE2E`.
- `types/listing.types.ts`: full form, search/filter, state, and observable contracts.
- `types/test-case.types.ts`: add Listings traceability extension without breaking Authentication.
- `utils/FileUploadHelper.ts`: support multiple files and video while preserving fixture-root confinement.
- `workflows/listings/ListingWorkflow.ts`: all UC-08 through UC-17 orchestration.
- `docs/traceability/requirements-to-tests.md`: complete Listings evidence matrix.

## Controlled Environment Keys

`.env.example` will document optional controlled-state references. Each affected test skips when its
required pair is absent.

```dotenv
ALLOW_MUTATING_E2E=false
LISTING_APPROVED_ID=
LISTING_APPROVED_TITLE=
LISTING_NO_MEDIA_ID=
LISTING_NO_MEDIA_TITLE=
LISTING_UNAPPROVED_ID=
LISTING_UNAPPROVED_TITLE=
LISTING_OWNED_EDITABLE_ID=
LISTING_OWNED_EDITABLE_TITLE=
LISTING_OWNED_PUBLISHED_CANCEL_ID=
LISTING_OWNED_PUBLISHED_CANCEL_TITLE=
LISTING_OWNED_PUBLISHED_WITHDRAW_ID=
LISTING_OWNED_PUBLISHED_WITHDRAW_TITLE=
LISTING_OTHER_OWNER_ID=
LISTING_OTHER_OWNER_TITLE=
```

---

## Requirement and Scenario Matrix

### UC-08 - Create Listing

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC08-001 | Create valid listing with image | Authenticated user with valid phone | `ListingDataFactory.create()` + `property.png` | Listing persists with linked media, success feedback, status `Chờ duyệt`; no public visibility assertion | Mutating | Valid-phone owner account | `create-listing.mutating.spec.ts` |
| LIST-UC08-002 | Create valid listing with optional video control | Authenticated user with a valid phone number | Valid image plus committed synthetic `property.mp4` | Form accepts video and successful create remains `Chờ duyệt` | Mutating | Valid-phone owner account | Component coverage plus gated E2E |
| LIST-UC08-003 | Missing valid phone | Authenticated account without phone | Valid listing | Update-phone requirement appears; listing is not created | Mutating | Controlled no-phone user | E2E when alias is configured; otherwise manual traceability |
| LIST-UC08-004 | Missing required listing data | Authenticated valid-phone user | Empty required fields | Field-level validation appears; no success feedback | Mutating | Valid-phone owner account | Component + gated E2E |
| LIST-UC08-005 | Required text/numeric boundaries | Authenticated valid-phone user | title 120/121, description 5000/5001, zero/negative area or price | Exact supported boundaries are accepted in the form; out-of-range values show field feedback and do not persist | Mutating | Valid-phone owner account | Component + gated validation E2E |
| LIST-UC08-006 | Media count/size boundaries | Authenticated valid-phone user | 10/11 images, 3MB/over-3MB image, one 10MB/over-10MB video | Current UI limits are accepted at boundary and rejected above boundary; no false success | Mutating | Valid-phone owner account | Deterministic component coverage; gated E2E only for small committed fixtures |
| LIST-UC08-007 | Media type/upload rejected | Authenticated valid-phone user | `invalid.txt` or deterministic failed media | Media error appears and retry remains possible | Mutating | Valid-phone owner account | Component; gated E2E only if client validation is stable |
| LIST-UC08-008 | Upload/network/timeout/system error | Authenticated valid-phone user; all required listing fields and media are valid | Deterministic failed upload/request route | User sees retry/failure feedback and no false success | Mutating | Stable request endpoint identified | Playwright route test when deterministic; otherwise manual |

### UC-09 - View Own Listings

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC09-001 | View current user's listings | Authenticated | none | Table contains only current user's records and shows statuses | Read-only | Account with owned listings | `view-own-listings.read-only.spec.ts` |
| LIST-UC09-002 | Empty owned list | Authenticated | none | `Không có tin đăng` empty state | Read-only | Controlled empty account | E2E when alias exists; component otherwise |
| LIST-UC09-003 | Search owned listings | Authenticated | controlled owned title | Matching owned row remains | Read-only | `LISTING_OWNED_EDITABLE_TITLE` | Read-only E2E |
| LIST-UC09-004 | Filter owned listings | Authenticated | sale/rent and UI status filter | Rows match selected filter | Read-only | Account with matching records | Read-only E2E/component |
| LIST-UC09-005 | Next/previous pagination | Authenticated | list larger than one page | Page changes and can return | Read-only | Paginated owned list | E2E when state exists; component otherwise |
| LIST-UC09-006 | No owned-search result | Authenticated | collision-resistant missing keyword | Empty state appears | Read-only | Any authenticated account | Read-only E2E |
| LIST-UC09-007 | Owned-list load error | Authenticated | deterministic failed list request | Error/retry UI appears | Read-only | Stable request endpoint identified | Route test when deterministic; otherwise manual |

### UC-10 - Listing Detail

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC10-001 | Complete approved detail | Listing exists and is `Đã duyệt` | `LISTING_APPROVED_ID` | Basic data, media, description, contact, utilities, and related listings are visible | Read-only | Controlled approved listing | `listing-detail.read-only.spec.ts` |
| LIST-UC10-002 | Listing does not exist | none | impossible numeric ID | Not-found feedback appears; detail content is absent | Read-only | None | Read-only E2E |
| LIST-UC10-003 | Listing not approved | Listing exists but is not approved | `LISTING_UNAPPROVED_ID` | Public content is not displayed | Read-only | Controlled non-approved listing | Read-only E2E when configured; component otherwise |
| LIST-UC10-004 | Approved listing without media | Approved listing has no media | `LISTING_NO_MEDIA_ID` | Default image is displayed | Read-only | Controlled approved no-media listing | Read-only E2E when configured; component otherwise |
| LIST-UC10-005 | View counter side effect | Approved detail is open | approved reference | View count remains a valid displayed value; flow stays read-only-classified | Read-only | Controlled approved listing | Covered with 001; no mutation gate |

### UC-11 - Edit Listing

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC11-EDIT-001 | Edit owned listing information | Authenticated owner; listing exists | unique title/description override | Changes persist, success feedback appears, status becomes `Chờ duyệt` | Mutating | `LISTING_OWNED_EDITABLE_ID` + `LISTING_OWNED_EDITABLE_TITLE` | `edit-listing.mutating.spec.ts` |
| LIST-UC11-EDIT-002 | Add and remove media | Authenticated owner; editable listing exists and has existing media | synthetic image plus existing media name | Media set updates and status becomes `Chờ duyệt` | Mutating | Owned editable listing with media | Gated E2E/component |
| LIST-UC11-EDIT-003 | Unauthorized edit | Authenticated non-owner | `LISTING_OTHER_OWNER_ID` | `Không có quyền`; no editable content is persisted | Mutating | Controlled other-owner listing | Gated E2E when configured; component otherwise |
| LIST-UC11-EDIT-004 | Invalid edit data | Authenticated owner | invalid boundary override | Field feedback appears; old listing data remains | Mutating | Owned editable listing | Component + gated E2E |
| LIST-UC11-EDIT-005 | Edit media upload failure | Authenticated owner | deterministic invalid/failed media | Upload error appears and retry is available | Mutating | Owned editable listing | Component/route test when deterministic |

### Source UC-11 / Internal UC-11-WITHDRAW - Withdraw Listing

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC11-WITHDRAW-001 | Confirm withdrawal | Authenticated owner; status `Đang đăng` | controlled withdraw-only published reference | Confirmation appears; status becomes `Đã gỡ`; list refreshes; public listing disappears; record is not physically deleted | Mutating | Reseedable `LISTING_OWNED_PUBLISHED_WITHDRAW_*` | `withdraw-listing.mutating.spec.ts` |
| LIST-UC11-WITHDRAW-002 | Cancel withdrawal | Authenticated owner; listing exists with status `Đang đăng` | controlled cancel-only published reference | Dialog closes; status and visibility are preserved | Mutating | `LISTING_OWNED_PUBLISHED_CANCEL_*` | Gated E2E |
| LIST-UC11-WITHDRAW-003 | Reject invalid status | Authenticated owner; status is not `Đang đăng` | controlled editable/pending title | `Không cho phép gỡ`; status is unchanged | Mutating | Owned non-published listing | Gated E2E/component |
| LIST-UC11-WITHDRAW-004 | Reject non-owner | Authenticated non-owner | other-owner reference | Ownership error; no status change | Mutating | Controlled other-owner listing | Gated E2E when configured; component otherwise |
| LIST-UC11-WITHDRAW-005 | Missing listing | Authenticated user | missing title | No action is offered/performed | Mutating | None | Component; E2E avoided because arbitrary data is forbidden |
| LIST-UC11-WITHDRAW-006 | Withdrawal request failure | Valid published owned listing | deterministic failed request | Failure feedback appears; listing remains published | Mutating | Stable request endpoint identified | Route test when deterministic; otherwise manual |

### UC-12 - Favorite Listing

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC12-001 | Add then remove favorite | Authenticated; public listing exists | approved listing reference | First click selects heart and shows success; second click clears it and restores initial state | Mutating | Controlled approved listing | `favorite-listing.mutating.spec.ts` |
| LIST-UC12-002 | Verify favorites list | Authenticated; listing favorited inside same test | approved listing reference | Favorites page contains listing after add and not after remove | Mutating | Controlled approved listing | Same independent gated test as 001 |
| LIST-UC12-003 | Unauthenticated favorite | Guest; listing exists | approved listing reference | Login modal/redirect appears; favorite is not added | Mutating | Controlled approved listing | Gated E2E/component |
| LIST-UC12-004 | Listing not found | Authenticated | missing ID | Not-found feedback; no favorite mutation | Mutating | None | Component/read-only route behavior |
| LIST-UC12-005 | Favorite request failure/retry | Authenticated | deterministic failed favorite request | Error appears and retry remains possible; icon state is consistent | Mutating | Stable request endpoint identified | Route test when deterministic; otherwise manual |

### UC-16 - Search Listing

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC16-001 | Valid public keyword | Guest; eligible data exists | controlled approved title fragment | Results contain eligible matching listing | Read-only | Controlled approved listing | `search-listing.read-only.spec.ts` |
| LIST-UC16-002 | Keyword-only search | Guest | keyword with filters at defaults | Results are based on keyword without added filters | Read-only | Public matching data | Read-only E2E |
| LIST-UC16-003 | No results | Guest | unique absent keyword | Empty-result feedback appears | Read-only | None | Read-only E2E |
| LIST-UC16-004 | Keyword over configured max | Guest | configured maximum plus one character | Validation appears and search request is not accepted | Read-only | The configured maximum must be supplied by an authoritative application source | Manual evidence: the deployed input currently exposes no `maxlength`, `minlength`, or `pattern`; do not invent a numeric boundary |
| LIST-UC16-005 | Sort results | Guest | each current UI sort option | Visible summaries follow selected order | Read-only | Multiple public listings | Component; E2E for one deterministic order |
| LIST-UC16-006 | Next/previous result page | Guest | result set larger than page size | Next changes results; Previous restores prior page | Read-only | Paginated public list | E2E when state exists; component otherwise |
| LIST-UC16-007 | Exclude ineligible listings | Guest | approved and non-approved controlled references | Only eligible approved/public result is visible | Read-only | Approved plus non-approved data | E2E when configured; component otherwise |
| LIST-UC16-008 | Search load/network error | Guest | deterministic failed request | Error/retry feedback appears | Read-only | Stable request endpoint identified | Route test when deterministic; otherwise manual |

### UC-17 - Filter Listing

| Scenario ID | Scenario | Preconditions | Test data | Expected result | Class | Required state | Playwright evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIST-UC17-001 | Poster is `Chủ nhà` | Public list has owner records | `poster: 'owner'` | Every result is owner-posted | Read-only | Public owner listings | `filter-listing.read-only.spec.ts` |
| LIST-UC17-002 | Poster is `Môi giới` | Public list has broker records | `poster: 'broker'` | Every result is broker-posted | Read-only | Public broker listings | Read-only E2E |
| LIST-UC17-003 | Predefined price range | Public priced listings exist | current UI preset | Every displayed price is in range | Read-only | Public priced listings | Read-only E2E/component |
| LIST-UC17-004 | Custom price From/To | Public list contains listings with numeric prices | positive `from` and `to` | Every result is in custom range | Read-only | Public priced listings | Read-only E2E/component |
| LIST-UC17-005 | Predefined area range | Public area data exists | current UI preset | Every area is in range | Read-only | Public listings | Read-only E2E/component |
| LIST-UC17-006 | Custom area From/To | Public list contains listings with numeric areas | positive `from` and `to` | Every area is in custom range | Read-only | Public listings | Read-only E2E/component |
| LIST-UC17-007 | Combine supported filters | Public matching data exists | poster + price + area | Every result satisfies all conditions | Read-only | Controlled matching list | Read-only E2E/component |
| LIST-UC17-008 | Result count is correct | Any active filter | selected criteria | Displayed count equals returned visible summaries | Read-only | Any stable list | Covered with 007 |
| LIST-UC17-009 | Reset filters | Filters active | non-default criteria | Defaults return and original list/count is restored | Read-only | Any stable list | Read-only E2E/component |
| LIST-UC17-010 | Price From greater than To | Public list open | `{from: 10, to: 2}` | Price validation message appears | Read-only | None | Component + read-only E2E if stable |
| LIST-UC17-011 | Area From greater than To | Public list open | `{from: 100, to: 30}` | Area validation message appears | Read-only | None | Component + read-only E2E if stable |
| LIST-UC17-012 | Non-positive range value | Public list open | `0` and negative input | UI normalizes the value to `0` | Read-only | None | Component + read-only E2E |
| LIST-UC17-013 | No matching results | Public list open | impossible combined range | Empty feedback and zero count appear | Read-only | None | Read-only E2E |
| LIST-UC17-014 | Filter load error | Public list open | deterministic failed request | Error/retry feedback appears | Read-only | Stable request endpoint identified | Route test when deterministic; otherwise manual |

---

## Recommended Implementation Order

| Order | Deliverable | Why first/next |
| --- | --- | --- |
| 1 | Mutation environment contract and auto-skip fixture | Makes every later mutation safe before its test file exists |
| 2 | Listing types, controlled references, factories, and media helpers | Establishes exact interfaces consumed by all Pages and Workflows |
| 3 | Scenario metadata and traceability validation | Locks IDs/classifications before executable coverage |
| 4 | Shared form plus Create/Edit Page Objects | Builds UC-08/UC-11 shared behavior once |
| 5 | Listing card plus public list/search/filter Page Object | Builds UC-16/UC-17 and reusable card behavior |
| 6 | Detail Page Object | Completes UC-10 observations and favorite entry point |
| 7 | My Listings Page Object | Completes UC-09 and UC-11-WITHDRAW controls |
| 8 | Favorites Page Object | Completes UC-12 list verification |
| 9 | Listing workflow and fixture composition | Coordinates Pages only after their interfaces are stable |
| 10 | Read-only E2E specs | Safe live evidence can run by default |
| 11 | Mutating E2E specs | Files exist and list as skipped; no production mutation is run |
| 12 | Documentation, traceability, and full safe verification | Final consistency and release evidence |

---

### Task 1: Centralized Mutation Safety Gate

**Files:**
- Modify: `.env.example`
- Modify: `types/environment.types.ts`
- Modify: `config/environment.schema.ts`
- Modify: `config/environment.config.ts`
- Create: `fixtures/mutating.fixture.ts`
- Modify: `tests/unit/config/environment.config.spec.ts`
- Create: `tests/component/fixtures/mutating.fixture.spec.ts`

**Interfaces:**
- Produces: `EnvironmentConfig.allowMutatingE2E: boolean`.
- Produces: `mutatingTest` and `expect` from `fixtures/mutating.fixture.ts`.
- Rule: only the exact string `true` enables mutations; absence and `false` disable them.

- [ ] **Step 1: Write failing configuration and fixture tests**

```ts
test('disables mutating E2E by default', () => {
  expect(loadEnvironmentConfig(validEnvironment()).allowMutatingE2E).toBe(false);
});

test('enables mutating E2E only for exact true', () => {
  expect(
    loadEnvironmentConfig(validEnvironment({ ALLOW_MUTATING_E2E: 'true' })).allowMutatingE2E,
  ).toBe(true);
});
```

The fixture component test imports `mutatingTest`, throws from its body, and is expected to be
reported skipped when the flag is absent. This proves the auto fixture prevents the body from
running without launching a nested test process.

- [ ] **Step 2: Verify RED**

Run: `Remove-Item Env:ALLOW_MUTATING_E2E -ErrorAction SilentlyContinue; npx playwright test tests/unit/config/environment.config.spec.ts tests/component/fixtures/mutating.fixture.spec.ts --project=framework`

Expected: FAIL because `allowMutatingE2E` and `mutatingTest` do not exist.

- [ ] **Step 3: Implement the strict schema and one auto fixture**

```ts
// environment.schema.ts
ALLOW_MUTATING_E2E: z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true'),

// mutating.fixture.ts
import { loadEnvironmentConfig } from '../config/environment.config';
import { expect, test as base } from './test.fixture';

export const mutatingTest = base.extend<{ readonly mutationSafety: void }>({
  mutationSafety: [
    async ({}, use, testInfo) => {
      const { allowMutatingE2E } = loadEnvironmentConfig();
      testInfo.skip(
        !allowMutatingE2E,
        'Mutating E2E is disabled. Set ALLOW_MUTATING_E2E=true only for an approved target.',
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
```

Add `allowMutatingE2E: parsed.data.ALLOW_MUTATING_E2E` to `loadEnvironmentConfig` and document
`ALLOW_MUTATING_E2E=false` in `.env.example`.

```ts
// mutating.fixture.spec.ts
import { mutatingTest } from '../../../fixtures/mutating.fixture';

mutatingTest('does not enter a mutating test body without explicit opt-in', () => {
  throw new Error('Mutation safety fixture did not skip the test');
});
```

- [ ] **Step 4: Verify GREEN and default skip behavior**

Run: `Remove-Item Env:ALLOW_MUTATING_E2E -ErrorAction SilentlyContinue; npx playwright test tests/unit/config/environment.config.spec.ts tests/component/fixtures/mutating.fixture.spec.ts --project=framework`

Expected: configuration tests PASS, the fixture proof is SKIPPED, and no test body runs.

- [ ] **Step 5: Commit**

```powershell
git add .env.example types/environment.types.ts config/environment.schema.ts config/environment.config.ts fixtures/mutating.fixture.ts tests/unit/config/environment.config.spec.ts tests/component/fixtures/mutating.fixture.spec.ts
git commit -m "test: add listings mutation safety gate"
```

### Task 2: Listing Contracts, Controlled State, and Test Data

**Files:**
- Create: `constants/listings.ts`
- Modify: `types/listing.types.ts`
- Modify: `test-data/static/listing.json`
- Modify: `test-data/factories/ListingDataFactory.ts`
- Create: `test-data/factories/ListingReferenceFactory.ts`
- Modify: `utils/FileUploadHelper.ts`
- Modify: `tests/unit/test-data/ListingDataFactory.spec.ts`
- Create: `tests/unit/test-data/ListingReferenceFactory.spec.ts`
- Create: `test-data/files/listing-images/property.png`
- Create: `test-data/files/listing-videos/property.mp4`
- Create: `test-data/files/listing-files/invalid.txt`

**Interfaces:**
- Produces: `ListingData`, `ListingMedia`, `ListingLocation`, `ListingContact`, `ListingStatus`,
  `ListingReference`, `ListingSearchCriteria`, `ListingFilterCriteria`, `ListingSummary`, and
  `ListingDetailSnapshot`.
- Produces: `ListingDataFactory.create(overrides?): ListingData`, `.uniqueTitle(prefix?): string`,
  `.boundaryText(length): string`.
- Produces: `ListingReferenceFactory.get(alias: ControlledListingAlias, source?): ListingReference | undefined`.
- Produces: `FileUploadHelper.uploadMany(locator, paths): Promise<void>`.
- Produces: `LISTING_UI_LIMITS` with title `120`, description `5000`, maximum images `10`, maximum
  image bytes `3 * 1024 * 1024`, maximum video bytes `10 * 1024 * 1024`, and one video.

- [ ] **Step 1: Write failing immutable-data, validation, boundary, and reference tests**

```ts
test('creates nested independent listing media and location', () => {
  const first = ListingDataFactory.create();
  const second = ListingDataFactory.create();
  expect(first).not.toBe(second);
  expect(first.media).not.toBe(second.media);
  expect(first.location).not.toBe(second.location);
});

test('rejects non-positive required numeric values', () => {
  expect(() => ListingDataFactory.create({ area: 0 })).toThrow(
    'Listing area must be positive',
  );
});

test('generates exact and over-limit text boundaries', () => {
  expect(ListingDataFactory.boundaryText(120)).toHaveLength(120);
  expect(ListingDataFactory.boundaryText(121)).toHaveLength(121);
});

test('returns undefined when a controlled reference is incomplete', () => {
  expect(ListingReferenceFactory.get('approved', {})).toBeUndefined();
});
```

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/unit/test-data/ListingDataFactory.spec.ts tests/unit/test-data/ListingReferenceFactory.spec.ts --project=framework`

Expected: FAIL because nested contracts and `ListingReferenceFactory` are absent.

- [ ] **Step 3: Implement exact shared contracts and factories**

```ts
export interface ListingMedia {
  readonly imagePaths: readonly string[];
  readonly videoPath?: string;
}

export interface ListingLocation {
  readonly province: string;
  readonly ward: string;
  readonly street: string;
  readonly addressLine: string;
}

export interface ListingContact {
  readonly role: 'owner' | 'broker';
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
}

export interface ListingData {
  readonly transactionType: 'sale' | 'rent';
  readonly title: string;
  readonly description: string;
  readonly propertyType: string;
  readonly price: number;
  readonly negotiable: boolean;
  readonly area: number;
  readonly location: ListingLocation;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly frontage?: number;
  readonly depth?: number;
  readonly floorNumber?: number;
  readonly floors?: number;
  readonly houseDirection?: string;
  readonly balconyDirection?: string;
  readonly balconies?: number;
  readonly furnishing?: 'furnished' | 'basic' | 'unfurnished';
  readonly amenities: readonly string[];
  readonly contact: ListingContact;
  readonly media: ListingMedia;
}

export interface ListingReference {
  readonly id: string;
  readonly title: string;
}

export type ControlledListingAlias =
  | 'approved'
  | 'approvedWithoutMedia'
  | 'unapproved'
  | 'ownedEditable'
  | 'ownedPublishedCancel'
  | 'ownedPublishedWithdraw'
  | 'otherOwner';

export type ListingStatus = 'Chờ duyệt' | 'Đã duyệt' | 'Đang đăng' | 'Đã gỡ';

export type ListingFormField =
  | 'title'
  | 'description'
  | 'price'
  | 'area'
  | 'street'
  | 'addressLine'
  | 'contactName'
  | 'contactPhone'
  | 'contactEmail';

export type ListingRangeField = 'priceFrom' | 'priceTo' | 'areaFrom' | 'areaTo';

export type ListingRangeSelection =
  | { readonly kind: 'preset'; readonly label: string }
  | { readonly kind: 'custom'; readonly from: number; readonly to: number };

export interface ListingSearchCriteria {
  readonly keyword?: string;
  readonly sortLabel?: string;
}

export interface ListingFilterCriteria {
  readonly poster?: 'all' | 'owner' | 'broker';
  readonly price?: ListingRangeSelection;
  readonly area?: ListingRangeSelection;
}

export interface ListingSummary {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly price?: number;
  readonly priceText: string;
  readonly area: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly poster: 'owner' | 'broker';
}

export interface ListingDetailSnapshot {
  readonly title: string;
  readonly description: string;
  readonly contactName: string;
  readonly amenities: readonly string[];
  readonly mediaCount: number;
  readonly usesDefaultImage: boolean;
  readonly relatedTitles: readonly string[];
  readonly viewCountText: string;
}

export interface ListingFormSnapshot {
  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly area: number;
  readonly contactName: string;
  readonly imageCount: number;
  readonly hasVideo: boolean;
}

export const LISTING_UI_LIMITS = Object.freeze({
  titleCharacters: 120,
  descriptionCharacters: 5000,
  maximumImages: 10,
  maximumImageBytes: 3 * 1024 * 1024,
  maximumVideos: 1,
  maximumVideoBytes: 10 * 1024 * 1024,
});

export const LISTING_STATUS_LABELS = Object.freeze({
  pendingApproval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đang đăng',
  withdrawn: 'Đã gỡ',
});
```

Define `ListingFilterCriteria` with only UC-17 poster, price, and area ranges; define search with
keyword and sort only. Preserve distinct internal statuses for `approved` and `published`. Freeze
every nested factory result and keep file resolution under `test-data/files`. Commit one synthetic
PNG and one one-second MP4 containing no personal or copyrighted content.

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/unit/test-data --project=framework`

Expected: PASS for independent, validated, typed data and controlled references.

- [ ] **Step 5: Commit**

```powershell
git add constants/listings.ts types/listing.types.ts test-data/static/listing.json test-data/factories/ListingDataFactory.ts test-data/factories/ListingReferenceFactory.ts utils/FileUploadHelper.ts tests/unit/test-data test-data/files/listing-images/property.png test-data/files/listing-videos/property.mp4 test-data/files/listing-files/invalid.txt
git commit -m "test: add typed listings test data"
```

### Task 3: Listing Scenario Metadata and Traceability Contract

**Files:**
- Modify: `types/test-case.types.ts`
- Create: `test-cases/listings/listing.test-cases.ts`
- Create: `tests/unit/test-cases/listing.test-cases.spec.ts`

**Interfaces:**
- Produces: `ListingRequirementId`, `TestClassification`, `ListingTestCaseDefinition`.
- Produces: `listingTestCases: readonly ListingTestCaseDefinition[]` containing every automated or
  manual scenario in the matrix above.
- Produces: `getListingTestCase(id): ListingTestCaseDefinition` and
  `listingCaseTitle(id): string`.

- [ ] **Step 1: Write the failing metadata integrity test**

```ts
test('keeps listing scenario IDs unique and traceable', () => {
  const ids = listingTestCases.map(({ id }) => id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(listingTestCases.every(({ requirementId, playwrightTest }) =>
    requirementId.length > 0 && playwrightTest.length > 0)).toBe(true);
});

test('classifies every state-changing scenario as mutating', () => {
  const mutatingRequirements = new Set(['UC-08', 'UC-11-EDIT', 'UC-11-WITHDRAW', 'UC-12']);
  expect(
    listingTestCases
      .filter(({ requirementId }) => mutatingRequirements.has(requirementId))
      .every(({ classification }) => classification === 'mutating'),
  ).toBe(true);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/unit/test-cases/listing.test-cases.spec.ts --project=framework`

Expected: FAIL because the Listings metadata contract and cases do not exist.

- [ ] **Step 3: Implement the traceability extension without breaking Authentication**

```ts
export interface ListingTestCaseDefinition extends TestCaseDefinition {
  readonly requirementId:
    | 'UC-08'
    | 'UC-09'
    | 'UC-10'
    | 'UC-11-EDIT'
    | 'UC-11-WITHDRAW'
    | 'UC-12'
    | 'UC-16'
    | 'UC-17';
  readonly scenario: string;
  readonly classification: 'read-only' | 'mutating';
  readonly testData: string;
  readonly requiredUserState: string;
  readonly requiredListingState: string;
  readonly playwrightTest: string;
}
```

Create one frozen metadata entry for every row in the scenario matrix. Manual/error rows use the
exact traceability value `docs/traceability/requirements-to-tests.md#listings-manual-evidence`.

```ts
export const getListingTestCase = (id: string): ListingTestCaseDefinition => {
  const testCase = listingTestCases.find((candidate) => candidate.id === id);
  if (testCase === undefined) throw new Error(`Unknown listing test case: ${id}`);
  return testCase;
};

export const listingCaseTitle = (id: string): string => {
  const testCase = getListingTestCase(id);
  return `${testCase.id} ${testCase.title} ${testCase.tags.join(' ')}`;
};
```

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/unit/test-cases/listing.test-cases.spec.ts --project=framework`

Expected: PASS with unique IDs and correct mutation classification.

- [ ] **Step 5: Commit**

```powershell
git add types/test-case.types.ts test-cases/listings/listing.test-cases.ts tests/unit/test-cases/listing.test-cases.spec.ts
git commit -m "test: define listings scenario traceability"
```

### Task 4: Shared Listing Form and Create/Edit Page Objects

**Files:**
- Modify: `constants/routes.ts`
- Modify: `pages/components/ListingFormComponent.ts`
- Modify: `pages/listings/CreateListingPage.ts`
- Modify: `pages/listings/EditListingPage.ts`
- Create: `tests/component/pages/ListingFormComponent.spec.ts`

**Interfaces:**
- Consumes: `ListingData`, `ListingMedia`, `FileUploadHelper`, `ROUTES.postListing`.
- Produces: `ListingFormComponent.fill(data: ListingData)`,
  `.uploadMedia(media: ListingMedia)`, `.removeMedia(fileName: string)`, `.submit()`,
  `.fieldError(field: ListingFormField)`, `.mediaError()`,
  `.fillField(field: ListingFormField, value: string)`,
  `.currentValues(): Promise<ListingFormSnapshot>`.
- Produces: `CreateListingPage.open`, `.submit`, `.successMessage`, `.status`.
- Produces: `EditListingPage.update`, `.successMessage`, `.status`.

- [ ] **Step 1: Write failing component tests for shared form behavior**

```ts
test('fills the current Propify listing form and uploads media', async ({ page }) => {
  await page.setContent(createListingFormFixture());
  const form = new ListingFormComponent(page);
  const data = ListingDataFactory.create();
  await form.fill(data);
  expect(await form.currentValues()).toMatchObject({ title: data.title, area: data.area });
});

test('returns field and media validation feedback', async ({ page }) => {
  await page.setContent(invalidListingFormFixture());
  const form = new ListingFormComponent(page);
  expect(await form.fieldError('title')).toBe('Tên bất động sản là bắt buộc');
  expect(await form.mediaError()).toContain('định dạng');
});
```

Also test current role/button controls, dependent province/ward selection, create label `Đăng tin`,
edit label `Cập nhật`, image/video inputs, remove-media action, and existing media preservation.
Use `fillField(field, value)` for invalid UI values so the valid `ListingData` factory never needs to
return an invalid domain object.

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/component/pages/ListingFormComponent.spec.ts --project=framework`

Expected: FAIL because the current form contract is not implemented.

- [ ] **Step 3: Implement the shared form and thin create/edit Pages**

```ts
public async uploadMedia(media: ListingMedia): Promise<void> {
  await FileUploadHelper.uploadMany(this.imageInput, media.imagePaths);
  if (media.videoPath !== undefined) {
    await FileUploadHelper.upload(this.videoInput, media.videoPath);
  }
}

public async submit(data: ListingData): Promise<void> {
  await this.form.fill(data);
  await this.form.uploadMedia(data.media);
  await this.form.submit();
}
```

Use current accessible names observed on `/post-listing`; keep every locator private. Do not include
approval or public-visibility behavior in either Page.

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/component/pages/ListingFormComponent.spec.ts --project=framework`

Expected: PASS for create/edit reuse, media, validation, and observations.

- [ ] **Step 5: Commit**

```powershell
git add constants/routes.ts pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts pages/listings/EditListingPage.ts tests/component/pages/ListingFormComponent.spec.ts
git commit -m "feat: model listings create and edit forms"
```

### Task 5: Listing Cards, Public Search, Sorting, Pagination, and Filters

**Files:**
- Create: `pages/components/ListingCardComponent.ts`
- Modify: `pages/listings/ListingListPage.ts`
- Create: `tests/component/pages/ListingListPage.spec.ts`

**Interfaces:**
- Consumes: `ListingSearchCriteria`, `ListingFilterCriteria`, `ListingSummary`, `TransactionType`.
- Produces: `ListingCardComponent.summary`, `.open`, `.toggleFavorite`, `.isFavorited`.
- Produces: `ListingListPage.search`, `.applyFilters`, `.resetFilters`, `.sort`, `.nextPage`,
  `.previousPage`, `.summaries`, `.resultCount`, `.emptyMessage`, `.validationMessage`,
  `.normalizedRangeValue(field: ListingRangeField): Promise<number>`.

- [ ] **Step 1: Write failing UC-16/UC-17 component tests**

```ts
test('combines poster, custom price, and custom area filters', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);
  await listPage.applyFilters({
    poster: 'owner',
    price: { kind: 'custom', from: 2, to: 5 },
    area: { kind: 'custom', from: 50, to: 80 },
  });
  expect(await listPage.resultCount()).toBe(1);
});

test('normalizes non-positive custom range values to zero', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);
  await listPage.applyFilters({ price: { kind: 'custom', from: -1, to: 5 } });
  expect(await listPage.normalizedRangeValue('priceFrom')).toBe(0);
});
```

Add focused tests for owner/broker, presets, custom ranges, reversed-range messages, reset, count,
empty state, sort, over-limit keyword feedback, and next/previous page state.

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/component/pages/ListingListPage.spec.ts --project=framework`

Expected: FAIL because cards and UC-16/UC-17 methods are absent.

- [ ] **Step 3: Implement scoped cards and exact search/filter methods**

```ts
public async summaries(): Promise<readonly ListingSummary[]> {
  const cards = await this.listingCards.all();
  return Promise.all(cards.map(async (card) => new ListingCardComponent(card).summary()));
}

public async applyFilters(criteria: ListingFilterCriteria): Promise<void> {
  if (criteria.poster !== undefined) await this.selectPoster(criteria.poster);
  if (criteria.price !== undefined) await this.setPrice(criteria.price);
  if (criteria.area !== undefined) await this.setArea(criteria.area);
  await this.applyFilterButton.click();
}
```

Keep filter units aligned with visible UI labels (`tỷ` and `m²`) and return parsed numeric summaries
so tests assert results rather than locator state.

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/component/pages/ListingListPage.spec.ts --project=framework`

Expected: PASS for all deterministic UC-16/UC-17 Page behavior.

- [ ] **Step 5: Commit**

```powershell
git add pages/components/ListingCardComponent.ts pages/listings/ListingListPage.ts tests/component/pages/ListingListPage.spec.ts
git commit -m "feat: add listing search and filters"
```

### Task 6: Public Listing Detail

**Files:**
- Modify: `pages/listings/ListingDetailPage.ts`
- Create: `tests/component/pages/ListingDetailPage.spec.ts`

**Interfaces:**
- Consumes: `ListingDetailSnapshot`, `ListingReference`, `ListingCardComponent`.
- Produces: `ListingDetailPage.snapshot`, `.isContentVisible`, `.hasDefaultImage`,
  `.relatedTitles`, `.notFoundMessage`, `.favoriteState`, `.toggleFavorite`.

- [ ] **Step 1: Write failing UC-10 component tests**

```ts
test('returns every required approved-listing section', async ({ page }) => {
  await page.setContent(approvedListingDetailFixture());
  const detail = new ListingDetailPage(page);
  expect(await detail.snapshot()).toMatchObject({
    title: 'Controlled approved listing',
    description: 'Controlled description',
    contactName: 'Controlled owner',
    amenities: ['Bể bơi'],
  });
  expect(await detail.relatedTitles()).toEqual(['Related listing']);
});

test('detects default media and hidden non-approved content', async ({ page }) => {
  await page.setContent(nonApprovedNoMediaFixture());
  const detail = new ListingDetailPage(page);
  expect(await detail.isContentVisible()).toBe(false);
  expect(await detail.hasDefaultImage()).toBe(true);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/component/pages/ListingDetailPage.spec.ts --project=framework`

Expected: FAIL because complete snapshots and alternative states are absent.

- [ ] **Step 3: Implement exact UC-10 observations**

```ts
public async snapshot(): Promise<ListingDetailSnapshot> {
  return {
    title: await this.titleHeading.innerText(),
    description: await this.description.innerText(),
    contactName: await this.contactName.innerText(),
    amenities: await this.amenityItems.allTextContents(),
    mediaCount: await this.mediaItems.count(),
    usesDefaultImage: await this.hasDefaultImage(),
    relatedTitles: await this.relatedTitles(),
    viewCountText: await this.viewCount.innerText(),
  };
}
```

Scope related articles and favorite button to their detail sections. Do not assert approval state in
the Page; return visible/hidden observations for tests.

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/component/pages/ListingDetailPage.spec.ts --project=framework`

Expected: PASS for approved, missing, non-approved, and default-media Page states.

- [ ] **Step 5: Commit**

```powershell
git add pages/listings/ListingDetailPage.ts tests/component/pages/ListingDetailPage.spec.ts
git commit -m "feat: model listing detail states"
```

### Task 7: Own Listings and Withdrawal

**Files:**
- Modify: `pages/listings/MyListingsPage.ts`
- Create: `tests/component/pages/MyListingsPage.spec.ts`

**Interfaces:**
- Consumes: `ListingSummary`, `ListingStatus`, `EditListingPage`.
- Produces: `MyListingsPage.summaries`, `.search`, `.filter`, `.nextPage`, `.previousPage`,
  `.emptyMessage`, `.openEdit`, `.requestWithdraw`, `.confirmWithdraw`, `.cancelWithdraw`,
  `.statusOf`, `.feedback`, all row actions accepting `ListingReference`.

- [ ] **Step 1: Write failing UC-09 and withdrawal component tests**

```ts
test('cancels withdrawal without changing status', async ({ page }) => {
  await page.setContent(myListingsFixture({ status: 'Đang đăng' }));
  const myListings = new MyListingsPage(page);
  const reference = { id: '91', title: 'Controlled published listing' };
  await myListings.requestWithdraw(reference);
  await myListings.cancelWithdraw();
  expect(await myListings.statusOf(reference)).toBe('Đang đăng');
});

test('exposes rejection when listing is not published', async ({ page }) => {
  await page.setContent(myListingsFixture({ status: 'Chờ duyệt' }));
  const myListings = new MyListingsPage(page);
  await myListings.requestWithdraw({ id: '92', title: 'Controlled pending listing' });
  expect(await myListings.feedback()).toBe('Không cho phép gỡ');
});
```

Add tests for owned search/filter, empty/no-result, pagination, edit navigation, confirm refresh, and
`Đã gỡ` state. The deterministic fixture script must model state change only after confirm.

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/component/pages/MyListingsPage.spec.ts --project=framework`

Expected: FAIL because the row action/dialog/status API is absent.

- [ ] **Step 3: Implement row-scoped actions and confirmation**

```ts
private rowByReference(reference: ListingReference): Locator {
  return this.rows.filter({ hasText: reference.id }).filter({ hasText: reference.title });
}

public async requestWithdraw(reference: ListingReference): Promise<void> {
  const row = this.rowByReference(reference);
  await row.getByRole('button').click();
  await this.page.getByRole('button', { name: 'Gỡ tin đăng', exact: true }).click();
}

public async confirmWithdraw(): Promise<void> {
  await this.confirmDialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
}
```

Keep all locators private and distinguish disabled/unavailable withdrawal from feedback rejection.

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/component/pages/MyListingsPage.spec.ts --project=framework`

Expected: PASS for UC-09 list behavior and UC-11-WITHDRAW confirm/cancel/reject behavior.

- [ ] **Step 5: Commit**

```powershell
git add pages/listings/MyListingsPage.ts tests/component/pages/MyListingsPage.spec.ts
git commit -m "feat: add owned listing withdrawal flows"
```

### Task 8: Favorites Page and Favorite State

**Files:**
- Create: `pages/listings/FavoritesPage.ts`
- Create: `tests/component/pages/FavoritesPage.spec.ts`

**Interfaces:**
- Consumes: `ListingCardComponent`, `ListingReference`, `ROUTES.favorites`.
- Produces: `FavoritesPage.open`, `.contains`, `.summaryByTitle`, `.toggleByTitle`, `.feedback`.

- [ ] **Step 1: Write failing favorite component tests**

```ts
test('observes add/remove icon state and favorites membership', async ({ page }) => {
  await page.setContent(favoritesFixture());
  const favorites = new FavoritesPage(page);
  expect(await favorites.contains('Controlled listing')).toBe(true);
  await favorites.toggleByTitle('Controlled listing');
  expect(await favorites.contains('Controlled listing')).toBe(false);
  expect(await favorites.feedback()).toContain('thành công');
});
```

Add deterministic unauthenticated login behavior and failed-request icon-consistency cases when the
fixture can model them without asserting a mock call.

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/component/pages/FavoritesPage.spec.ts --project=framework`

Expected: FAIL because `FavoritesPage` does not exist.

- [ ] **Step 3: Implement the thin Page around shared cards**

```ts
public async contains(title: string): Promise<boolean> {
  return this.cardRoot(title).isVisible();
}

public async toggleByTitle(title: string): Promise<void> {
  await new ListingCardComponent(this.cardRoot(title)).toggleFavorite();
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/component/pages/FavoritesPage.spec.ts --project=framework`

Expected: PASS with shared card behavior and no duplicate listing-card locators.

- [ ] **Step 5: Commit**

```powershell
git add pages/listings/FavoritesPage.ts tests/component/pages/FavoritesPage.spec.ts
git commit -m "feat: add listing favorites page"
```

### Task 9: Listing Workflow, Controlled-State Fixture, and Composition

**Files:**
- Create: `fixtures/listing-state.fixture.ts`
- Modify: `fixtures/page.fixture.ts`
- Modify: `fixtures/workflow.fixture.ts`
- Modify: `fixtures/test.fixture.ts`
- Modify: `workflows/listings/ListingWorkflow.ts`
- Modify: `tests/component/fixtures/test.fixture.spec.ts`

**Interfaces:**
- Produces: fixture `controlledListing(alias): ListingReference` that skips precisely when missing.
- Produces: `ListingWorkflow` methods shown below.
- Consumes: all six Listings Pages and their typed snapshots.

- [ ] **Step 1: Extend fixture composition tests and add failing workflow contract assertions**

```ts
test('provides complete Listings Pages, Workflow, and controlled-state resolver', ({
  favoritesPage,
  listingWorkflow,
  controlledListing,
}) => {
  expect(favoritesPage).toBeInstanceOf(FavoritesPage);
  expect(listingWorkflow).toBeInstanceOf(ListingWorkflow);
  expect(controlledListing).toBeInstanceOf(Function);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx playwright test tests/component/fixtures/test.fixture.spec.ts --project=framework`

Expected: FAIL because favorites and controlled-state fixtures are not composed.

- [ ] **Step 3: Implement typed fixture composition and workflow methods**

```ts
public async search(
  transactionType: TransactionType,
  criteria: ListingSearchCriteria,
): Promise<readonly ListingSummary[]>;
public async filter(
  transactionType: TransactionType,
  criteria: ListingFilterCriteria,
): Promise<readonly ListingSummary[]>;
public async viewDetail(reference: ListingReference): Promise<ListingDetailSnapshot>;
public async viewOwnListings(): Promise<readonly ListingSummary[]>;
public async create(data: ListingData): Promise<string>;
public async edit(reference: ListingReference, data: ListingData): Promise<string>;
public async requestWithdrawal(reference: ListingReference): Promise<void>;
public async cancelWithdrawal(): Promise<void>;
public async confirmWithdrawal(): Promise<string>;
public async toggleFavorite(reference: ListingReference): Promise<boolean>;
public async isFavoriteListed(reference: ListingReference): Promise<boolean>;
```

The controlled-state fixture extends `workflowTest` and closes over `testInfo`; when a requested
alias is absent it calls `testInfo.skip(true, 'Controlled listing <alias> is not configured')`
before returning. `fixtures/test.fixture.ts` exports this final `listingStateTest` composition.

- [ ] **Step 4: Verify GREEN**

Run: `npx playwright test tests/component/fixtures/test.fixture.spec.ts --project=framework`

Expected: PASS with real composed Page/Workflow instances and data-state skip behavior.

- [ ] **Step 5: Commit**

```powershell
git add fixtures/listing-state.fixture.ts fixtures/page.fixture.ts fixtures/workflow.fixture.ts fixtures/test.fixture.ts workflows/listings/ListingWorkflow.ts tests/component/fixtures/test.fixture.spec.ts
git commit -m "feat: compose listings workflows and fixtures"
```

### Task 10: Read-Only E2E Coverage

**Files:**
- Create: `tests/listings/view-own-listings.read-only.spec.ts`
- Create: `tests/listings/listing-detail.read-only.spec.ts`
- Create: `tests/listings/search-listing.read-only.spec.ts`
- Create: `tests/listings/filter-listing.read-only.spec.ts`

**Interfaces:**
- Consumes: ordinary `test`, `expect`, `listingWorkflow`, `controlledListing`, scenario metadata.
- Produces: executable read-only evidence for stable UC-09, UC-10, UC-16, and UC-17 rows.

- [ ] **Step 1: Write one failing read-only E2E test per UC before expanding each file**

```ts
test(listingCaseTitle('LIST-UC10-001'), async ({ listingWorkflow, controlledListing }) => {
  const approved = controlledListing('approved');
  const detail = await listingWorkflow.viewDetail(approved);
  expect(detail.title).toBe(approved.title);
  expect(detail.description).not.toBe('');
  expect(detail.contactName).not.toBe('');
  expect(detail.amenities.length).toBeGreaterThan(0);
  expect(detail.mediaCount).toBeGreaterThan(0);
  expect(detail.relatedTitles.length).toBeGreaterThan(0);
});

test(listingCaseTitle('LIST-UC16-003'), async ({ listingWorkflow }) => {
  const results = await listingWorkflow.search('sale', {
    keyword: ListingDataFactory.uniqueTitle('missing-search'),
  });
  expect(results).toEqual([]);
});
```

Use static collision-resistant data generation rather than sharing outputs. Expand to every E2E row
whose required controlled state exists; component-covered rows remain linked in metadata.

At the top of `search-listing.read-only.spec.ts` and `filter-listing.read-only.spec.ts`, use a guest
context so UC-16 cannot persist authenticated search history:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

- [ ] **Step 2: Verify RED on Chromium only**

Run: `npx playwright test tests/listings/view-own-listings.read-only.spec.ts tests/listings/listing-detail.read-only.spec.ts tests/listings/search-listing.read-only.spec.ts tests/listings/filter-listing.read-only.spec.ts --project=chromium`

Expected: at least the new representative tests fail for missing final workflow/page behavior, while
controlled-state absences skip precisely.

- [ ] **Step 3: Complete the read-only scenario files**

Each title is generated from immutable scenario metadata. Assertions operate on typed summaries,
counts, snapshots, validation text, and empty states. UC-16 tests use a guest context where the
application permits public access; UC-10 is not imported from `mutating.fixture.ts`.

- [ ] **Step 4: Verify GREEN on Chromium and list all browser projects**

Run: `npx playwright test tests/listings/view-own-listings.read-only.spec.ts tests/listings/listing-detail.read-only.spec.ts tests/listings/search-listing.read-only.spec.ts tests/listings/filter-listing.read-only.spec.ts --project=chromium`

Run: `npx playwright test tests/listings/view-own-listings.read-only.spec.ts tests/listings/listing-detail.read-only.spec.ts tests/listings/search-listing.read-only.spec.ts tests/listings/filter-listing.read-only.spec.ts --list`

Expected: runnable controlled scenarios pass, missing-state scenarios skip, and no mutation flag is
required.

- [ ] **Step 5: Commit**

```powershell
git add tests/listings/view-own-listings.read-only.spec.ts tests/listings/listing-detail.read-only.spec.ts tests/listings/search-listing.read-only.spec.ts tests/listings/filter-listing.read-only.spec.ts
git commit -m "test: add read-only listings coverage"
```

### Task 11: Mutating E2E Files and Default-Skip Proof

**Files:**
- Create: `tests/listings/create-listing.mutating.spec.ts`
- Create: `tests/listings/edit-listing.mutating.spec.ts`
- Create: `tests/listings/withdraw-listing.mutating.spec.ts`
- Create: `tests/listings/favorite-listing.mutating.spec.ts`

**Interfaces:**
- Consumes: only `mutatingTest as test`, `expect`, `listingWorkflow`, `controlledListing`, factory
  data, and scenario metadata.
- Produces: independent gated UC-08, UC-11 edit, UC-11-WITHDRAW, and UC-12 scenarios.

- [ ] **Step 1: Write mutating specs with the safety import first**

```ts
import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';

test(listingCaseTitle('LIST-UC08-001'), async ({ listingWorkflow }) => {
  const listing = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('AUTOMATION CREATE'),
  });
  expect(await listingWorkflow.create(listing)).toBe('Chờ duyệt');
});
```

Favorite add/remove occurs inside one test and restores the initial state. Withdrawal cancel and
confirm are separate tests with separate controlled `Đang đăng` references. The confirm reference
must be reseeded by the approved staging/test setup before a future opt-in run; this framework does
not fabricate an admin transition or reset it after status becomes `Đã gỡ`.

- [ ] **Step 2: Prove default skip without enabling the flag**

Run: `Remove-Item Env:ALLOW_MUTATING_E2E -ErrorAction SilentlyContinue; npx playwright test tests/listings/create-listing.mutating.spec.ts tests/listings/edit-listing.mutating.spec.ts tests/listings/withdraw-listing.mutating.spec.ts tests/listings/favorite-listing.mutating.spec.ts --project=chromium`

Expected: every mutating scenario is SKIPPED before any Page action. No test passes, fails, creates,
edits, favorites, or withdraws data.

- [ ] **Step 3: Add all gated scenario bodies without executing them**

Use metadata titles, controlled references, and unique factory data. Do not add `test.skip` safety
checks to individual files. Data-state skips use only the centralized `controlledListing` fixture.
Do not create a dependent create -> approve -> edit/withdraw chain.

For `LIST-UC12-003`, place the scenario in its own describe block with
`test.use({ storageState: { cookies: [], origins: [] } })`; it still imports `mutatingTest` because
clicking the favorite control is a state-changing intent even though authentication should block it.

- [ ] **Step 4: Typecheck and list mutating tests, still without opt-in**

Run: `npm run typecheck`

Run: `npx playwright test tests/listings/create-listing.mutating.spec.ts tests/listings/edit-listing.mutating.spec.ts tests/listings/withdraw-listing.mutating.spec.ts tests/listings/favorite-listing.mutating.spec.ts --list`

Run: `npx playwright test tests/listings/create-listing.mutating.spec.ts tests/listings/edit-listing.mutating.spec.ts tests/listings/withdraw-listing.mutating.spec.ts tests/listings/favorite-listing.mutating.spec.ts --project=chromium`

Expected: typecheck passes; tests list successfully; execution reports all skipped. Do not set
`ALLOW_MUTATING_E2E=true`.

- [ ] **Step 5: Commit**

```powershell
git add tests/listings/create-listing.mutating.spec.ts tests/listings/edit-listing.mutating.spec.ts tests/listings/withdraw-listing.mutating.spec.ts tests/listings/favorite-listing.mutating.spec.ts
git commit -m "test: add gated listings mutation coverage"
```

### Task 12: Documentation, Traceability, and Safe Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/traceability/requirements-to-tests.md`
- Modify: `tests/unit/test-cases/listing.test-cases.spec.ts`

**Interfaces:**
- Produces: complete Requirement -> Scenario -> Test Case -> Playwright Test mapping.
- Produces: documented default/read-only and opt-in/mutating commands.

- [ ] **Step 1: Write the traceability rows and verify coverage mechanically**

Add a Listings section with every scenario ID, requirement ID, classification, state, metadata
constant, Playwright path or manual anchor, and status. Add a unit assertion that every automated
metadata path exists on disk and every manual entry uses the manual-evidence anchor.

- [ ] **Step 2: Run focused framework verification**

Run: `npx playwright test tests/unit tests/component --project=framework`

Expected: all unit and component tests pass with no warnings.

- [ ] **Step 3: Run static quality checks**

Run: `npm run typecheck`

Run: `npm run lint`

Run: `npm run format:check`

Expected: all commands exit 0.

- [ ] **Step 4: Run only production-safe E2E verification**

Run: `npx playwright test tests/listings/view-own-listings.read-only.spec.ts tests/listings/listing-detail.read-only.spec.ts tests/listings/search-listing.read-only.spec.ts tests/listings/filter-listing.read-only.spec.ts --project=chromium`

Run: `Remove-Item Env:ALLOW_MUTATING_E2E -ErrorAction SilentlyContinue; npx playwright test tests/listings/create-listing.mutating.spec.ts tests/listings/edit-listing.mutating.spec.ts tests/listings/withdraw-listing.mutating.spec.ts tests/listings/favorite-listing.mutating.spec.ts --project=chromium`

Expected: configured read-only scenarios pass or data-state skip; every mutating scenario skips.
Never run with `ALLOW_MUTATING_E2E=true` against the current target.

- [ ] **Step 5: Inspect final diff and commit documentation**

Run: `git diff --check`

Run: `git status --short`

```powershell
git add README.md docs/traceability/requirements-to-tests.md tests/unit/test-cases/listing.test-cases.spec.ts
git commit -m "docs: document listings coverage and safety"
```

- [ ] **Step 6: Fresh completion verification**

Run the Task 12 Steps 2-4 commands again from the committed tree. Record exact pass/skip counts in
the delivery response and explicitly state that no mutating E2E test ran against production.

---

## Plan Self-Review Checklist

- [x] Every UC-08, UC-09, UC-10, UC-11 edit, source UC-11 withdrawal, UC-12, UC-16, and UC-17
  requirement maps to at least one scenario row.
- [x] Every scenario has preconditions, data, expected result, classification, state, and evidence.
- [x] Every mutating spec imports only the centralized safety fixture.
- [x] All type and method names used by later tasks are defined by earlier tasks.
- [x] Create/edit expect `Chờ duyệt`; withdrawal expects `Đã gỡ`; no approval transition exists.
- [x] Read-only E2E can run without `ALLOW_MUTATING_E2E`.
- [x] Production verification never sets `ALLOW_MUTATING_E2E=true`.
- [x] Error scenarios without deterministic control are marked manual rather than flaky.
- [x] Independent tests do not share created records or rely on order.
