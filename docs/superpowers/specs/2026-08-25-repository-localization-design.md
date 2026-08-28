# Repository Log and Message Localization Design Specification

## 1. Decision record

This specification records the approved conservative localization design for the current repository.
The implementation translates only human-readable operational output, user-facing dashboard text,
and developer diagnostics that are not externally contracted or asserted by the current test suite.

The governing priority is:

1. preserve API and machine-readable contracts;
2. preserve Test Case and business traceability;
3. preserve application and test behavior;
4. avoid exposing sensitive data;
5. localize safe English or mixed Vietnamese/English messages;
6. normalize wording with minimal diffs.

This work does not authorize staging, committing, pushing, merging, creating a PR, changing a test
selector/assertion to accommodate a translation, or executing a production mutation.

## 2. Read-only scan baseline

The scan covered 225 TypeScript, JavaScript, and HTML source files under the requested roots plus the
dashboard `public/` tree. It found:

- 76 direct `console.*`, `logger.*`, or `process.*.write` call sites;
- 7 output calls through injected `log` or `error` functions;
- 132 `Error` constructor call sites;
- additional API response and DOM-visible strings outside those call patterns.

These structural counts are an inventory baseline, not a requirement to translate every call site.
Many are already Vietnamese, machine-readable, test-only, or explicitly deferred.

No direct output call was found to interpolate a password, OTP, token, cookie, authorization header,
client secret, API secret, or unmasked credential. The Gmail OTP timeout diagnostic uses the existing
masked-email helper and does not expose the mailbox address.

## 3. Safety classification

### 3.1 Safe to translate

Only these categories are eligible:

- server startup, shutdown, and operational error prefixes;
- reporter console headings and labels that are not part of JSON output and are not asserted;
- CLI/script headings and labels that are not machine-readable or asserted;
- dashboard text and accessibility labels that are not used as test selectors or exact assertions;
- developer diagnostics whose current wording has no API exposure or test dependency;
- mixed Vietnamese/English wording where the English fragment is explanatory text rather than an ID,
  enum, field, filename, path, or technical keyword intentionally retained by the approved glossary.

Dynamic identifiers, paths, signal names, environment keys, and numeric values remain unchanged
inside translated messages.

### 3.2 Do not translate

The implementation must preserve:

- Test Case IDs, Business IDs, Requirement IDs, canonical test titles, and catalog text;
- status values such as `AUTOMATED`, `NOT_AUTOMATED`, `PASSED`, `FAILED`, and traceability enums;
- HTTP statuses, API/error codes, JSON fields, database columns, types, functions, classes, variables,
  filenames, artifact paths, environment keys, and command names;
- application messages asserted from the Propify website;
- fake/test-double error strings and test titles under `tests/`;
- the JSON line emitted by `tests/support/import-boundary-probe.cjs`;
- raw data persisted in reports or returned by API endpoints.

### 3.3 Deferred localization

The following remain English and are recorded as intentional deferrals:

- API response messages in `server/services/ReportingService.ts`,
  `server/services/EvidenceService.ts`, `server/middlewares/errorHandler.ts`,
  `server/routes/evidence.routes.ts`, and `server/schemas/index.ts`;
- formatted business coverage/execution output and validation messages in
  `reporters/business-run-aggregation.ts` because unit tests assert the exact output;
- `Playwright business run interrupted by signal ...` in `scripts/run-business-tests.ts`;
- `Search Test Cases...` in `public/js/views/TestCasesView.js` because UI tests use it as a selector;
- raw status text rendered by dashboard badges because UI tests currently assert `PASSED` and
  `FAILED`; a separate status-label change would need its own approved behavior/test migration;
- helper, factory, fixture, Page Object, workflow, and utility diagnostics referenced by exact or
  substring test assertions;
- `Invalid production registration configuration: ...`, which is asserted exactly.

If verification reveals another exact or substring dependency, that string is reverted and added to
this deferred class rather than changing its assertion.

## 4. Translation style

Messages use concise, professional Vietnamese and the approved terms: `Test Case`, `Lần chạy kiểm
thử`, `Kết quả kiểm thử`, `Bằng chứng`, `Báo cáo`, `Cơ sở dữ liệu`, `Máy chủ`, `Môi trường`, `Cấu
hình`, `Truy vết`, `Dọn dẹp dữ liệu`, `Hết thời gian chờ`, and `Thử lại`.

Technical identifiers such as Playwright, API, HTTP, JSON, SQLite, Fixture, Workflow, Page Object,
RunId, URLs, paths, and environment keys may remain unchanged when translating them would reduce
clarity or change a contract.

No localization framework, resource bundle, new logger abstraction, or unrelated refactor is added.

## 5. Implementation boundaries

The implementation is a minimal string-only diff plus one static localization regression test. The
test establishes RED before production string changes by listing approved safe English phrases that
must no longer occur in their owning files. It also records protected/deferred phrases that must
remain unchanged. Existing tests and selectors are not edited to make translations pass.

If a candidate requires logic, schema, API, persistence, selector, traceability, or test expectation
changes, it is outside scope and remains deferred.

## 6. Verification contract

After implementation:

1. run the focused localization test;
2. run affected reporter/script/config/API/UI or framework tests without production projects;
3. run `npm run typecheck`;
4. run ESLint and Prettier checks only on files changed by this task;
5. run `npx playwright test --list --reporter=list` and compare discovery with the pre-change
   baseline;
6. compare Test Case IDs/status mappings and confirm no catalog/traceability file changed;
7. confirm the runtime database fingerprint is unchanged;
8. confirm the staging area is empty and no prohibited Git operation occurred.
