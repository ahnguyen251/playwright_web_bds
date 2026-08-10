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

  return Object.freeze({
    environment: parsed.data.TEST_ENV,
    baseUrl: baseUrls[parsed.data.TEST_ENV],
    ...(parsed.data.API_BASE_URL === undefined ? {} : { apiBaseUrl: parsed.data.API_BASE_URL }),
    defaultUserEmail: parsed.data.DEFAULT_USER_EMAIL,
    defaultUserPassword: parsed.data.DEFAULT_USER_PASSWORD,
    ...(parsed.data.APPOINTMENT_LISTING_ID === undefined
      ? {}
      : { appointmentListingId: parsed.data.APPOINTMENT_LISTING_ID }),
    runMutatingTests: parsed.data.RUN_MUTATING_TESTS,
    ci: parsed.data.CI,
  });
};
