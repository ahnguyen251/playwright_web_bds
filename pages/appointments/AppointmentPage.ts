import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type {
  AppointmentData,
  AppointmentStatus,
  AppointmentView,
} from '../../types/appointment.types';
import { BasePage } from '../base/BasePage';

const statusLabels: Readonly<Record<AppointmentStatus, string>> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  'owner-cancelled': 'Chủ nhà hủy',
  'guest-cancelled': 'Khách hủy',
  expired: 'Quá hạn',
};

export class AppointmentPage extends BasePage {
  private readonly contactNameInput: Locator;
  private readonly phoneInput: Locator;
  private readonly dateInput: Locator;
  private readonly timeSlotSelect: Locator;
  private readonly noteInput: Locator;
  private readonly submitButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.contactNameInput = page.getByLabel('Họ và tên');
    this.phoneInput = page.getByLabel('Số điện thoại');
    this.dateInput = page.getByLabel('Ngày xem nhà');
    this.timeSlotSelect = page.getByLabel('Khung giờ');
    this.noteInput = page.getByLabel('Ghi chú');
    this.submitButton = page.getByRole('button', { name: 'Đặt lịch', exact: true });
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.appointments);
  }

  public async selectView(view: AppointmentView): Promise<void> {
    await this.page
      .getByRole('button', {
        name: view === 'guest' ? 'Lịch của bạn' : 'Lịch của khách',
        exact: true,
      })
      .click();
  }

  public async filterByStatus(status: AppointmentStatus): Promise<void> {
    await this.page.getByRole('button', { name: statusLabels[status], exact: true }).click();
  }

  public async fillAppointment(data: AppointmentData): Promise<void> {
    await this.contactNameInput.fill(data.contactName);
    await this.phoneInput.fill(data.phone);
    await this.dateInput.fill(data.date);
    await this.timeSlotSelect.selectOption({ label: data.timeSlot });
    if (data.note !== undefined) {
      await this.noteInput.fill(data.note);
    }
  }

  public async submitAppointment(): Promise<void> {
    await this.submitButton.click();
  }
}
