import { join } from 'node:path';
import { test as base, type BrowserContext } from '@playwright/test';

import { AuthenticationDataFactory } from '../test-data/factories/AuthenticationDataFactory';
import { UserDataFactory } from '../test-data/factories/UserDataFactory';
import { AuthRequestObserver } from '../helpers/network/AuthRequestObserver';
import type { OtpProvider, OtpQuery } from '../types/otp.types';
import type { TestEnvironment } from '../types/environment.types';
import type { RegistrationData, UserCredentials } from '../types/user.types';

const disabledOtpMessage =
  'OTP automation is disabled. Enable RUN_OTP_E2E with valid Gmail configuration.';

export interface ExecutionPolicy {
  readonly environment: TestEnvironment;
  readonly runOtpE2e: boolean;
  readonly runMutatingE2e: boolean;
  readonly runProductionRegistrationE2e: boolean;
  readonly runProductionMutatingE2e: boolean;
  readonly productionMutationsApproved: boolean;
  readonly genericRegistrationAllowed: boolean;
}

export interface AuthenticationFixtureData {
  readonly registration: RegistrationData;
}

export const genericRegistrationSkipReason = (
  policy: Pick<ExecutionPolicy, 'environment' | 'genericRegistrationAllowed'>,
): string | undefined => {
  if (policy.environment === 'production') {
    return 'Generic OTP registration is disabled in production; use the dedicated production registration project.';
  }
  if (!policy.genericRegistrationAllowed) {
    return 'Requires Gmail OTP and mutating E2E gates';
  }
  return undefined;
};

export interface MutatingUserFixture extends UserCredentials {
  readonly baselineName: string;
}

export class DisabledOtpProvider implements OtpProvider {
  public getOtp(query: OtpQuery): Promise<string> {
    void query;
    return Promise.reject(new Error(disabledOtpMessage));
  }
}

const readExecutionFlag = (
  key:
    | 'RUN_OTP_E2E'
    | 'RUN_MUTATING_E2E'
    | 'RUN_PRODUCTION_REGISTRATION_E2E'
    | 'RUN_PRODUCTION_MUTATING_E2E',
  source: NodeJS.ProcessEnv,
): boolean => {
  const value = source[key] ?? 'false';
  if (value !== 'true' && value !== 'false') {
    throw new Error(`Invalid execution policy configuration: ${key}`);
  }
  return value === 'true';
};

const readExecutionEnvironment = (source: NodeJS.ProcessEnv): TestEnvironment => {
  const value = source.TEST_ENV ?? 'production';
  if (value !== 'dev' && value !== 'staging' && value !== 'production') {
    throw new Error('Invalid execution policy configuration: TEST_ENV');
  }
  return value;
};

export const createExecutionPolicy = (source: NodeJS.ProcessEnv = process.env): ExecutionPolicy => {
  const environment = readExecutionEnvironment(source);
  const runOtpE2e = readExecutionFlag('RUN_OTP_E2E', source);
  const runMutatingE2e = readExecutionFlag('RUN_MUTATING_E2E', source);
  const runProductionRegistrationE2e = readExecutionFlag('RUN_PRODUCTION_REGISTRATION_E2E', source);
  const runProductionMutatingE2e = readExecutionFlag('RUN_PRODUCTION_MUTATING_E2E', source);
  const productionMutationsApproved =
    environment !== 'production' || runProductionRegistrationE2e || runProductionMutatingE2e;
  const genericRegistrationAllowed = environment !== 'production' && runOtpE2e && runMutatingE2e;
  if (runMutatingE2e && !runOtpE2e) {
    throw new Error(
      'Invalid execution policy configuration: RUN_MUTATING_E2E requires RUN_OTP_E2E',
    );
  }
  if (runMutatingE2e && !productionMutationsApproved) {
    throw new Error(
      'Invalid execution policy configuration: RUN_PRODUCTION_REGISTRATION_E2E or RUN_PRODUCTION_MUTATING_E2E is required for production mutations',
    );
  }
  return Object.freeze({
    environment,
    runOtpE2e,
    runMutatingE2e,
    runProductionRegistrationE2e,
    runProductionMutatingE2e,
    productionMutationsApproved,
    genericRegistrationAllowed,
  });
};

