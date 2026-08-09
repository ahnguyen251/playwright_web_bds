# Listings Module Design

## 1. Purpose

Implement production-ready Playwright coverage for the Propify Listings module while preserving the
repository's existing Page Object Model, fixture composition, typed workflows, separated test data,
and Requirement -> Test Scenario -> Test Case -> Playwright Test traceability.

The authoritative business source is `document/NghiepvuPropify.pdf`, specifically UC-08 through
UC-17. `document/BẤT ĐỘNG SẢN - PRODUCT BACKLOG.pdf` establishes the corresponding user backlog
scope. When current UI behavior and an undocumented assumption differ, the use-case specification
wins. The design must not invent approval, publication, deletion, or other business transitions that
are absent from the specification.

## 2. Scope

The module covers:

- UC-08: Create Listing;
- UC-09: View Own Listings;
- UC-10: Listing Detail;
- UC-11: Edit Listing;
- source UC-11, internally `UC-11-WITHDRAW`: Withdraw Listing;
- UC-12: Favorite Listing;
- UC-16: Search Listing;
- UC-17: Filter Listing;
- positive, negative, boundary, validation, and end-to-end scenarios for those use cases;
- centralized production safety for all mutating E2E scenarios;
- Page Objects, shared components, fixtures, typed test data, factories, utilities, workflows,
  executable tests, test-case metadata, and traceability documentation.

The following remain out of scope:

- admin approval and moderation;
- fabricating a `Chờ duyệt` -> `Đang đăng` transition;
- physical database deletion;
- direct database access or assertions;
- listing verification, reporting, package upgrades, payments, appointments, chat, map-view
  automation, and admin Listings behavior;
- execution of mutating tests against the currently configured production target.

## 3. Architecture

The implementation extends the current dependency direction:

`Playwright tests -> fixtures -> workflows -> Page Objects/components -> utilities and typed data`

Responsibilities remain separated:

- tests contain scenario orchestration and assertions only;
- Page Objects and Page components own every locator and direct UI interaction;
- workflows coordinate business flows without selectors or assertions;
- fixtures compose pages, workflows, authenticated contexts, and safety policies;
- types define shared contracts and valid business states;
- test-case definitions hold requirement and scenario metadata;
- test data and factories produce safe, independent, parallel-friendly inputs;
- utilities contain technical reusable behavior only;
- traceability maps each requirement and scenario to executable evidence.

Create and edit reuse one `ListingFormComponent`. Listing result cards reuse one
`ListingCardComponent` across the public list and favorites. Page Objects return observable values
or typed Page Objects rather than exposing locators to tests.

## 4. Business State Model

The user-facing status contract includes at least:

- `Chờ duyệt` after successful create;
- `Chờ duyệt` after successful edit;
- `Đang đăng` for a listing eligible for withdrawal and public interaction;
- `Đã gỡ` after successful withdrawal;
- `Đã duyệt` as the specification's valid state for public detail display.

The specification and current UI use both `Đã duyệt` and `Đang đăng` in related public-listing
contexts. Tests must bind scenarios to a controlled listing whose actual UI state satisfies the
specific use-case precondition. The framework must not silently equate states or create undocumented
state transitions.

Withdrawing is a soft state transition, not deletion. It changes the listing status to `Đã gỡ`,
records the action through normal application behavior, refreshes the listing view, and removes the
listing from public display. The database record remains intact.

## 5. UC-08 - Create Listing

### Preconditions

- The user is authenticated.
- The user already has a valid phone number.

### Main behavior

The form supports the current UI's listing fields and image and/or video upload. On successful
submission, the application validates the data, uploads and links media, calculates the quality
score, persists the listing, sets its status to `Chờ duyệt`, and displays success feedback.

A newly created listing must not be assumed to be publicly visible.

### Required coverage

- successful creation with valid listing and media data;
- missing valid phone number;
- missing required data;
- invalid field data and field-level feedback;
- supported image and/or video upload according to current UI limits;
- media upload failure;
- system, network, and upload-timeout behavior only where it can be reproduced reliably without
  making the E2E suite flaky.

All create scenarios that can potentially complete submission are mutating.

## 6. UC-09 - View Own Listings

### Preconditions

- The user is authenticated.

