import type { Locator, Page } from '@playwright/test';

export class ReportingRunDetailsComponent {
  public readonly modal: Locator;
  public readonly statusBadge: Locator;
  public readonly classificationLabels: Locator;
  public readonly primaryHeading: Locator;
  public readonly supplementaryHeading: Locator;
  public readonly evidenceLabels: Locator;
  public readonly primaryItems: Locator;
  public readonly supplementaryItems: Locator;
  public readonly screenshotImages: Locator;
  public readonly screenshotPreview: Locator;
  public readonly screenshotPreviewImage: Locator;
  public readonly screenshotPreviewClose: Locator;
  public readonly supplementaryGrid: Locator;

  constructor(private readonly page: Page) {
    this.modal = page.locator('.modal-content');
    this.statusBadge = page.locator('.modal-content .badge').first();
    this.classificationLabels = page.locator('.failure-classification');
    this.primaryHeading = page.getByRole('heading', { name: 'Bằng chứng chính' });
    this.supplementaryHeading = page.getByRole('heading', { name: 'Bằng chứng bổ sung' });
    this.evidenceLabels = page.locator('.evidence-label');
    this.primaryItems = page.locator('.evidence-primary .evidence-item');
    this.supplementaryItems = page.locator('.evidence-supplementary .evidence-item');
    this.screenshotImages = page.locator('.evidence-item img');
    this.screenshotPreview = page.locator('.evidence-image-preview');
    this.screenshotPreviewImage = this.screenshotPreview.locator('img');
    this.screenshotPreviewClose = this.screenshotPreview.getByRole('button', {
      name: 'Đóng ảnh chi tiết',
    });
    this.supplementaryGrid = page.locator('.evidence-supplementary');
  }

  public async open(baseUrl: string, runId: string, resultTitle: string): Promise<void> {
    await this.page.goto(`${baseUrl}/#runs`);
    await this.page.getByText(runId, { exact: true }).click();
    const row = this.page.locator('tbody tr', { hasText: resultTitle });
    await row.getByRole('button', { name: 'Xem' }).click();
  }

  public item(label: string): Locator {
    return this.page.locator('.evidence-item', { hasText: label });
  }

  public control(label: string, name: string): Locator {
    return this.item(label).getByRole('button', { name, exact: true });
  }

  public link(label: string, name: string): Locator {
    return this.item(label).getByRole('link', { name });
  }

  public content(label: string, selector: string): Locator {
    return this.item(label).locator(selector);
  }

  public async readXssMarker(): Promise<unknown> {
    return this.page.evaluate((): unknown => Reflect.get(globalThis, '__evidenceXss') as unknown);
  }
}
