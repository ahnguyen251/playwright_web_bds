export type AppointmentView = 'guest' | 'owner';
export type AppointmentStatus =
  'pending' | 'confirmed' | 'completed' | 'owner-cancelled' | 'guest-cancelled' | 'expired';

export interface AppointmentContactData {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly note?: string;
}

export type AppointmentOptionPreference =
  | { readonly strategy: 'earliest-available' }
  | { readonly strategy: 'exact'; readonly label: string };

export interface AppointmentData extends AppointmentContactData {
  readonly listingId: number;
  readonly date: AppointmentOptionPreference;
  readonly timeSlot: AppointmentOptionPreference;
}

export interface ResolvedAppointmentSelection {
  readonly dateLabel: string;
  readonly timeSlotLabel: string;
}