### Main behavior

The My Listings page displays only listings belonging to the current user. It supports search,
filtering, status/listing-type selection exposed by the UI, and pagination.

### Required coverage

- normal owned-listing list;
- empty list;
- search within owned listings;
- filtering;
- pagination;
- no search result and its empty state;
- load failure and retry only when reliably testable.

These are read-only scenarios when they do not invoke listing actions.

## 7. UC-10 - Listing Detail

### Preconditions

- The listing exists.
- The listing has a valid approved state (`Đã duyệt`) for public detail display.

### Main behavior

The detail page displays basic information, images/video, description, contact information,
utilities, and related listings. Opening detail increments view count as an expected business side
effect.

### Required coverage

- complete approved-listing detail;
- non-existent listing shows the specified not-found behavior;
- non-approved listing content is not displayed;
- listing without media displays the default image;
- view count side effect is not classified as a mutating content-management test.

Detail scenarios are read-only for safety classification even though the application increments its
view counter.

## 8. UC-11 - Edit Listing

### Preconditions

- The user is authenticated.
- The listing exists.
- The user owns the listing.

### Main behavior

The form loads existing data. The owner may change listing information and add or remove media. A
successful update persists the changes, updates media where applicable, recalculates the quality
score, sets the listing status to `Chờ duyệt`, and shows success feedback.

### Required coverage

- successful information edit;
- adding media;
- removing media;
- unauthorized user is rejected;
- invalid data shows field feedback and does not update the listing;
- media upload failure and retry where reliably testable;
- system, network, and timeout behavior only where reliable.

All edit scenarios that can potentially persist a change are mutating.

## 9. UC-11-WITHDRAW - Withdraw Listing

The source specification duplicates the UC-11 identifier. Traceability must preserve the source UC
while using `UC-11-WITHDRAW` internally to avoid collisions with edit scenarios.

### Preconditions

- The user is authenticated.
- The listing exists.
- The user owns the listing.
- The listing status is `Đang đăng`.

### Confirm behavior

The user selects `Gỡ tin đăng`, the application validates the current status, and a confirmation
popup appears. Confirming updates the state to `Đã gỡ`, keeps the database record, removes the
listing from public display, shows success feedback, and refreshes the listing view/list.

### Cancel behavior

Canceling closes the confirmation flow and preserves the existing status and public visibility.

### Required coverage

- successful confirmation from `Đang đăng` to `Đã gỡ`;
- confirmation popup content and actions;
- cancellation preserves the listing;
- non-owner is rejected;
- missing listing is rejected;
- a listing whose status is not `Đang đăng` cannot be withdrawn;
- network, timeout, and system failure only where reliable.

Withdrawal is mutating. No physical delete operation, cleanup API, or database assertion is part of
this E2E flow.

## 10. UC-12 - Favorite Listing

### Preconditions

- The listing exists.
- Add/remove success scenarios use an authenticated user.

### Main behavior

Clicking the favorite control adds a non-favorited listing, updates the icon state, persists it in
the user's favorites, and shows success feedback. Clicking again removes it and restores the icon
state.

### Required coverage

- add favorite;
- remove favorite by clicking again;
- favorite icon selected and unselected states;
- success feedback;
- unauthenticated user receives redirect/login behavior;
- listing not found;
- retry/error behavior only where reliably testable.

Add and remove are mutating and must leave the controlled listing in its initial favorite state
whenever cleanup can be completed safely.

## 11. UC-16 - Search Listing

### Actors

- Guest for the default read-only suite whenever the UI permits it;
- authenticated user only for separately classified search-history coverage.

### Main behavior

Search validates the keyword, queries eligible public listings, applies the chosen sorting, displays
the result list, and supports next/previous pagination. Authenticated search history is persisted by
the application.

### Required coverage

- valid keyword;
- keyword-only search;
- no results;
- keyword exceeding the configured maximum length;
- sorting;
- next and previous pagination;
- exclusion of listings that are not eligible for public display;
- data-loading and network failure only where reliably testable.

Guest search is read-only. Authenticated search-history persistence, if implemented, is isolated
from the default read-only suite so it does not pollute the configured production account.

## 12. UC-17 - Filter Listing

### Actors

