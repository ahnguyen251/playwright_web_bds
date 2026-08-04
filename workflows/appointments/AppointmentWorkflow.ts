import type { AppointmentData, AppointmentStatus } from '../../types/appointment.types';
import type { AppointmentPage } from '../../pages/appointments/AppointmentPage';
import type { ListingDetailPage } from '../../pages/listings/ListingDetailPage';

export class AppointmentWorkflow {
  public constructor(
    private readonly listingDetailPage: ListingDetailPage,
    private readonly appointmentPage: AppointmentPage,
  ) {}

  public async prepareAppointment(data: AppointmentData): Promise<void> {
    await this.listingDetailPage.open(data.listingId);
    await this.listingDetailPage.openAppointmentForm();
    await this.appointmentPage.fillAppointment(data);
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
