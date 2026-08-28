import { loadProcessEnvironmentConfig } from '../config/process-environment.config';
import { AppointmentDataFactory } from '../test-data/factories/AppointmentDataFactory';
import type { AppointmentData } from '../types/appointment.types';
import { listingStateTest } from './listing-state.fixture';

export interface AppointmentFixtures {
  readonly appointmentDataFor: (listingId: number) => AppointmentData;
  readonly appointmentData: AppointmentData;
}

const environment = loadProcessEnvironmentConfig();

export const appointmentTest = listingStateTest.extend<AppointmentFixtures>({
  appointmentDataFor: async ({}, use) => {
    await use((listingId: number) => AppointmentDataFactory.create(listingId));
  },
  appointmentData: async ({ appointmentDataFor }, use, testInfo) => {
    const listingId = environment.appointmentListingId;
    if (listingId === undefined) {
      testInfo.skip(true, 'APPOINTMENT_LISTING_ID chưa được cấu hình cho kiểm thử E2E lịch hẹn.');
      return;
    }
    await use(appointmentDataFor(listingId));
  },
});