- Guest;
- authenticated user.

### Main behavior

The public listing page filters by poster, predefined or custom price range, and predefined or
custom area range. Supported filters may be combined. The UI displays the matching listings and
result count.

### Required coverage

- poster `Chủ nhà`;
- poster `Môi giới`;
- predefined price range;
- custom price From/To;
- predefined area range;
- custom area From/To;
- combination of supported filters;
- every displayed result satisfies the active filters;
- result count matches the displayed result set;
- reset restores defaults and the original list;
- price From greater than To shows validation feedback;
- area From greater than To shows validation feedback;
- a value less than or equal to zero is normalized to zero;
- no matching results;
- data-loading failure only where reliably testable.

Public filter scenarios are read-only.

## 13. Test Data and Controlled State

`ListingData` must represent the fields needed by the current create/edit UI without making
undocumented fields mandatory. It includes typed groups for core details, address, dimensions,
rooms, contact information, media, and optional UI-supported attributes. Separate search/filter
contracts represent only supported UC-16 and UC-17 inputs.

`ListingDataFactory` produces immutable independent values and supports scenario-specific overrides.
Generated mutation data uses a recognizable automation prefix plus a collision-resistant suffix so
parallel tests can identify their own records.

Committed test data contains no secrets or personal identity documents. Media fixtures are synthetic
and comply with the current UI's supported formats and size boundaries.

Controlled state is explicit:

- create tests start from an authenticated user with a valid phone number and produce `Chờ duyệt`;
- edit tests use an existing owned listing suitable for edit and expect `Chờ duyệt` afterward;
- withdraw tests use an existing owned `Đang đăng` listing;
- public detail/search/filter tests use controlled approved/published listings;
- favorite tests use a controlled public listing and restore its initial favorite state where safe;
- no independent test consumes a listing created by another test;
- no test fabricates admin approval.

Environment-supplied controlled listing identifiers and titles are preferred for staging/test
portability. Missing required controlled data causes the affected scenario to skip with a precise
reason rather than mutate arbitrary user data.

## 14. Production Safety Gate

Safety logic is centralized in one shared fixture and one environment contract. Individual spec
files do not read `process.env`, inspect environment names, or duplicate skip conditions.

The environment configuration parses `ALLOW_MUTATING_E2E` as a strict boolean with a default of
`false`. A dedicated `mutatingTest` fixture automatically skips every test that imports it unless
the parsed value is `true`. Read-only tests continue to import the ordinary shared `test` fixture.

Mutating classification includes:

- create;
- edit;
- withdraw;
- add/remove favorite;
- authenticated search-history persistence if explicitly automated;
- any form-validation scenario that could accidentally complete a successful submission.

The same opt-in contract remains usable for future staging/test URLs. The current production target
must not be run with `ALLOW_MUTATING_E2E=true` during implementation or verification. Verification
proves the gate through unit/component tests and confirms mutating E2E tests are reported as skipped.

## 15. Page Objects and Components

The existing Listings objects are extended instead of duplicated:

- `ListingFormComponent`: shared create/edit controls, media inputs, field-level errors, form
  population, and submit operations;
- `ListingCardComponent`: reusable public/favorite card observations and favorite interaction;
- `ListingListPage`: public sale/rent navigation, search, sort, pagination, filter interaction,
  result count, result summaries, reset, validation, and empty/error states;
- `ListingDetailPage`: public detail sections, media/default image, favorite state, related listings,
  not-found/non-approved behavior, and visible feedback;
- `CreateListingPage`: create navigation, create-specific readiness and success state;
- `EditListingPage`: edit readiness, prefilled data, media mutation, and update success state;
- `MyListingsPage`: owned list, search, filter, pagination, row state, action menu, edit entry,
  withdrawal confirmation/cancel/confirm, status, and feedback;
- a favorites Page Object is added only if the current UI cannot be cleanly represented by the
  existing list/card abstractions.

Every selector remains private to a Page Object/component. Tests receive only intent methods and
typed observable results.

## 16. Workflow and Fixture Design

`ListingWorkflow` coordinates reusable flows:

- guest search and filter;
- open and inspect detail;
- open and query owned listings;
- create and verify the resulting status;
- edit and verify the resulting status;
- request, cancel, and confirm withdrawal;
- favorite and restore favorite state.

