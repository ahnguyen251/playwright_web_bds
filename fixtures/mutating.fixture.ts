import { loadProcessEnvironmentConfig } from '../config/process-environment.config';
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
    return 'E2E có thay đổi dữ liệu đang tắt. Chỉ đặt ALLOW_MUTATING_E2E=true cho mục tiêu đã được phê duyệt.';
  }
  if (policy.environment === 'production' && !policy.runProductionMutatingE2e) {
    return 'Thao tác thay đổi dữ liệu trên production đang tắt. Chỉ đặt RUN_PRODUCTION_MUTATING_E2E=true khi có phê duyệt production rõ ràng.';
  }
  return undefined;
};

export const listingMutationSkipReason = mutationSkipReason;

export const mutatingTest = base.extend<MutationSafetyFixture>({
  mutationSafety: [
    async ({}, use, testInfo) => {
      const configuration = loadProcessEnvironmentConfig();
      const skipReason = mutationSkipReason(configuration);

      testInfo.skip(skipReason !== undefined, skipReason);

      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect };
