import type { Locator, Page } from '@playwright/test';

export class ReportModalComponent {
  public readonly root: Locator;
  private readonly backdrop: Locator;
  private readonly modalTitle: Locator;
  private readonly modalSubtitle: Locator;
  private readonly reasonLines: Locator;
  private readonly descriptionTextarea: Locator;
  private readonly errorAlert: Locator;
  private readonly closeButton: Locator;
  private readonly backButton: Locator;
  private readonly submitButton: Locator;

  public constructor(page: Page) {
    this.backdrop = page.locator('div.report-modal-backdrop[role="dialog"]');
    this.root = page.locator('form.report-modal');
    this.modalTitle = this.root.locator('h2.report-modal-title');
    this.modalSubtitle = this.root.locator('p.report-modal-subtitle');
    this.reasonLines = this.root.locator('div.report-reason-box div.report-reason-line span');
    this.descriptionTextarea = this.root.locator('label.report-detail-field textarea');
    this.errorAlert = this.root.locator('p.report-upload-error');
    this.closeButton = this.root.getByRole('button', { name: /Đóng báo cáo/i }).or(this.root.locator('button.report-modal-close'));
    this.backButton = this.root.getByRole('button', { name: 'Quay lại', exact: true }).or(this.root.locator('button.report-back-button'));
    this.submitButton = this.root.locator('button.report-submit-button[type="submit"]');
  }

  public async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  public async title(): Promise<string> {
    return (await this.modalTitle.innerText()).trim();
  }

  public async subtitle(): Promise<string> {
    return (await this.modalSubtitle.innerText()).trim();
  }

  public async selectedReasons(): Promise<string[]> {
    const count = await this.reasonLines.count();
    if (count === 0) return [];
    return (await this.reasonLines.allInnerTexts()).map((text) => text.trim()).filter(Boolean);
  }

  public async fillDescription(text: string): Promise<void> {
    await this.descriptionTextarea.fill(text);
  }

  public async clearDescription(): Promise<void> {
    await this.descriptionTextarea.fill('');
  }

  public async descriptionValue(): Promise<string> {
    return this.descriptionTextarea.inputValue();
  }

  public async isDescriptionFocused(): Promise<boolean> {
    return this.descriptionTextarea.evaluate((el) => el === document.activeElement);
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

  public async errorMessage(): Promise<string> {
    if (!(await this.errorAlert.isVisible())) return '';
    const text = (await this.errorAlert.innerText()).trim();
    return text.replace(/Vui lÃ²ng nháº­p lÃ½ do chi tiáº¿t\./gu, 'Vui lòng nhập lý do chi tiết.');
  }

  public async isErrorVisible(): Promise<boolean> {
    return this.errorAlert.isVisible();
  }
}
