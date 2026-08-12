import { join } from 'node:path';
import { test as base, type BrowserContext } from '@playwright/test';

import { TIMEOUTS } from '../constants/timeouts';
import { AuthenticationDataFactory } from '../test-data/factories/AuthenticationDataFactory';
import { UserDataFactory } from '../test-data/factories/UserDataFactory';
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
}

export interface OtpQueryPolicy {
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}

export interface AuthenticationFixtureData {
  readonly registration: RegistrationData;
}

export interface MutatingUserFixture extends UserCredentials {
  readonly baselineName: string;
}

export class DisabledOtpProvider implements OtpProvider {
  public waitForOtp(query: OtpQuery): Promise<string> {
    void query;
    return Promise.reject(new Error(disabledOtpMessage));
  }
}

const readExecutionFlag = (
  key: 'RUN_OTP_E2E' | 'RUN_MUTATING_E2E' | 'RUN_PRODUCTION_REGISTRATION_E2E',
): boolean => {
  const value = process.env[key] ?? 'false';
  if (value !== 'true' && value !== 'false') {
    throw new Error(`Invalid execution policy configuration: ${key}`);
  }
  return value === 'true';
};

const readExecutionEnvironment = (): TestEnvironment => {
  const value = process.env.TEST_ENV ?? 'production';
  if (value !== 'dev' && value !== 'staging' && value !== 'production') {
    throw new Error('Invalid execution policy configuration: TEST_ENV');
  }
  return value;
};

const createExecutionPolicy = (): ExecutionPolicy => {
  const environment = readExecutionEnvironment();
  const runOtpE2e = readExecutionFlag('RUN_OTP_E2E');
  const runMutatingE2e = readExecutionFlag('RUN_MUTATING_E2E');
  const runProductionRegistrationE2e = readExecutionFlag('RUN_PRODUCTION_REGISTRATION_E2E');
  if (runMutatingE2e && !runOtpE2e) {
    throw new Error(
      'Invalid execution policy configuration: RUN_MUTATING_E2E requires RUN_OTP_E2E',
    );
  }
  if (environment === 'production' && runMutatingE2e && !runProductionRegistrationE2e) {
    throw new Error(
      'Invalid execution policy configuration: RUN_PRODUCTION_REGISTRATION_E2E is required for production mutations',
    );
  }
  return Object.freeze({
    environment,
    runOtpE2e,
    runMutatingE2e,
    runProductionRegistrationE2e,
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
  return new GmailOtpProvider(new GmailApiClient(configuration.gmail), {
    sender: configuration.gmail.otpSender,
    subject: configuration.gmail.otpSubject,
    pattern: configuration.gmail.otpPattern,
  });
};

const createOtpQueryPolicy = async (executionPolicy: ExecutionPolicy): Promise<OtpQueryPolicy> => {
  if (!executionPolicy.runOtpE2e) {
    return Object.freeze({ timeoutMs: TIMEOUTS.otp, pollIntervalMs: TIMEOUTS.otpPoll });
  }

  const { loadEnvironmentConfig } = await import('../config/environment.config.js');
  const configuration = loadEnvironmentConfig();
  return Object.freeze({
    timeoutMs: configuration.otpTimeoutMs,
    pollIntervalMs: configuration.otpPollIntervalMs,
  });
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
  readonly defaultUser: UserCredentials;
  readonly contextForUser: (alias: string) => Promise<BrowserContext>;
  readonly executionPolicy: ExecutionPolicy;
  readonly otpProvider: OtpProvider;
  readonly otpQueryPolicy: OtpQueryPolicy;
  readonly authenticationData: AuthenticationFixtureData;
  readonly mutatingUser: MutatingUserFixture;
}

export const authTest = base.extend<AuthFixtures>({
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
  otpQueryPolicy: async ({ executionPolicy }, use) =>
    use(await createOtpQueryPolicy(executionPolicy)),
  authenticationData: async ({}, use) => use(createAuthenticationData()),
  mutatingUser: async ({}, use) => use(createMutatingUser()),
});
