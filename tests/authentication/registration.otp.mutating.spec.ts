import { TAGS } from '../../constants/tags';
import {
  expect,
  genericRegistrationTest as test,
} from '../../fixtures/generic-registration.fixture';

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test(
  'AUTH-REGISTER-OTP-001 registers a fresh Gmail alias and verifies its OTP',
  { tag: [TAGS.regression, TAGS.authentication, TAGS.otp, TAGS.mutating] },
  async ({ registrationWorkflow, authenticationWorkflow, authenticationData }) => {
    await registrationWorkflow.registerAndVerify(authenticationData.registration);

    expect(await authenticationWorkflow.isAuthenticated()).toBe(true);
  },
);
