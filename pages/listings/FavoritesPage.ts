import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { ListingSummary } from '../../types/listing.types';
import { BasePage } from '../base/BasePage';
import { ListingCardComponent } from '../components/ListingCardComponent';

export class FavoritesPage extends BasePage {
  private readonly cardRoots: Locator;
  private readonly feedbackRegion: Locator;

  public constructor(page: Page) {
    super(page);
    this.cardRoots = page.locator('a[href^="/listings/"]');
    this.feedbackRegion = page.getByRole('status').or(page.getByRole('alert')).first();
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.favorites);
  }

  public async contains(title: string): Promise<boolean> {
    const card = this.cardRoot(title);
    return (await card.count()) > 0 && card.isVisible();
  }

  public async summaryByTitle(title: string): Promise<ListingSummary> {
    return new ListingCardComponent(this.cardRoot(title)).summary();
  }

  public async toggleByTitle(title: string): Promise<void> {
    await new ListingCardComponent(this.cardRoot(title)).toggleFavorite();
  }

  public async feedback(): Promise<string> {
    return (await this.feedbackRegion.innerText()).trim();
  }

  private cardRoot(title: string): Locator {
    return this.cardRoots
      .filter({ has: this.page.getByRole('heading', { name: title, exact: true }) })
      .first();
  }
}
