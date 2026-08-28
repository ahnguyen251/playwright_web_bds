import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const readSource = (relativePath: string): string =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const approvedSafeEnglish = [
  {
    file: 'config/environment.config.ts',
    phrases: ['Invalid environment configuration:'],
  },
  {
    file: 'config/environment.schema.ts',
    phrases: [
      'must contain exactly one literal {otp} placeholder',
      'is required when LOCKED_USER_EMAIL is configured',
      'is required when LOCKED_USER_PASSWORD is configured',
      'is required when RUN_OTP_E2E is enabled',
      'RUN_MUTATING_E2E requires RUN_OTP_E2E',
      'A flow-specific production registration or existing-account mutation approval is required',
      'is required when RUN_MUTATING_E2E is enabled',
      'is required for listing mutations in production',
    ],
  },
  {
    file: 'config/registration.config.ts',
    phrases: ['must contain exactly one {unique} token'],
  },
  {
    file: 'fixtures/auth.fixture.ts',
    phrases: [
      'Invalid execution policy configuration:',
      'Invalid OTP automation configuration:',
      'Authentication data requires OTP_MAILBOX_ADDRESS',
      'Mutating user fixture requires MUTATING_USER_BASELINE_NAME',
      'Named browser context fixture failed with an unknown error',
      'Failed to close one or more named browser contexts',
    ],
  },
  {
    file: 'fixtures/listing-state.fixture.ts',
    phrases: ['Controlled listing ${alias} is not configured'],
  },
  {
    file: 'fixtures/mutating.fixture.ts',
    phrases: ['Mutating E2E is disabled.', 'Production mutation is disabled.'],
  },
  {
    file: 'fixtures/appointment.fixture.ts',
    phrases: ['APPOINTMENT_LISTING_ID is not configured for appointment E2E tests.'],
  },
  {
    file: 'test-data/factories/AuthenticationDataFactory.ts',
    phrases: [
      'Registration unique ID must contain a letter or number',
      'Unsupported nonexistent-email data source',
      'Unsupported Google OAuth execution mode',
      'Unsupported Google OAuth redirect target',
    ],
  },
  {
    file: 'test-data/factories/ListingDataFactory.ts',
    phrases: [
      'Listing title is required',
      'Listing description is required',
      'Listing transaction type is invalid',
      'Listing room counts cannot be negative',
    ],
  },
  {
    file: 'test-data/factories/RegistrationDataFactory.ts',
    phrases: ['Registration email template must contain exactly one {unique} token.'],
  },
  {
    file: 'utils/RandomDataGenerator.ts',
    phrases: [
      'Random byte count must be a positive integer',
      'Random integer boundaries must be valid integers',
    ],
  },
  {
    file: 'utils/DateHelper.ts',
    phrases: [
      'Cannot format an invalid date',
      'Cannot add days to an invalid date',
      'Days must be an integer',
    ],
  },
  {
    file: 'utils/APIHelper.ts',
    phrases: ['API request failed with status'],
  },
  {
    file: 'workflows/appointments/AppointmentWorkflow.ts',
    phrases: ['No appointment ${kind} options are available'],
  },
  {
    file: 'pages/components/ProfileFormComponent.ts',
    phrases: [
      'Profile avatar source is not a valid data URL.',
      'Profile avatar source is not an image.',
      'Cannot capture a missing Profile avatar baseline.',
      'Cannot download the current Profile avatar baseline.',
    ],
  },
  {
    file: 'pages/components/ListingFormComponent.ts',
    phrases: ['Listing status is not visible:'],
  },
  {
    file: 'pages/listings/MyListingsPage.ts',
    phrases: ['Unknown listing status:'],
  },
  {
    file: 'server/index.ts',
    phrases: [
      'Reporting API shutdown failed:',
      'Reporting API Server đang chạy tại',
      'Reporting API startup failed:',
    ],
  },
  {
    file: 'server/middlewares/errorHandler.ts',
    phrases: ['[Unhandled Error]'],
  },
  {
    file: 'reporters/test-tracking-reporter.ts',
    phrases: [
      'Test Tracking Reporter Summary',
      'console.log(`TotalExecutions:',
      'console.log(`UniqueMappedTestCaseIdsExecuted:',
      'console.log(`Passed:',
      'console.log(`Failed:',
      'console.log(`Skipped:',
      'console.log(`Unmapped:',
      'console.log(`UnknownTestCaseIds:',
      'console.log(`Output:',
    ],
  },
  {
    file: 'scripts/import-run-result.ts',
    phrases: [
      'Đang import RunId:',
      'Tổng Kết Import',
      'Tổng số thực thi (TotalExecutions):',
      'Đã map (Mapped):',
      'Chưa map (Unmapped):',
      'Không rõ (Unknown):',
      'Số Test Case Id duy nhất (UniqueMappedTestCaseIds):',
    ],
  },
  {
    file: 'scripts/query-verification.ts',
    phrases: [
      'Tổng số Test Case (Canonical)',
      'Lần chạy test (Run) mới nhất và chỉ số (metrics)',
      'Thông tin execution của TC-AUTH-LOGIN-001',
      'Các test UNMAPPED',
    ],
  },
  {
    file: 'scripts/run-business-tests.ts',
    phrases: [
      'Business Coverage Baseline',
      'Catalog IDs:',
      'Automated IDs:',
      'Not automated IDs:',
      'Not automated ID list:',
      'Unable to start Playwright business run:',
    ],
  },
  {
    file: 'public/js/api.js',
    phrases: ['Unknown API error'],
  },
  {
    file: 'public/js/components/Pagination.js',
    phrases: ['Showing page', 'Previous', 'Next'],
  },
  {
    file: 'public/js/components/ResultDetailsModal.js',
    phrases: ['Chứng Cớ (Evidence)', '| Map:'],
  },
  {
    file: 'public/js/views/TestCaseDetailsView.js',
    phrases: ['Retry Flaky', '} at ${'],
  },
  {
    file: 'tests/ui/test-case-details.spec.ts',
    phrases: ['CONSOLE TRÌNH DUYỆT:'],
  },
  {
    file: 'tests/api/evidence.spec.ts',
    phrases: ['THẤT BẠI. Body:'],
  },
] as const;

const protectedEnglish = [
  ['server/services/ReportingService.ts', 'Test case was not found.'],
  ['server/middlewares/errorHandler.ts', 'Unable to read reporting data.'],
  ['server/schemas/index.ts', 'from date must be before or equal to to date'],
  ['config/registration.config.ts', 'Invalid production registration configuration:'],
  ['reporters/business-run-aggregation.ts', '=== Business Coverage ==='],
  ['scripts/run-business-tests.ts', 'Playwright business run interrupted by signal'],
  ['scripts/import-run-result.ts', 'Validation failed'],
  ['fixtures/auth.fixture.ts', 'OTP automation is disabled.'],
  ['public/js/views/TestCasesView.js', 'Search Test Cases...'],
  ['tests/support/import-boundary-probe.cjs', 'JSON.stringify(result)'],
] as const;

test('removes only the approved safe English operational and dashboard phrases', () => {
  for (const { file, phrases } of approvedSafeEnglish) {
    const source = readSource(file);
    for (const phrase of phrases) expect(source, `${file}: ${phrase}`).not.toContain(phrase);
  }
});

test('preserves representative deferred and machine-readable contracts', () => {
  for (const [file, phrase] of protectedEnglish) {
    expect(readSource(file), `${file}: ${phrase}`).toContain(phrase);
  }
});
