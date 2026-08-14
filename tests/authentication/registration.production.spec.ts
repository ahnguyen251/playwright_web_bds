import { ROUTES } from '../../constants/routes';
import {
  isProductionRegistrationEnabled,
  loadProductionRegistrationConfig,
} from '../../config/registration.config';
import { createExecutionPolicy } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/test.fixture';
import { requireAcceptedRegistrationTransport } from '../../helpers/network/RegistrationResponseContract';
import { registrationSuccessTestCase } from '../../test-cases/authentication/registration.test-cases';
import { RegistrationDataFactory } from '../../test-data/factories/RegistrationDataFactory';
import { BrowserHelper } from '../../utils/BrowserHelper';
import type { RegistrationSubmission } from '../../workflows/authentication/RegistrationWorkflow';

const executionPolicy = createExecutionPolicy();
const enabled =
  isProductionRegistrationEnabled() &&
  executionPolicy.runOtpE2e &&
  executionPolicy.runMutatingE2e &&
  executionPolicy.productionRegistrationApproved;
const registrationConfig = enabled ? loadProductionRegistrationConfig() : undefined;

test.describe('production registration', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });
  test.skip(!enabled, 'Set RUN_PRODUCTION_REGISTRATION_E2E=true to run real registration.');

  test(
    `${registrationSuccessTestCase.id} ${registrationSuccessTestCase.title} - production`,
    {
      tag: [...registrationSuccessTestCase.tags],
    },
    async ({ authRequestObserver, authenticationWorkflow, page, registrationWorkflow }) => {
      if (registrationConfig === undefined) {
        throw new Error('Production registration configuration was not loaded.');
      }

      const data = RegistrationDataFactory.create(registrationConfig);
      let submission: RegistrationSubmission | undefined;
      const registrationStatus = await authRequestObserver.waitForStatus(
        'registration',
        async () => {
          submission = await registrationWorkflow.submitRegistration(data);
        },
      );
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
});
