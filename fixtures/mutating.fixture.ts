import { expect } from '@playwright/test';

import { loadEnvironmentConfig } from '../config/environment.config';
import { mutationBlockReason } from '../config/mutation.policy';
import { appointmentTest } from './appointment.fixture';

interface MutationFixtures {
  readonly mutationGuard: boolean;
}

const environment = loadEnvironmentConfig();

export const mutatingTest = appointmentTest.extend<MutationFixtures>({
  mutationGuard: [
    async ({}, use, testInfo) => {
      const reason = mutationBlockReason(environment);
      if (reason !== undefined) {
        testInfo.skip(true, reason);
        return;
      }
      await use(true);
    },
    { auto: true },
  ],
});

export { expect };
