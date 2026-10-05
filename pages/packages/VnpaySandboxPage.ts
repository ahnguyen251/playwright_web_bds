import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

export interface VnpayCardDetails {
  readonly cardNumber: string;
  readonly cardHolder: string;
  readonly issueDate: string;
  readonly otp: string;
}

export class VnpaySandboxPage extends BasePage {
  public readonly cardNumberInput: Locator;
  public readonly cardHolderInput: Locator;
  public readonly issueDateInput: Locator;
  public readonly continueButton: Locator;
  public readonly otpInput: Locator;
  public readonly confirmOtpButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.cardNumberInput = page.locator('#card_number_mask, input[name="card_number"]').first();
    this.cardHolderInput = page.locator('#cardHolder, input[name="cardHolder"]').first();
    this.issueDateInput = page.locator('#cardDate, input[name="cardDate"]').first();
    this.continueButton = page.locator('button[type="submit"], #btnContinue').first();
    this.otpInput = page.locator('#otpvalue, input[name="otp"]').first();
    this.confirmOtpButton = page.locator('button[type="submit"], #btnConfirm').first();
  }

  public async isAtGateway(): Promise<boolean> {
    return Promise.resolve(this.page.url().includes('sandbox.vnpayment.vn'));
  }

  public async fillCardAndSubmit(details: VnpayCardDetails): Promise<void> {
    if ((await this.cardNumberInput.count()) > 0 && (await this.cardNumberInput.isVisible())) {
      await this.cardNumberInput.fill(details.cardNumber);
      if ((await this.cardHolderInput.count()) > 0) {
        await this.cardHolderInput.fill(details.cardHolder);
      }
      if ((await this.issueDateInput.count()) > 0) {
        await this.issueDateInput.fill(details.issueDate);
      }
      await this.continueButton.click();

      await this.otpInput.waitFor({ state: 'visible', timeout: 15_000 });
      await this.otpInput.fill(details.otp);
      await this.confirmOtpButton.click();
    }
  }

  public async waitForReturnToPropify(): Promise<void> {
    await this.page.waitForURL(/\/payment\/vnpay-result|\/profile\?tab=listings/, {
      timeout: 30_000,
    });
  }
}
