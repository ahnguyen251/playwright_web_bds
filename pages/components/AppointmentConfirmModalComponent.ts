import type { Locator, Page } from '@playwright/test';

export class AppointmentConfirmModalComponent {
  public readonly root: Locator;
  public readonly modalTitle: Locator;
  public readonly modalDescription: Locator;
  public readonly backButton: Locator;
  public readonly submitButton: Locator;
  public readonly closeButton: Locator;

  // Feedback modal (success / error notification)
  public readonly feedbackModal: Locator;
  public readonly feedbackTitle: Locator;
  public readonly feedbackDescription: Locator;

  public constructor(page: Page) {
    this.root = page.locator('div.dlg-overlay').filter({
      has: page.locator('h3.dlg-title', { hasText: 'Xác nhận lịch hẹn' }),
    });
    this.modalTitle = this.root.locator('h3.dlg-title');
    this.modalDescription = this.root.locator('p.dlg-desc');
    this.backButton = this.root.locator('button.btn-outline', { hasText: 'Quay lại' });
    this.submitButton = this.root.locator('button.btn-primary', { hasText: /Xác nhận|Đang xử lý/ });
    this.closeButton = this.root.locator('button.dlg-x');

    this.feedbackModal = page.locator('div.dlg-overlay').filter({
      has: page.locator('h3.dlg-title', { hasText: /Xác nhận thành công!|Thất bại/ }),
    });
    this.feedbackTitle = this.feedbackModal.locator('h3.dlg-title');
    this.feedbackDescription = this.feedbackModal.locator('p.dlg-desc');
  }

  public async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  public async title(): Promise<string> {
    return (await this.modalTitle.innerText()).trim();
  }

  public async description(): Promise<string> {
    return (await this.modalDescription.innerText()).trim();
  }

  public async isSubmitEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled();
  }

  public async isSubmitDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }

  public async back(): Promise<void> {
    await this.backButton.click();
  }

  public async close(): Promise<void> {
    await this.closeButton.click();
  }

  public async isFeedbackVisible(): Promise<boolean> {
    return this.feedbackModal.isVisible();
  }

  public async feedbackTitleText(): Promise<string> {
    if (!(await this.feedbackModal.isVisible())) return '';
    return (await this.feedbackTitle.innerText()).trim();
  }

  public async feedbackDescriptionText(): Promise<string> {
    if (!(await this.feedbackModal.isVisible())) return '';
    return (await this.feedbackDescription.innerText()).trim();
  }
}
