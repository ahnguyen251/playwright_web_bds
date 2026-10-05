import type { Locator, Page } from '@playwright/test';

export class PackageUpgradeModalComponent {
  private readonly page: Page;
  public readonly root: Locator;
  public readonly modalTitle: Locator;
  public readonly modalSubtitle: Locator;
  public readonly closeButton: Locator;
  public readonly packagesGrid: Locator;

  // Confirmation Card elements
  public readonly confirmCard: Locator;
  public readonly confirmTitle: Locator;
  public readonly confirmMessage: Locator;
  public readonly cancelButton: Locator;
  public readonly payButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('div.modal-overlay').filter({
      has: page.locator('h2.modal-title', { hasText: 'Nâng cấp gói tin' }),
    });
    this.modalTitle = this.root.locator('h2.modal-title');
    this.modalSubtitle = this.root.locator('p.modal-subtitle');
    this.closeButton = this.root.locator('button.modal-close');
    this.packagesGrid = this.root.locator('.packages-grid');

    this.confirmCard = page.locator('.confirm-card');
    this.confirmTitle = this.confirmCard.locator('.confirm-title');
    this.confirmMessage = this.confirmCard.locator('.confirm-message');
    this.cancelButton = this.confirmCard.locator('button.confirm-btn--secondary');
    this.payButton = this.confirmCard.locator('button.confirm-btn--primary');
  }

  public async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  public async isGridVisible(): Promise<boolean> {
    return this.packagesGrid.isVisible();
  }

  public async isConfirmVisible(): Promise<boolean> {
    return this.confirmCard.isVisible();
  }

  public async title(): Promise<string> {
    return (await this.modalTitle.innerText()).trim();
  }

  public async confirmTitleText(): Promise<string> {
    return (await this.confirmTitle.innerText()).trim();
  }

  public async confirmMessageText(): Promise<string> {
    return (await this.confirmMessage.innerText()).trim();
  }

  public getPackageCard(nameOrSlug: string): Locator {
    const slug = nameOrSlug.toLowerCase();
    if (slug === 'diamond') return this.root.locator('.package-card--diamond');
    if (slug === 'ruby') return this.root.locator('.package-card--ruby');
    if (slug === 'gold' || slug === 'vàng') return this.root.locator('.package-card--gold');
    if (slug === 'free' || slug === 'thường' || slug === 'tin thường') {
      return this.root.locator('.package-card--free');
    }
    return this.root.locator('.package-card').filter({ hasText: nameOrSlug });
  }

  public async selectDuration(packageName: string, durationLabel: string): Promise<void> {
    const card = this.getPackageCard(packageName);
    const row = card.locator('.pkg-duration-row').filter({ hasText: durationLabel }).first();
    await row.click();
  }

  public async isDurationActive(packageName: string, durationLabel: string): Promise<boolean> {
    const card = this.getPackageCard(packageName);
    const row = card.locator('.pkg-duration-row').filter({ hasText: durationLabel }).first();
    const className = (await row.getAttribute('class')) ?? '';
    return className.includes('pkg-duration-row--active');
  }

  public async isUpgradeButtonEnabled(packageName: string): Promise<boolean> {
    const card = this.getPackageCard(packageName);
    const btn = card.locator('.pkg-action-btn').first();
    return btn.isEnabled();
  }

  public async getUpgradeButtonText(packageName: string): Promise<string> {
    const card = this.getPackageCard(packageName);
    const btn = card.locator('.pkg-action-btn').first();
    return (await btn.innerText()).trim();
  }

  public async isDowngradeBlocked(packageName: string): Promise<boolean> {
    const card = this.getPackageCard(packageName);
    const disabledBtn = card
      .locator(
        '.pkg-action-btn--disabled, button:has-text("Không thể chọn"), button:has-text("Không thể hạ cấp")',
      )
      .first();
    if ((await disabledBtn.count()) === 0) return false;
    const text = await disabledBtn.innerText();
    const isDisabled = await disabledBtn.isDisabled();
    return isDisabled && (text.includes('Không thể chọn') || text.includes('Không thể hạ cấp'));
  }

  public async clickUpgrade(packageName: string): Promise<void> {
    const card = this.getPackageCard(packageName);
    await card.locator('.pkg-action-btn').first().click();
  }

  public async cancelConfirmation(): Promise<void> {
    await this.cancelButton.click();
  }

  public async confirmPayment(): Promise<void> {
    await this.payButton.click();
  }

  public async close(): Promise<void> {
    await this.closeButton.click();
  }

  public async waitForGatewayNavigation(): Promise<void> {
    await this.page.waitForURL(/sandbox\.vnpayment\.vn/, { timeout: 30_000 });
  }
}
