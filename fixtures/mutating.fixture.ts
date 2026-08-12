import { loadEnvironmentConfig } from '../config/environment.config';
import { expect, test as base } from './test.fixture';
import type { TestEnvironment } from '../types/environment.types';

interface MutationSafetyFixture {
  readonly mutationSafety: undefined;
}

interface MutationPolicy {
  readonly environment: TestEnvironment;
  readonly allowMutatingE2E: boolean;
  readonly runProductionMutatingE2e: boolean;
}

export const mutationSkipReason = (policy: MutationPolicy): string | undefined => {
  if (!policy.allowMutatingE2E) {
    return 'Mutating E2E is disabled. Set ALLOW_MUTATING_E2E=true only for an approved target.';
  }
  if (policy.environment === 'production' && !policy.runProductionMutatingE2e) {
    return 'Production mutation is disabled. Set RUN_PRODUCTION_MUTATING_E2E=true only with explicit production approval.';
  }
  return undefined;
};

export const listingMutationSkipReason = mutationSkipReason;

export const mutatingTest = base.extend<MutationSafetyFixture>({
  mutationSafety: [
    async ({}, use, testInfo) => {
      const configuration = loadEnvironmentConfig();
      const skipReason = mutationSkipReason(configuration);

      testInfo.skip(skipReason !== undefined, skipReason);

      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect };
