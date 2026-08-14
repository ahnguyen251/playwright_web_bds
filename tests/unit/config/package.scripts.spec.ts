import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

interface PackageManifest {
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly scripts?: Readonly<Record<string, string>>;
}

const packageManifest = (): PackageManifest =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as PackageManifest;

const authoritativeAuthenticationStatuses = Object.freeze({
  'TC-AUTH-REGISTER-001': 'Partial',
  'TC-AUTH-REGISTER-002': 'BLOCKED',
  'TC-AUTH-REGISTER-003': 'BLOCKED',
  'TC-AUTH-REGISTER-004': 'BLOCKED',
  'TC-AUTH-REGISTER-005': 'BLOCKED',
  'TC-AUTH-REGISTER-006': 'BLOCKED',
  'TC-AUTH-REGISTER-007': 'Partial',
  'TC-AUTH-REGISTER-008': 'Partial',
  'TC-AUTH-LOGIN-001': 'Automated',
  'TC-AUTH-LOGIN-002': 'BLOCKED',
  'TC-AUTH-LOGIN-003': 'BLOCKED',
  'TC-AUTH-LOGIN-004': 'Partial',
  'TC-AUTH-LOGIN-005': 'EXCLUDED',
  'TC-AUTH-FORGOT-001': 'Automated',
  'TC-AUTH-FORGOT-002': 'BLOCKED',
  'TC-AUTH-FORGOT-003': 'Partial',
} as const);

const authenticationSupportPaths = Object.freeze({
  'TC-AUTH-REGISTER-002': [
    'pages/authentication/RegisterPage.ts',
    'helpers/network/AuthRequestObserver.ts',
    'fixtures/auth.fixture.ts',
  ],
  'TC-AUTH-REGISTER-003': [
    'pages/authentication/RegisterPage.ts',
    'test-cases/authentication/registration.test-cases.ts',
  ],
  'TC-AUTH-REGISTER-004': [
    'pages/authentication/RegisterPage.ts',
    'fixtures/auth.fixture.ts',
    'test-data/factories/UserDataFactory.ts',
  ],
  'TC-AUTH-REGISTER-005': [
    'pages/authentication/RegisterPage.ts',
    'test-cases/authentication/registration.test-cases.ts',
  ],
  'TC-AUTH-REGISTER-006': [
    'pages/authentication/RegisterPage.ts',
    'test-cases/authentication/registration.test-cases.ts',
  ],
  'TC-AUTH-REGISTER-007': [
    'pages/authentication/RegisterPage.ts',
    'workflows/authentication/RegistrationWorkflow.ts',
    'fixtures/auth.fixture.ts',
    'helpers/otp/GmailOtpProvider.ts',
    'tests/authentication/registration.otp.mutating.spec.ts',
  ],
  'TC-AUTH-REGISTER-008': [
    'pages/authentication/RegisterPage.ts',
    'workflows/authentication/RegistrationWorkflow.ts',
    'fixtures/auth.fixture.ts',
    'helpers/otp/GmailOtpProvider.ts',
  ],
  'TC-AUTH-LOGIN-001': [
    'pages/authentication/LoginPage.ts',
    'pages/components/HeaderComponent.ts',
    'helpers/network/AuthRequestObserver.ts',
    'fixtures/auth.fixture.ts',
    'utils/BrowserHelper.ts',
  ],
  'TC-AUTH-LOGIN-002': [
    'pages/authentication/LoginPage.ts',
    'workflows/authentication/LoginWorkflow.ts',
    'helpers/network/AuthRequestObserver.ts',
    'fixtures/auth.fixture.ts',
  ],
  'TC-AUTH-LOGIN-003': [
    'pages/authentication/LoginPage.ts',
    'workflows/authentication/LoginWorkflow.ts',
    'fixtures/auth.fixture.ts',
  ],
  'TC-AUTH-LOGIN-004': [
    'pages/authentication/LoginPage.ts',
    'helpers/network/AuthRequestObserver.ts',
    'fixtures/auth.fixture.ts',
  ],
  'TC-AUTH-LOGIN-005': ['test-cases/authentication/login.test-cases.ts'],
  'TC-AUTH-FORGOT-001': [
    'pages/authentication/ForgotPasswordPage.ts',
    'pages/authentication/LoginPage.ts',
    'workflows/authentication/PasswordRecoveryWorkflow.ts',
    'fixtures/auth.fixture.ts',
    'helpers/otp/GmailOtpProvider.ts',
  ],
  'TC-AUTH-FORGOT-002': [
    'pages/authentication/ForgotPasswordPage.ts',
    'pages/authentication/LoginPage.ts',
    'helpers/network/AuthRequestObserver.ts',
    'test-data/factories/AuthenticationDataFactory.ts',
  ],
  'TC-AUTH-FORGOT-003': [
    'pages/authentication/ForgotPasswordPage.ts',
    'workflows/authentication/PasswordRecoveryWorkflow.ts',
    'fixtures/auth.fixture.ts',
    'helpers/otp/GmailOtpProvider.ts',
    'tests/authentication/password-recovery.otp.mutating.spec.ts',
  ],
} as const);

const registrationSuccessBranchSupport = Object.freeze({
  Generic: [
    'pages/authentication/RegisterPage.ts',
    'workflows/authentication/RegistrationWorkflow.ts',
    'fixtures/generic-registration.fixture.ts',
    'fixtures/test.fixture.ts',
    'fixtures/auth.fixture.ts',
    'helpers/network/AuthRequestObserver.ts',
    'helpers/network/RegistrationResponseContract.ts',
    'helpers/otp/GmailOtpProvider.ts',
    'test-data/factories/AuthenticationDataFactory.ts',
    'utils/BrowserHelper.ts',
  ],
  Production: [
    'pages/authentication/RegisterPage.ts',
    'workflows/authentication/RegistrationWorkflow.ts',
    'fixtures/test.fixture.ts',
    'fixtures/auth.fixture.ts',
    'helpers/network/AuthRequestObserver.ts',
    'helpers/network/RegistrationResponseContract.ts',
    'helpers/otp/GmailOtpProvider.ts',
    'config/registration.config.ts',
    'test-data/factories/RegistrationDataFactory.ts',
    'utils/BrowserHelper.ts',
  ],
} as const);

const parseMarkdownRows = (markdown: string): readonly (readonly string[])[] =>
  markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').map((cell) => cell.trim()));

test('scopes safe authentication execution to non-external AUTH tests', () => {
  expect(packageManifest().scripts?.['test:auth']).toBe(
    'playwright test tests/authentication --grep-invert "@external|@mutating" --workers=2',
  );
});

test('runs approved external or mutating authentication serially', () => {
  expect(packageManifest().scripts?.['test:auth:external']).toBe(
    'playwright test tests/authentication --grep "@external|@mutating" --workers=1',
  );
});

test('documents one authoritative status row for every unified authentication case', () => {
  const traceability = readFileSync(
    resolve(process.cwd(), 'docs/traceability/requirements-to-tests.md'),
    'utf8',
  );

  for (const [id, status] of Object.entries(authoritativeAuthenticationStatuses)) {
    const matchingRows = parseMarkdownRows(traceability).filter(
      (cells) => cells[1] === `\`${id}\``,
    );

    expect(matchingRows, id).toHaveLength(1);
    expect(matchingRows[0]?.[2], id).toBe(status);
  }
});

test('maps every unified authentication row to existing repository support paths', () => {
  const traceability = readFileSync(
    resolve(process.cwd(), 'docs/traceability/requirements-to-tests.md'),
    'utf8',
  );
  const rows = parseMarkdownRows(traceability);

  for (const [id, supportPaths] of Object.entries(authenticationSupportPaths)) {
    const row = rows.find((cells) => cells[1] === `\`${id}\``);
    expect(row, id).toBeDefined();

    for (const supportPath of supportPaths) {
      expect(row?.[4], `${id}: ${supportPath}`).toContain(`\`${supportPath}\``);
      expect(existsSync(resolve(process.cwd(), supportPath)), supportPath).toBe(true);
    }
  }

  const registrationSuccess = rows.find((cells) => cells[1] === '`TC-AUTH-REGISTER-001`');
  expect(registrationSuccess, 'TC-AUTH-REGISTER-001').toBeDefined();
  expect(registrationSuccess?.[3]).toContain('Generic:');
  expect(registrationSuccess?.[3]).toContain('Production:');
  const registrationSuccessSupport = registrationSuccess?.[4] ?? '';
  const genericStart = registrationSuccessSupport.indexOf('Generic:');
  const productionStart = registrationSuccessSupport.indexOf('Production:');
  expect(genericStart).toBeGreaterThanOrEqual(0);
  expect(productionStart).toBeGreaterThan(genericStart);
  const branchSupport = {
    Generic: registrationSuccessSupport.slice(genericStart, productionStart),
    Production: registrationSuccessSupport.slice(productionStart),
  } as const;

  for (const branch of ['Generic', 'Production'] as const) {
    const supportPaths = registrationSuccessBranchSupport[branch];
    for (const supportPath of supportPaths) {
      expect(branchSupport[branch], `${branch}: ${supportPath}`).toContain(`\`${supportPath}\``);
      expect(existsSync(resolve(process.cwd(), supportPath)), supportPath).toBe(true);
    }
  }

  expect(branchSupport.Generic).not.toContain('`config/registration.config.ts`');
  expect(branchSupport.Generic).not.toContain('`test-data/factories/RegistrationDataFactory.ts`');
  expect(branchSupport.Production).not.toContain('`fixtures/generic-registration.fixture.ts`');
  expect(branchSupport.Production).not.toContain(
    '`test-data/factories/AuthenticationDataFactory.ts`',
  );

  for (const id of ['TC-AUTH-REGISTER-007', 'TC-AUTH-FORGOT-003']) {
    const row = rows.find((cells) => cells[1] === `\`${id}\``);
    expect(row?.[4], id).toContain('OTP sai:');
    expect(row?.[4], id).toContain('OTP hết hạn:');
  }
});

test('documents exact environment and project contracts for conditional authentication flows', () => {
  const traceability = readFileSync(
    resolve(process.cwd(), 'docs/traceability/requirements-to-tests.md'),
    'utf8',
  );
  const rows = parseMarkdownRows(traceability);
  const commonEnvironment = [
    'TEST_ENV',
    'DEV_BASE_URL',
    'STAGING_BASE_URL',
    'PRODUCTION_BASE_URL',
    'DEFAULT_USER_EMAIL',
    'DEFAULT_USER_PASSWORD',
  ] as const;
  const gmailEnvironment = [
    'RUN_OTP_E2E',
    'RUN_MUTATING_E2E',
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'OTP_MAILBOX_ADDRESS',
    'GMAIL_OTP_SENDER',
    'GMAIL_OTP_SUBJECT',
    'GMAIL_OTP_PATTERN',
  ] as const;
  const mutatingUserEnvironment = [
    'MUTATING_USER_EMAIL',
    'MUTATING_USER_BASELINE_PASSWORD',
    'MUTATING_USER_BASELINE_NAME',
  ] as const;
  const contracts = {
    'generic-registration': {
      environment: [...commonEnvironment, ...gmailEnvironment, ...mutatingUserEnvironment],
      conditions: ['dev', 'staging', 'ignored in production'],
      project: 'mutating-chromium',
      command:
        'npx playwright test tests/authentication/registration.otp.mutating.spec.ts --project=mutating-chromium --workers=1',
    },
    'production-registration': {
      environment: [
        ...commonEnvironment,
        ...gmailEnvironment,
        ...mutatingUserEnvironment,
        'RUN_PRODUCTION_REGISTRATION_E2E',
        'REGISTRATION_EMAIL_TEMPLATE',
        'REGISTRATION_FULL_NAME',
        'REGISTRATION_PASSWORD',
      ],
      conditions: ['production'],
      project: 'production-registration-chromium',
      command:
        'npx playwright test tests/authentication/registration.production.spec.ts --project=production-registration-chromium --workers=1',
    },
    'password-recovery': {
      environment: [
        ...commonEnvironment,
        ...gmailEnvironment,
        ...mutatingUserEnvironment,
        'RUN_PRODUCTION_MUTATING_E2E',
      ],
      conditions: ['dev', 'staging', 'production'],
      project: 'mutating-chromium',
      command:
        'npx playwright test tests/authentication/password-recovery.otp.mutating.spec.ts --project=mutating-chromium --workers=1',
    },
    'locked-login': {
      environment: [...commonEnvironment, 'LOCKED_USER_EMAIL', 'LOCKED_USER_PASSWORD'],
      conditions: ['dev', 'staging', 'production'],
      project: 'chromium',
      command:
        'npx playwright test tests/authentication/login.negative.spec.ts --grep "TC-AUTH-LOGIN-003" --project=chromium --workers=1',
    },
  } as const;

  for (const [flow, contract] of Object.entries(contracts)) {
    const row = rows.find((cells) => cells[1] === `\`${flow}\``);
    expect(row, flow).toBeDefined();
    for (const variable of contract.environment) {
      expect(row?.[3], `${flow}: ${variable}`).toContain(`\`${variable}\``);
    }
    for (const condition of contract.conditions) {
      expect(row?.[2], `${flow}: ${condition}`).toContain(condition);
    }
    expect(row?.[4], flow).toContain(`\`${contract.project}\``);
    expect(row?.[5], flow).toContain(`\`${contract.command}\``);
  }
});

test('pins the Google APIs client to the reviewed release', () => {
  expect(packageManifest().devDependencies?.googleapis).toBe('174.0.0');
});
