import { expect, test } from '../../fixtures/test.fixture';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const profileEditTestCase = getProfileTestCase('TC-PROFILE-EDIT-001');

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test.beforeEach(({ executionPolicy }) => {
  test.skip(
    !executionPolicy.runOtpE2e || !executionPolicy.runMutatingE2e,
    'Requires Gmail OTP, mutating E2E, and production approval flags',
  );
  test.skip(
    !executionPolicy.productionMutationsApproved,
    'Requires explicit production authentication mutation approval',
  );
});

test(
  `${profileEditTestCase.id} ${profileEditTestCase.title}`,
  { tag: [...profileEditTestCase.tags] },
  async ({
    authRequestObserver,
    authenticationWorkflow,
    profileWorkflow,
    profilePage,
    mutatingUser,
  }) => {
    const testName = AuthenticationDataFactory.getValidationData().unicodeFullName;
    const nameUnderTest = (
      testName === mutatingUser.baselineName ? `${testName} E2E` : testName
    ).slice(0, 50);

    await authenticationWorkflow.login(mutatingUser);
    await profileWorkflow.updateFullName(mutatingUser.baselineName);
    const baselineAvatar = await profileWorkflow.captureAvatarBaseline();

    try {
      const response = await authRequestObserver.waitForStatus('profileUpdate', async () =>
        profileWorkflow.updateProfile({
          fullName: nameUnderTest,
          avatar: 'test-data/files/listing-images/property.png',
        }),
      );
      expect(response.status >= 200 && response.status < 300).toBe(true);
      await profilePage.open();
      await profilePage.openAccountInformation();

      expect((await profilePage.profile().read()).fullName).toBe(nameUnderTest);
      expect(await profilePage.profile().successMessage()).toBe('Cập nhật thông tin thành công');
      expect(await profilePage.hasSynchronizedAvatar()).toBe(true);
    } finally {
      await profileWorkflow.updateProfile({
        fullName: mutatingUser.baselineName,
        avatar: baselineAvatar,
      });
    }
  },
);
