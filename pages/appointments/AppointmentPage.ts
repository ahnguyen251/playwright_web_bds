import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type {
  AppointmentContactData,
  AppointmentStatus,
  AppointmentView,
} from '../../types/appointment.types';
import { BasePage } from '../base/BasePage';
import { AppointmentCancelModalComponent } from '../components/AppointmentCancelModalComponent';
import { AppointmentConfirmModalComponent } from '../components/AppointmentConfirmModalComponent';
import { AppointmentRejectModalComponent } from '../components/AppointmentRejectModalComponent';

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
    elements
      .filter((element) => !(element instanceof HTMLButtonElement) || !element.disabled)
      .map((element) => {
        const childSegments = [...element.children]
          .map((child) => child.textContent.trim())
          .filter(Boolean);
        const text = childSegments.length > 0 ? childSegments.join(' ') : element.textContent;
        return text.replace(/\s+/g, ' ').trim();
      }),
  );

const selectEnabledOption = async (
  option: Locator,
  kind: 'date' | 'time slot',
  label: string,
): Promise<void> => {
  if ((await option.count()) === 0) {
    throw new Error(`Appointment ${kind} option is not available: ${label}`);
  }
  if (await option.isDisabled()) {
    throw new Error(`Appointment ${kind} option is disabled: ${label}`);
  }
  await option.click();
};

export class AppointmentPage extends BasePage {
  public readonly cancelModal: AppointmentCancelModalComponent;
  public readonly confirmModal: AppointmentConfirmModalComponent;
  public readonly rejectModal: AppointmentRejectModalComponent;
  public readonly formHeading: Locator;
  public readonly submitButton: Locator;
  public readonly successHeading: Locator;
  public readonly failureHeading: Locator;
  public readonly confirmBookingButton: Locator;
  public readonly closeFailurePopupButton: Locator;
  public readonly failureMessage: Locator;
  public readonly nameRequiredError: Locator;
  public readonly phoneInvalidError: Locator;
  public readonly emailInvalidError: Locator;
  public readonly cards: Locator;

  private readonly fullNameInput: Locator;
  private readonly phoneInput: Locator;
  private readonly emailInput: Locator;
  private readonly noteInput: Locator;
  private readonly dateOptions: Locator;
  private readonly timeSlotOptions: Locator;

  public constructor(page: Page) {
    super(page);
    this.cancelModal = new AppointmentCancelModalComponent(page);
    this.confirmModal = new AppointmentConfirmModalComponent(page);
    this.rejectModal = new AppointmentRejectModalComponent(page);
    this.formHeading = page.getByRole('heading', { name: 'Đặt lịch xem nhà', exact: true });
    this.submitButton = page.getByRole('button', { name: 'Đặt lịch ngay', exact: true });
    this.successHeading = page.getByRole('heading', {
      name: 'Đặt lịch thành công!',
      exact: true,
    });
    this.failureHeading = page.getByRole('heading', {
      name: 'Đặt lịch thất bại',
      exact: true,
    });
    this.confirmBookingButton = page.locator('button.dialog-btn-confirm', {
      hasText: /Xác nhận|Đang xử lý/,
    });
    this.closeFailurePopupButton = page.getByRole('button', {
      name: 'Đóng',
      exact: true,
    });
    this.failureMessage = this.failureHeading.locator('xpath=following-sibling::p[1]');
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
    this.cards = page.locator('div.bg-white.border.rounded-xl.p-5');
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
    await this.dateOptions.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    return normalizeOptionLabels(this.dateOptions);
  }

  public async availableTimeSlotLabels(): Promise<readonly string[]> {
    await this.timeSlotOptions.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    return normalizeOptionLabels(this.timeSlotOptions);
  }

  public async selectDate(label: string): Promise<void> {
    await selectEnabledOption(
      this.page.getByRole('button', { name: label, exact: true }),
      'date',
      label,
    );
  }

  public async selectTimeSlot(label: string): Promise<void> {
    await selectEnabledOption(
      this.page.getByRole('button', { name: label, exact: true }),
      'time slot',
      label,
    );
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

  public async confirmBookingSubmission(): Promise<void> {
    await this.confirmBookingButton.waitFor({ state: 'visible' });
    await this.confirmBookingButton.click();
  }

  public async closeFailurePopup(): Promise<void> {
    await this.closeFailurePopupButton.waitFor({ state: 'visible' });
    await this.closeFailurePopupButton.click();
  }

  public async cardCount(): Promise<number> {
    await this.cards.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    return this.cards.count();
  }

  public getCard(index: number): Locator {
    return this.cards.nth(index);
  }

  public getCardByTitle(title: string): Locator {
    return this.cards.filter({ has: this.page.getByRole('heading', { name: title }) });
  }

  public async getCardStatus(index: number): Promise<string> {
    const badge = this.cards.nth(index).locator('span.inline-flex.items-center.rounded-full');
    await badge.waitFor({ state: 'visible' });
    return (await badge.innerText()).trim();
  }

  public async getCardCancelReason(index: number): Promise<string> {
    const reason = this.cards.nth(index).locator('p.text-xs.text-slate-400');
    if ((await reason.count()) === 0) return '';
    return (await reason.innerText()).trim();
  }

  public async hasCancelButton(index: number): Promise<boolean> {
    const cancelButton = this.cards.nth(index).getByRole('button', { name: 'Hủy lịch' });
    return (await cancelButton.count()) > 0 && (await cancelButton.isVisible());
  }

  public async clickCancelButton(index: number): Promise<AppointmentCancelModalComponent> {
    const cancelButton = this.cards.nth(index).getByRole('button', { name: 'Hủy lịch' });
    await cancelButton.waitFor({ state: 'visible' });
    await cancelButton.click();
    await this.cancelModal.root.waitFor({ state: 'visible' });
    return this.cancelModal;
  }

  public async hasConfirmButton(index: number): Promise<boolean> {
    const confirmButton = this.cards.nth(index).getByRole('button', { name: 'Xác nhận' });
    return (await confirmButton.count()) > 0 && (await confirmButton.isVisible());
  }

  public async clickConfirmButton(index: number): Promise<AppointmentConfirmModalComponent> {
    const confirmButton = this.cards.nth(index).getByRole('button', { name: 'Xác nhận' });
    await confirmButton.waitFor({ state: 'visible' });
    await confirmButton.click();
    await this.confirmModal.root.waitFor({ state: 'visible' });
    return this.confirmModal;
  }

  public async hasRejectButton(index: number): Promise<boolean> {
    const rejectButton = this.cards.nth(index).getByRole('button', { name: 'Từ chối' });
    return (await rejectButton.count()) > 0 && (await rejectButton.isVisible());
  }

  public async clickRejectButton(index: number): Promise<AppointmentRejectModalComponent> {
    const rejectButton = this.cards.nth(index).getByRole('button', { name: 'Từ chối' });
    await rejectButton.waitFor({ state: 'visible' });
    await rejectButton.click();
    await this.rejectModal.root.waitFor({ state: 'visible' });
    return this.rejectModal;
  }

  public async getCardRejectReason(index: number): Promise<string> {
    const reason = this.cards.nth(index).locator('p.text-xs.text-slate-400');
    if ((await reason.count()) === 0) return '';
    return (await reason.innerText()).trim();
  }
}

