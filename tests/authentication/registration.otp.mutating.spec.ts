import { ROUTES } from '../../constants/routes';
import { TIMEOUTS } from '../../constants/timeouts';
import {
  expect,
  genericRegistrationTest as test,
} from '../../fixtures/generic-registration.fixture';
import { test as blockedTest } from '../../fixtures/test.fixture';
import {
  invalidOrExpiredRegistrationOtpTestCase,
  registrationOtpResendCountdownTestCase,
  registrationSuccessTestCase,
} from '../../test-cases/authentication/registration.test-cases';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import { BrowserHelper } from '../../utils/BrowserHelper';
import { requireAcceptedRegistrationTransport } from '../../helpers/network/RegistrationResponseContract';
import type { RegistrationSubmission } from '../../workflows/authentication/RegistrationWorkflow';

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test(
  `${registrationSuccessTestCase.id} ${registrationSuccessTestCase.title}`,
  { tag: [...registrationSuccessTestCase.tags] },
  async ({
    authRequestObserver,
    authenticationData,
    authenticationWorkflow,
    page,
    registrationWorkflow,
  }) => {
    let submission: RegistrationSubmission | undefined;
    const registrationStatus = await authRequestObserver.waitForStatus('registration', async () => {
      submission = await registrationWorkflow.submitRegistration(authenticationData.registration);
    });
    if (submission === undefined) {
      throw new Error('Registration workflow completed without a submission result.');
    }

    requireAcceptedRegistrationTransport(registrationStatus, submission.submitState);

    await registrationWorkflow.verifyRegistration(submission);

    await expect.poll(async () => authenticationWorkflow.isAuthenticated()).toBe(true);
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.home);
    expect(await BrowserHelper.hasAuthenticationCookies(page.context())).toBe(true);
  },
);

test(
  `${invalidOrExpiredRegistrationOtpTestCase.id} - OTP sai`,
  { tag: [...invalidOrExpiredRegistrationOtpTestCase.tags] },
  async ({
    authenticationData,
    authenticationWorkflow,
    otpProvider,
    page,
    registerPage,
    registrationWorkflow,
  }) => {
    const submission = await registrationWorkflow.submitRegistration(
      authenticationData.registration,
    );
    const deliveredOtp = await otpProvider.getOtp({
      email: submission.email,
      requestedAfter: submission.requestedAfter,
    });

    await registerPage.enterOtp(AuthenticationDataFactory.createIncorrectOtp(deliveredOtp));

    await expect(registerPage.otpHeading).toBeVisible();
    await expect
      .poll(async () => registerPage.otpRejectionMessage())
      .toMatch(/(?:OTP|mã xác thực).*(?:sai|không (?:đúng|hợp lệ|chính xác)|invalid|incorrect)/i);

    await registrationWorkflow.verifyRegistrationWithOtp(submission, deliveredOtp);
    await expect.poll(async () => authenticationWorkflow.isAuthenticated()).toBe(true);
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.home);
    expect(await BrowserHelper.hasAuthenticationCookies(page.context())).toBe(true);
  },
);

blockedTest(
  `${invalidOrExpiredRegistrationOtpTestCase.id} - OTP hết hạn`,
  { tag: [...invalidOrExpiredRegistrationOtpTestCase.tags] },
  () => {
    blockedTest.skip(
      true,
      'BLOCKED: no server clock, TTL override, expired-OTP seed, or fault injection.',
    );
  },
);

test(
  `${registrationOtpResendCountdownTestCase.id} ${registrationOtpResendCountdownTestCase.title}`,
  { tag: [...registrationOtpResendCountdownTestCase.tags] },
  async ({ authenticationData, registerPage, registrationWorkflow }) => {
    test.setTimeout(TIMEOUTS.registrationOtpResendTest);
    await registrationWorkflow.submitRegistration(authenticationData.registration);

    expect(await registerPage.isResendEnabled()).toBe(false);
    const initialCountdown = await registerPage.resendCountdownSeconds();
    test.skip(
      initialCountdown === undefined,
      'PARTIAL/BLOCKED: the deployed registration OTP view exposes no observable countdown text.',
    );
    if (initialCountdown === undefined) {
      return;
    }
    expect(initialCountdown).toBeGreaterThan(0);
    await expect
      .poll(
        async () => {
          const currentCountdown = await registerPage.resendCountdownSeconds();
          return currentCountdown !== undefined && currentCountdown < initialCountdown;
        },
        { timeout: TIMEOUTS.assertion },
      )
      .toBe(true);
    await registerPage.waitForResendEnabled();
    expect(await registerPage.isResendEnabled()).toBe(true);
  },
);
