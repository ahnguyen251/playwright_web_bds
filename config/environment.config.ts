import 'dotenv/config';

import { environmentSchema } from './environment.schema';
import type { EnvironmentConfig } from '../types/environment.types';

const formatInvalidKeys = (issues: readonly { readonly path: PropertyKey[] }[]): string => {
  const keys = new Set(
    issues.map((issue) => String(issue.path[0] ?? 'environment')).filter(Boolean),
  );
  return [...keys].sort().join(', ');
};

export const loadEnvironmentConfig = (
  source: NodeJS.ProcessEnv = process.env,
): EnvironmentConfig => {
  const parsed = environmentSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${formatInvalidKeys(parsed.error.issues)}`);
  }

  const baseUrls = {
    dev: parsed.data.DEV_BASE_URL,
    staging: parsed.data.STAGING_BASE_URL,
    production: parsed.data.PRODUCTION_BASE_URL,
  } as const;

  const gmail =
    parsed.data.GMAIL_CLIENT_ID &&
    parsed.data.GMAIL_CLIENT_SECRET &&
    parsed.data.GMAIL_REFRESH_TOKEN &&
    parsed.data.OTP_MAILBOX_ADDRESS &&
    parsed.data.GMAIL_OTP_SENDER &&
    parsed.data.GMAIL_OTP_SUBJECT &&
    parsed.data.GMAIL_OTP_PATTERN
      ? Object.freeze({
          clientId: parsed.data.GMAIL_CLIENT_ID,
          clientSecret: parsed.data.GMAIL_CLIENT_SECRET,
          refreshToken: parsed.data.GMAIL_REFRESH_TOKEN,
          mailboxAddress: parsed.data.OTP_MAILBOX_ADDRESS,
          otpSender: parsed.data.GMAIL_OTP_SENDER,
          otpSubject: parsed.data.GMAIL_OTP_SUBJECT,
          otpPattern: parsed.data.GMAIL_OTP_PATTERN,
        })
      : undefined;

  const mutatingUser =
    parsed.data.MUTATING_USER_EMAIL &&
    parsed.data.MUTATING_USER_BASELINE_PASSWORD &&
    parsed.data.MUTATING_USER_BASELINE_NAME
      ? Object.freeze({
          email: parsed.data.MUTATING_USER_EMAIL,
          baselinePassword: parsed.data.MUTATING_USER_BASELINE_PASSWORD,
          baselineName: parsed.data.MUTATING_USER_BASELINE_NAME,
        })
      : undefined;

  return Object.freeze({
    environment: parsed.data.TEST_ENV,
    baseUrl: baseUrls[parsed.data.TEST_ENV],
    ...(parsed.data.API_BASE_URL === undefined ? {} : { apiBaseUrl: parsed.data.API_BASE_URL }),
    defaultUserEmail: parsed.data.DEFAULT_USER_EMAIL,
    defaultUserPassword: parsed.data.DEFAULT_USER_PASSWORD,
    ci: parsed.data.CI,
    runOtpE2e: parsed.data.RUN_OTP_E2E,
    runMutatingE2e: parsed.data.RUN_MUTATING_E2E,
    runProductionRegistrationE2e: parsed.data.RUN_PRODUCTION_REGISTRATION_E2E,
    runProductionMutatingE2e: parsed.data.RUN_PRODUCTION_MUTATING_E2E,
    ...(gmail === undefined ? {} : { gmail }),
    ...(mutatingUser === undefined ? {} : { mutatingUser }),
    otpPollIntervalMs: parsed.data.OTP_POLL_INTERVAL_MS,
    otpTimeoutMs: parsed.data.OTP_TIMEOUT_MS,
    allowMutatingE2E: parsed.data.ALLOW_MUTATING_E2E,
  });
};
