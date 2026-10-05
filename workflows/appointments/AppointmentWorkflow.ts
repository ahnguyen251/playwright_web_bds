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
    throw new Error(
      `Không có tùy chọn lịch hẹn ${kind === 'date' ? 'ngày' : 'khung giờ'} khả dụng`,
    );
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

  public async cancelAppointment(options: {
    cardIndex?: number;
    reason: string;
    customReason?: string;
  }): Promise<void> {
    const cardIndex = options.cardIndex ?? 0;
    const modal = await this.appointmentPage.clickCancelButton(cardIndex);
    await modal.selectReason(options.reason);
    if (options.reason === 'Khác' && options.customReason !== undefined) {
      await modal.fillCustomReason(options.customReason);
    }
    await modal.submit();
  }

  public async confirmAppointment(cardIndex = 0): Promise<void> {
    const modal = await this.appointmentPage.clickConfirmButton(cardIndex);
    await modal.submit();
  }

  public async rejectAppointment(options: {
    cardIndex?: number;
    reason: string;
    customReason?: string;
  }): Promise<void> {
    const cardIndex = options.cardIndex ?? 0;
    const modal = await this.appointmentPage.clickRejectButton(cardIndex);
    await modal.selectReason(options.reason);
    if (options.reason === 'Khác' && options.customReason !== undefined) {
      await modal.fillCustomReason(options.customReason);
    }
    await modal.submit();
  }
}

