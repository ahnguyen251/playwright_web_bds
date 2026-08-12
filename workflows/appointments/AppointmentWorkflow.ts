import type {
  AppointmentData,
  AppointmentOptionPreference,
  AppointmentStatus,
  ResolvedAppointmentSelection,
} from '../../types/appointment.types';
import type { AppointmentPage } from '../../pages/appointments/AppointmentPage';
import type { ListingDetailPage } from '../../pages/listings/ListingDetailPage';

type AppointmentOptionKind = 'date' | 'time slot';

const resolveOption = (
  preference: AppointmentOptionPreference,
  availableLabels: readonly string[],
  kind: AppointmentOptionKind,
): string => {
  if (preference.strategy === 'exact') {
    return preference.label;
  }

  const earliest = availableLabels[0];
  if (earliest === undefined) {
    throw new Error(`No appointment ${kind} options are available`);
  }
  return earliest;
};

export class AppointmentWorkflow {
  public constructor(
    private readonly listingDetailPage: ListingDetailPage,
    private readonly appointmentPage: AppointmentPage,
  ) {}

  private async openAppointmentForm(listingId: number): Promise<void> {
    await this.listingDetailPage.open(listingId);
    await this.listingDetailPage.openAppointmentForm();
  }

  public async prepareAppointment(data: AppointmentData): Promise<ResolvedAppointmentSelection> {
    await this.openAppointmentForm(data.listingId);

    const dateLabel = resolveOption(
      data.date,
      await this.appointmentPage.availableDateLabels(),
      'date',
    );
    await this.appointmentPage.selectDate(dateLabel);

    const timeSlotLabel = resolveOption(
      data.timeSlot,
      await this.appointmentPage.availableTimeSlotLabels(),
      'time slot',
    );
    await this.appointmentPage.selectTimeSlot(timeSlotLabel);
    await this.appointmentPage.fillContact(data);

    return { dateLabel, timeSlotLabel };
  }

  public async prepareAppointmentWithoutTime(data: AppointmentData): Promise<string> {
    await this.openAppointmentForm(data.listingId);

    const dateLabel = resolveOption(
      data.date,
      await this.appointmentPage.availableDateLabels(),
      'date',
    );
    await this.appointmentPage.selectDate(dateLabel);
    await this.appointmentPage.fillContact(data);
    return dateLabel;
  }

  public async submitPreparedAppointment(): Promise<void> {
    await this.appointmentPage.submitAppointment();
  }

  public async viewAppointments(status?: AppointmentStatus): Promise<void> {
    await this.appointmentPage.open();
    if (status !== undefined) {
      await this.appointmentPage.filterByStatus(status);
    }
  }
}
