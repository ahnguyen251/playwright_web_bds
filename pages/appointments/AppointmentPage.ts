import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type {
  AppointmentContactData,
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

const normalizeOptionLabels = async (options: Locator): Promise<readonly string[]> =>
  options.evaluateAll((elements) =>
    elements.map((element) => {
      const childSegments = [...element.children]
        .map((child) => child.textContent.trim())
        .filter(Boolean);
      const text = childSegments.length > 0 ? childSegments.join(' ') : element.textContent;
      return text.replace(/\s+/g, ' ').trim();
    }),
  );

export class AppointmentPage extends BasePage {
  public readonly formHeading: Locator;
  public readonly submitButton: Locator;
  public readonly successHeading: Locator;
  public readonly nameRequiredError: Locator;
  public readonly phoneInvalidError: Locator;
  public readonly emailInvalidError: Locator;

  private readonly fullNameInput: Locator;
  private readonly phoneInput: Locator;
  private readonly emailInput: Locator;
  private readonly noteInput: Locator;
  private readonly dateOptions: Locator;
  private readonly timeSlotOptions: Locator;

  public constructor(page: Page) {
    super(page);
    this.formHeading = page.getByRole('heading', { name: 'Đặt lịch xem nhà', exact: true });
    this.submitButton = page.getByRole('button', { name: 'Đặt lịch ngay', exact: true });
    this.successHeading = page.getByRole('heading', {
      name: 'Đặt lịch thành công!',
      exact: true,
    });
    this.nameRequiredError = page.getByText('Vui lòng nhập họ và tên.', { exact: true });
    this.phoneInvalidError = page.getByText(
      'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (VD: 0901234567).',
      { exact: true },
    );
    this.emailInvalidError = page.getByText('Email phải có đuôi @gmail.com.', { exact: true });
    this.fullNameInput = page.getByPlaceholder('Họ và tên *', { exact: true });
    this.phoneInput = page.getByPlaceholder('Số điện thoại *', { exact: true });
    this.emailInput = page.getByPlaceholder('Email *', { exact: true });
    this.noteInput = page.getByPlaceholder('Ghi chú', { exact: true });
    this.dateOptions = page.getByRole('button', {
      name: /^(?:Hôm nay|Chủ nhật|Thứ [2-7]) \d{1,2} Tháng \d{1,2}$/,
    });
    this.timeSlotOptions = page.getByRole('button', {
      name: /^\d{2}:\d{2} - \d{2}:\d{2}$/,
    });
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

  public async availableDateLabels(): Promise<readonly string[]> {
    return normalizeOptionLabels(this.dateOptions);
  }

  public async availableTimeSlotLabels(): Promise<readonly string[]> {
    return normalizeOptionLabels(this.timeSlotOptions);
  }

  public async selectDate(label: string): Promise<void> {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  public async selectTimeSlot(label: string): Promise<void> {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  public async fillContact(data: AppointmentContactData): Promise<void> {
    await this.fullNameInput.fill(data.fullName);
    await this.fullNameInput.blur();
    await this.phoneInput.fill(data.phone);
    await this.phoneInput.blur();
    await this.emailInput.fill(data.email);
    await this.emailInput.blur();
    if (data.note !== undefined) {
      await this.noteInput.fill(data.note);
    }
  }

  public async submitAppointment(): Promise<void> {
    await this.submitButton.click();
  }
}
