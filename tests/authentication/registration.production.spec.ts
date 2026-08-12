import { test } from '../../fixtures/test.fixture';
import {
  isProductionRegistrationEnabled,
  loadProductionRegistrationConfig,
} from '../../config/registration.config';
import { TAGS } from '../../constants/tags';
import { RegistrationDataFactory } from '../../test-data/factories/RegistrationDataFactory';
import { createExecutionPolicy } from '../../fixtures/auth.fixture';

const executionPolicy = createExecutionPolicy();
const enabled =
  isProductionRegistrationEnabled() &&
  executionPolicy.runOtpE2e &&
  executionPolicy.runMutatingE2e &&
  executionPolicy.productionMutationsApproved;
const registrationConfig = enabled ? loadProductionRegistrationConfig() : undefined;

test.describe('production registration', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });
  test.skip(!enabled, 'Set RUN_PRODUCTION_REGISTRATION_E2E=true to run real registration.');

  test(
    `registers and verifies a unique user ${TAGS.authentication}`,
    {
      annotation: {
        type: 'blocked',
        description:
          'OTP entry requires six verified unique accessible textbox names: Mã OTP 1 through Mã OTP 6.',
      },
    },
    async ({ registrationWorkflow }) => {
      if (registrationConfig === undefined) {
        throw new Error('Production registration configuration was not loaded.');
      }

      const data = RegistrationDataFactory.create(registrationConfig);
      await registrationWorkflow.register(data);
    },
  );
});
