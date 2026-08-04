import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import { BasePage } from '../base/BasePage';

export class ListingDetailPage extends BasePage {
  private readonly titleHeading: Locator;
  private readonly appointmentButton: Locator;
  private readonly favoriteButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.titleHeading = page.getByRole('heading', { level: 1 });
    this.appointmentButton = page.getByRole('button', {
      name: 'Đặt lịch xem nhà',
      exact: true,
    });
    this.favoriteButton = page.getByRole('button', { name: 'Yêu thích', exact: true });
  }

  public async open(listingId: string | number): Promise<void> {
    await this.navigate(ROUTES.listingDetail(listingId));
  }

  public async title(): Promise<string> {
    return this.titleHeading.innerText();
  }

  public async openAppointmentForm(): Promise<void> {
    await this.appointmentButton.click();
  }

  public async addToFavorites(): Promise<void> {
    await this.favoriteButton.click();
  }
}