The workflow never contains selectors, assertions, environment parsing, or database access.

Page fixtures expose the concrete Listings Page Objects/components required by tests. Workflow
fixtures construct `ListingWorkflow`. The centralized mutation fixture wraps the normal fixture
composition without changing the Page Object or Workflow contracts.

## 17. Test Layers

### Unit tests

- strict environment parsing and mutation opt-in behavior;
- listing data validation, immutability, uniqueness, and boundary generation;
- pure technical helpers and controlled test-state parsing.

### Component tests

- Page Object and shared component behavior against deterministic HTML;
- form filling, media controls, validation observations, list/card scoping, filters, pagination,
  favorite states, and withdrawal confirmation;
- fixture composition and centralized auto-skip behavior.

### Read-only E2E tests

- UC-09 owned-list observations where stable controlled data exists;
- UC-10 public detail and negative display behavior;
- UC-16 guest search;
- UC-17 public filters.

### Mutating E2E tests

- UC-08 create;
- UC-11 edit;
- UC-11-WITHDRAW confirm/cancel/reject;
- UC-12 add/remove favorite;
- validation paths that might submit successfully;
- authenticated search-history persistence only if explicitly implemented.

All E2E tests are independent. A conceptual lifecycle may be demonstrated across separate scenarios,
but no Playwright test depends on another test's output or execution order.

## 18. Error Handling and Reliability

Tests assert exact observable UI behavior defined by the specification. Page Objects wait for
meaningful UI states rather than arbitrary delays. Workflows preserve original exceptions while
adding feature context and never convert failures into booleans.

Network, server, media-upload, and timeout cases are included only when the condition can be induced
deterministically through Playwright routing or a stable application mechanism. Such component or
browser-level simulations must assert user-visible behavior, not mocks themselves. Scenarios that
cannot be reproduced reliably are retained in traceability as manual/not-automated rather than
implemented as flaky tests.

No output may expose credentials, storage state, authorization headers, personal documents, phone
numbers sourced from secrets, or uploaded media containing sensitive information.

## 19. Traceability and Scenario Metadata

Each scenario definition records:

- source requirement/UC ID;
- unique test scenario ID;
- title and scenario;
- preconditions;
- controlled listing/user state;
- test data reference;
- expected result;
- read-only or mutating classification;
- priority and tags;
- linked Playwright test path.

All user-facing Listings test-case content is written in Vietnamese, including title, scenario,
preconditions, test-data description, required user/listing state, expected result, and generated
Playwright test title. Stable code identifiers, TypeScript API names, tags, file paths, and scenario
IDs remain in English/ASCII where appropriate. Listings metadata records `language: 'vi'` so this
contract can be validated automatically without changing the existing Authentication test cases.

IDs use stable prefixes such as `LIST-UC08-*`, `LIST-UC09-*`, `LIST-UC10-*`,
`LIST-UC11-EDIT-*`, `LIST-UC11-WITHDRAW-*`, `LIST-UC12-*`, `LIST-UC16-*`, and
`LIST-UC17-*`. The traceability matrix preserves the duplicated source UC-11 while making edit and
withdraw evidence unambiguous.

## 20. Acceptance Criteria

The design is complete when implementation can demonstrate that:

1. all required UC-08 through UC-17 scenarios have explicit automated or documented manual status;
2. Page Object Model and existing dependency rules are preserved;
3. no locator or reusable business logic appears in tests;
4. create/edit reuse the shared form and list/favorite results reuse shared card behavior;
5. mutation safety is centralized and defaults to disabled;
6. read-only tests remain runnable by default;
7. mutating E2E tests are skipped without `ALLOW_MUTATING_E2E=true`;
8. no mutating E2E test is executed against the current production target;
9. create and edit expect `Chờ duyệt`, never fabricated publication;
10. withdrawal produces `Đã gỡ` without physical deletion;
11. independent tests do not depend on previous test output;
12. type checking, lint, formatting, unit tests, component tests, and safe E2E verification pass;
13. Requirement -> Test Scenario -> Test Case -> Playwright Test traceability is complete.
14. all user-facing Listings test-case content and generated Playwright titles are in Vietnamese.
