import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

export class VnpayResultPage extends BasePage {
  public readonly heading: Locator;
  public readonly iconBadge: Locator;
  public readonly redirectNotice: Locator;

  public constructor(page: Page) {
    super(page);
    this.heading = page.locator('main h1');
    this.iconBadge = page.locator('main section div.rounded-full');
    this.redirectNotice = page.locator('main section p');
  }

  public async open(
    status: 'success' | 'failed' = 'success',
    transactionId = 'PFY_TEST_123',
  ): Promise<void> {
    await this.navigate(`/payment/vnpay-result?status=${status}&transaction_id=${transactionId}`);
  }

  public async headingText(): Promise<string> {
    return (await this.heading.innerText()).trim();
  }

  public async redirectNoticeText(): Promise<string> {
    return (await this.redirectNotice.innerText()).trim();
  }

  public async isSuccess(): Promise<boolean> {
    const text = await this.headingText();
    const className = (await this.iconBadge.getAttribute('class')) ?? '';
    return text.includes('Thanh toán thành công') && className.includes('bg-emerald-500');
  }

  public async isFailed(): Promise<boolean> {
    const text = await this.headingText();
    const className = (await this.iconBadge.getAttribute('class')) ?? '';
    return text.includes('Thanh toán chưa thành công') && className.includes('bg-rose-500');
  }

  public async waitForRedirectToListings(): Promise<void> {
    await this.page.waitForURL(/\/profile\?tab=listings/, { timeout: 15_000 });
  }
}
