import { genericRegistrationSkipReason } from './auth.fixture';
import { expect, test as base } from './test.fixture';

interface GenericRegistrationSafetyFixture {
  readonly genericRegistrationSafety: undefined;
}

export const genericRegistrationTest = base.extend<GenericRegistrationSafetyFixture>({
  genericRegistrationSafety: [
    async ({ executionPolicy }, use, testInfo) => {
      const skipReason = genericRegistrationSkipReason(executionPolicy);
      testInfo.skip(skipReason !== undefined, skipReason);
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect };
