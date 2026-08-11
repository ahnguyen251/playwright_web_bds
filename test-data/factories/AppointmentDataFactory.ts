import defaultAppointment from '../static/appointment.json';
import type { AppointmentData, AppointmentOptionPreference } from '../../types/appointment.types';
import { RandomDataGenerator } from '../../utils/RandomDataGenerator';

type AppointmentDataOverrides = Partial<Omit<AppointmentData, 'listingId'>>;

const earliestAvailable = (): AppointmentOptionPreference =>
  Object.freeze({ strategy: 'earliest-available' });

const freezePreference = (preference: AppointmentOptionPreference): AppointmentOptionPreference =>
  Object.freeze({ ...preference });

export class AppointmentDataFactory {
  public static create(
    listingId: number,
    overrides: AppointmentDataOverrides = {},
  ): AppointmentData {
    if (!Number.isInteger(listingId) || listingId <= 0) {
      throw new Error('Appointment listing ID must be positive');
    }

    const appointment: AppointmentData = {
      listingId,
      fullName: overrides.fullName ?? defaultAppointment.fullName,
      phone: overrides.phone ?? RandomDataGenerator.phoneNumber(),
      email: overrides.email ?? `${RandomDataGenerator.string('appointment')}@gmail.com`,
      note: overrides.note ?? defaultAppointment.note,
      date: freezePreference(overrides.date ?? earliestAvailable()),
      timeSlot: freezePreference(overrides.timeSlot ?? earliestAvailable()),
    };

    return Object.freeze(appointment);
  }
}
