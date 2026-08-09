import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { ListingDetailSnapshot, ListingReference } from '../../types/listing.types';
import { BasePage } from '../base/BasePage';

export class ListingDetailPage extends BasePage {
  private readonly titleHeading: Locator;
  private readonly description: Locator;
  private readonly contactName: Locator;
  private readonly amenitySection: Locator;
  private readonly mediaItems: Locator;
  private readonly defaultImage: Locator;
  private readonly relatedSection: Locator;
  private readonly viewCount: Locator;
  private readonly appointmentButton: Locator;
  private readonly favoriteButton: Locator;
  private readonly notFoundAlert: Locator;

  public constructor(page: Page) {
    super(page);
    this.titleHeading = page.getByRole('heading', { level: 1 }).first();
    this.description = page
      .locator('[data-listing-description] p')
      .or(
        page
          .getByRole('heading', { name: 'Mô tả tin đăng', exact: true })
          .locator('xpath=..')
          .locator('p'),
      )
      .first();
    const contactSection = page
      .locator('[data-listing-contact]')
      .or(
        page
          .getByText('Thông tin của bất động sản', { exact: true })
          .locator('xpath=ancestor::section[1]'),
      )
      .first();
    const contactRole = contactSection.getByText(/^(Chủ nhà|Môi giới)$/i).last();
    this.contactName = contactSection
      .locator('[data-listing-contact-name]')
      .or(contactRole.locator('xpath=preceding-sibling::p[1]'))
      .first();
    this.amenitySection = page
      .locator('[data-listing-amenities]')
      .or(page.getByRole('heading', { name: 'Tiện ích', exact: true }).locator('xpath=..'))
      .first();
    this.mediaItems = page.locator('[data-listing-media] img, img[alt="Listing image"]');
    this.defaultImage = page.locator(
      '[data-default-listing-image], img[alt*="mặc định" i], img[src*="default" i]',
    );
    this.relatedSection = page
      .locator('[data-related-listings]')
      .or(
        page.getByRole('heading', { name: 'Tin đăng liên quan', exact: true }).locator('xpath=..'),
      )
      .first();
    this.viewCount = page
      .locator('[data-view-count]')
      .or(page.getByText(/\d+\s*lượt xem/i))
      .first();
    this.appointmentButton = page.getByRole('button', {
      name: 'Đặt lịch xem nhà',
      exact: true,
    });
    this.favoriteButton = page.getByRole('button', { name: /^(Yêu thích|Bỏ yêu thích)$/i }).first();
    this.notFoundAlert = page
      .getByRole('alert')
      .filter({ hasText: /Không tìm thấy|không tồn tại/i })
      .or(page.getByText(/Không tìm thấy tin đăng|Tin đăng không tồn tại/i))
      .first();
  }

  public async open(listing: string | number | ListingReference): Promise<void> {
    const id = typeof listing === 'object' ? listing.id : listing;
    await this.navigate(ROUTES.listingDetail(id));
  }

  public async title(): Promise<string> {
    return (await this.titleHeading.innerText()).trim();
  }

  public async snapshot(): Promise<ListingDetailSnapshot> {
    return Object.freeze({
      title: await this.title(),
      description: (await this.description.innerText()).trim(),
      contactName: (await this.contactName.innerText()).trim(),
      amenities: Object.freeze(await this.amenities()),
      mediaCount: await this.mediaItems.count(),
      usesDefaultImage: await this.hasDefaultImage(),
      relatedTitles: Object.freeze(await this.relatedTitles()),
      viewCountText: (await this.viewCount.innerText()).trim(),
    });
  }

  public async isContentVisible(): Promise<boolean> {
    return this.titleHeading.isVisible();
  }

  public async hasDefaultImage(): Promise<boolean> {
    return (await this.defaultImage.count()) > 0 && (await this.defaultImage.first().isVisible());
  }

  public async relatedTitles(): Promise<readonly string[]> {
    if ((await this.relatedSection.count()) === 0) return [];
    return this.relatedSection.getByRole('heading', { level: 3 }).allTextContents();
  }

  public async notFoundMessage(): Promise<string> {
    return (await this.notFoundAlert.innerText()).trim();
  }

  public async favoriteState(): Promise<boolean> {
    const pressed = await this.favoriteButton.getAttribute('aria-pressed');
    if (pressed !== null) return pressed === 'true';
    return /Bỏ yêu thích/i.test((await this.favoriteButton.getAttribute('aria-label')) ?? '');
  }

  public async toggleFavorite(): Promise<void> {
    await this.favoriteButton.click();
  }

  public async openAppointmentForm(): Promise<void> {
    await this.appointmentButton.click();
  }

  public async addToFavorites(): Promise<void> {
    await this.toggleFavorite();
  }

  private async amenities(): Promise<string[]> {
    const explicitItems = this.amenitySection.locator('[data-amenity], li');
    if ((await explicitItems.count()) > 0) {
      return (await explicitItems.allTextContents()).map((value) => value.trim()).filter(Boolean);
    }
    const lines = (await this.amenitySection.innerText())
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    return lines.filter((value) => value !== 'Tiện ích');
  }
}
