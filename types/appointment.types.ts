export type AppointmentView = 'guest' | 'owner';
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'owner-cancelled'
  | 'guest-cancelled'
  | 'expired';

export interface AppointmentData {
  readonly listingId: number;
  readonly contactName: string;
  readonly phone: string;
  readonly date: string;
  readonly timeSlot: string;
  readonly note?: string;
}
