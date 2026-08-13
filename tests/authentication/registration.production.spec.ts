import { ROUTES } from '../../constants/routes';
import {
  isProductionRegistrationEnabled,
  loadProductionRegistrationConfig,
} from '../../config/registration.config';
import { createExecutionPolicy } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/test.fixture';
import { registrationSuccessTestCase } from '../../test-cases/authentication/registration.test-cases';
import { RegistrationDataFactory } from '../../test-data/factories/RegistrationDataFactory';
import { BrowserHelper } from '../../utils/BrowserHelper';
import type { RegistrationSubmission } from '../../workflows/authentication/RegistrationWorkflow';

const executionPolicy = createExecutionPolicy();
const enabled =
  isProductionRegistrationEnabled() &&
  executionPolicy.runOtpE2e &&
  executionPolicy.runMutatingE2e &&
  executionPolicy.productionMutationsApproved;
const registrationConfig = enabled ? loadProductionRegistrationConfig() : undefined;

const hasJsonObjectBody = (body: unknown): boolean =>
  typeof body === 'object' && body !== null && !Array.isArray(body);

test.describe('production registration', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });
  test.skip(!enabled, 'Set RUN_PRODUCTION_REGISTRATION_E2E=true to run real registration.');

  test(
    `${registrationSuccessTestCase.id} ${registrationSuccessTestCase.title} - production`,
    {
      tag: [...registrationSuccessTestCase.tags],
      annotation: {
        type: 'blocked',
        description:
          'OTP entry requires six verified unique accessible textbox names: Mã OTP 1 through Mã OTP 6.',
      },
    },
    async ({ authRequestObserver, authenticationWorkflow, page, registrationWorkflow }) => {
      if (registrationConfig === undefined) {
        throw new Error('Production registration configuration was not loaded.');
      }

      const data = RegistrationDataFactory.create(registrationConfig);
      let submission: RegistrationSubmission | undefined;
      const registrationResponse = await authRequestObserver.waitForResponse(
        'registration',
        async () => {
          submission = await registrationWorkflow.submitRegistration(data);
        },
      );
      if (submission === undefined) {
        throw new Error('Registration workflow completed without a submission result.');
      }

      expect(submission.submitState).toEqual({
        disabledObserved: true,
        loadingTextObserved: true,
      });
      expect(registrationResponse.status).toBeGreaterThanOrEqual(200);
      expect(registrationResponse.status).toBeLessThan(300);
      expect(hasJsonObjectBody(registrationResponse.body)).toBe(true);

      await registrationWorkflow.verifyRegistration(submission);

      await expect.poll(async () => authenticationWorkflow.isAuthenticated()).toBe(true);
      await expect(page).toHaveURL((url) => url.pathname === ROUTES.home);
      expect(await BrowserHelper.hasAuthenticationCookies(page.context())).toBe(true);
    },
  );
});
