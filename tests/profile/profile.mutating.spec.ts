import { TAGS } from '../../constants/tags';
import { expect, test } from '../../fixtures/test.fixture';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test.beforeEach(({ executionPolicy }) => {
  test.skip(
    !executionPolicy.runOtpE2e || !executionPolicy.runMutatingE2e,
    'Requires Gmail OTP and mutating E2E flags',
  );
});

test(
  'AUTH-PROFILE-MUTATING-001 updates the dedicated account name and restores its baseline',
  { tag: [TAGS.regression, TAGS.profile, TAGS.mutating] },
  async ({ authenticationWorkflow, profileWorkflow, profilePage, mutatingUser }) => {
    const testName = AuthenticationDataFactory.getValidationData().unicodeFullName;
    const nameUnderTest = testName === mutatingUser.baselineName ? `${testName} E2E` : testName;

    await authenticationWorkflow.login(mutatingUser);
    await profileWorkflow.updateFullName(mutatingUser.baselineName);

    try {
      await profileWorkflow.updateFullName(nameUnderTest);
      await profilePage.open();
      await profilePage.openAccountInformation();

      expect((await profilePage.profile().read()).fullName).toBe(nameUnderTest);
    } finally {
      await profileWorkflow.updateFullName(mutatingUser.baselineName);
    }
  },
);