const createOtpProvider = async (executionPolicy: ExecutionPolicy): Promise<OtpProvider> => {
  if (!executionPolicy.runOtpE2e) {
    return new DisabledOtpProvider();
  }

  const { loadEnvironmentConfig } = await import('../config/environment.config.js');
  const configuration = loadEnvironmentConfig();
  if (configuration.gmail === undefined) {
    throw new Error('Invalid OTP automation configuration: Gmail configuration is incomplete');
  }
  const [{ GmailApiClient }, { GmailOtpProvider }] = await Promise.all([
    import('../helpers/otp/GmailApiClient.js'),
    import('../helpers/otp/GmailOtpProvider.js'),
  ]);
  const gmail = {
    clientId: configuration.gmail.clientId,
    clientSecret: configuration.gmail.clientSecret,
    refreshToken: configuration.gmail.refreshToken,
    sender: configuration.gmail.otpSender,
    subject: configuration.gmail.otpSubject,
    otpPattern: configuration.gmail.otpPattern,
    timeoutMs: configuration.otpTimeoutMs,
    pollIntervalMs: configuration.otpPollIntervalMs,
  };
  return new GmailOtpProvider(new GmailApiClient(gmail), gmail);
};

const createAuthenticationData = (): AuthenticationFixtureData => {
  const mailboxAddress = process.env.OTP_MAILBOX_ADDRESS;
  if (mailboxAddress === undefined) {
    throw new Error('Authentication data requires OTP_MAILBOX_ADDRESS');
  }
  return Object.freeze({
    registration: AuthenticationDataFactory.createRegistration(mailboxAddress),
  });
};

const createMutatingUser = (): MutatingUserFixture => {
  const credentials = UserDataFactory.getCredentials('mutatingUser');
  const baselineName = process.env.MUTATING_USER_BASELINE_NAME?.trim();
  if (!baselineName) {
    throw new Error('Mutating user fixture requires MUTATING_USER_BASELINE_NAME');
  }
  return Object.freeze({ ...credentials, baselineName });
};

export interface AuthFixtures {
  readonly authRequestObserver: AuthRequestObserver;
  readonly defaultUser: UserCredentials;
  readonly contextForUser: (alias: string) => Promise<BrowserContext>;
  readonly executionPolicy: ExecutionPolicy;
  readonly otpProvider: OtpProvider;
  readonly authenticationData: AuthenticationFixtureData;
  readonly mutatingUser: MutatingUserFixture;
}

export const authTest = base.extend<AuthFixtures>({
  authRequestObserver: async ({ page }, use) => use(new AuthRequestObserver(page)),
  defaultUser: async ({}, use) => {
    await use(UserDataFactory.getCredentials('defaultUser'));
  },
  contextForUser: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    const contextFactory = async (alias: string): Promise<BrowserContext> => {
      UserDataFactory.getRecord(alias);
      const context = await browser.newContext({
        storageState: join('.auth', `${alias}.json`),
      });
      contexts.push(context);
      return context;
    };

    let fixtureFailed = false;
    let fixtureError: unknown;
    try {
      await use(contextFactory);
    } catch (error: unknown) {
      fixtureFailed = true;
      fixtureError = error;
    }

    const closeResults = await Promise.allSettled(contexts.map(async (context) => context.close()));
    if (fixtureFailed) {
      if (fixtureError instanceof Error) {
        throw fixtureError;
      }
      throw new Error('Named browser context fixture failed with an unknown error');
    }
    if (closeResults.some((result) => result.status === 'rejected')) {
      throw new Error('Failed to close one or more named browser contexts');
    }
  },
  executionPolicy: async ({}, use) => use(createExecutionPolicy()),
  otpProvider: async ({ executionPolicy }, use) => use(await createOtpProvider(executionPolicy)),
  authenticationData: async ({}, use) => use(createAuthenticationData()),
  mutatingUser: async ({}, use) => use(createMutatingUser()),
});
