import type { Locator, Page } from '@playwright/test';

export class AppointmentCancelModalComponent {
  public readonly root: Locator;
  public readonly selectReasonDropdown: Locator;
  public readonly customReasonTextarea: Locator;
  public readonly backButton: Locator;
  public readonly submitButton: Locator;
  public readonly closeButton: Locator;
  public readonly modalTitle: Locator;
  public readonly modalDescription: Locator;

  // Toast / Feedback Dialog
  public readonly feedbackModal: Locator;
  public readonly feedbackTitle: Locator;
  public readonly feedbackDescription: Locator;

  public constructor(page: Page) {
    // Cancel modal dialog
    this.root = page.locator('div.dlg-overlay').filter({
      has: page.locator('h3.dlg-title', { hasText: 'Hủy lịch hẹn' }),
    });
    this.modalTitle = this.root.locator('h3.dlg-title');
    this.modalDescription = this.root.locator('p.dlg-desc');
    this.selectReasonDropdown = this.root.locator('select.dlg-select');
    this.customReasonTextarea = this.root.locator('textarea.dlg-textarea');
    this.backButton = this.root.locator('button.btn-outline', { hasText: 'Quay lại' });
    this.submitButton = this.root.locator('button.btn-danger', { hasText: /Hủy lịch hẹn|Đang xử lý/ });
    this.closeButton = this.root.locator('button.dlg-x');

    // Feedback modal (success / error notification)
    this.feedbackModal = page.locator('div.dlg-overlay').filter({
      has: page.locator('h3.dlg-title', { hasText: /Đã hủy lịch hẹn|Thất bại/ }),
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

  public async availableReasons(): Promise<readonly string[]> {
    const options = this.selectReasonDropdown.locator('option');
    return options.evaluateAll((elements) =>
      elements
        .filter(
          (el) =>
            el instanceof HTMLOptionElement &&
            !el.disabled &&
            el.value !== '',
        )
        .map((el) => el.textContent.trim()),
    );
  }

  public async selectReason(reason: string): Promise<void> {
    await this.selectReasonDropdown.selectOption({ label: reason });
  }

  public async fillCustomReason(reason: string): Promise<void> {
    await this.customReasonTextarea.fill(reason);
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
    if (!(await this.feedbackDescription.isVisible())) return '';
    return (await this.feedbackDescription.innerText()).trim();
  }
}
