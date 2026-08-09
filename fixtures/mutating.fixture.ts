import { loadEnvironmentConfig } from '../config/environment.config';
import { expect, test as base } from './test.fixture';

interface MutationSafetyFixture {
  readonly mutationSafety: void;
}

export const mutatingTest = base.extend<MutationSafetyFixture>({
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
