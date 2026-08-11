import { loadEnvironmentConfig } from '../config/environment.config';
import { AppointmentDataFactory } from '../test-data/factories/AppointmentDataFactory';
import type { AppointmentData } from '../types/appointment.types';
import { workflowTest } from './workflow.fixture';

export interface AppointmentFixtures {
  readonly appointmentDataFor: (listingId: number) => AppointmentData;
  readonly appointmentData: AppointmentData;
}

const environment = loadEnvironmentConfig();

export const appointmentTest = workflowTest.extend<AppointmentFixtures>({
  appointmentDataFor: async ({}, use) => {
    await use((listingId: number) => AppointmentDataFactory.create(listingId));
  },
  appointmentData: async ({ appointmentDataFor }, use, testInfo) => {
    const listingId = environment.appointmentListingId;
    if (listingId === undefined) {
      testInfo.skip(true, 'APPOINTMENT_LISTING_ID is not configured for appointment E2E tests.');
      return;
    }
    await use(appointmentDataFor(listingId));
  },
});
