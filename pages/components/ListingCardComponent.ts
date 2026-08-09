import type { Locator } from '@playwright/test';

import type { ListingSummary } from '../../types/listing.types';

const parseDecimal = (value: string): number => {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePriceInBillions = (priceText: string): number | undefined => {
  const numericText = /[\d.,]+/.exec(priceText)?.[0];
  if (numericText === undefined) return undefined;
  const value = parseDecimal(numericText);
  const normalized = priceText.toLocaleLowerCase('vi-VN');
  if (normalized.includes('triệu')) return value / 1000;
  if (normalized.includes('nghìn')) return value / 1_000_000;
  return value;
};

export class ListingCardComponent {
  private readonly titleHeading: Locator;
  private readonly favoriteButton: Locator;

  public constructor(private readonly root: Locator) {
    this.titleHeading = root.getByRole('heading').first();
    this.favoriteButton = root.getByRole('button', { name: /Yêu thích|Bỏ yêu thích/i }).first();
  }

  public async summary(): Promise<ListingSummary> {
    const href = (await this.root.getAttribute('href')) ?? '';
    const id = /\/listings\/([^/?#]+)/.exec(href)?.[1] ?? (await this.dataValue('listingId'));
    const priceText = await this.textValue('listing-price', /[\d.,]+\s*(tỷ|triệu|nghìn)/i);
    const price = parsePriceInBillions(priceText);
    const posterText = await this.textValue('listing-poster', /^(Chủ nhà|Môi giới)$/i);

    return Object.freeze({
      id,
      title: (await this.titleHeading.innerText()).trim(),
      address: await this.textValue('listing-address', /Phường|Xã|Tỉnh|Thành phố/i, 'p'),
      ...(price === undefined ? {} : { price }),
      priceText,
      area: parseDecimal(await this.textValue('listing-area', /[\d.,]+\s*m²/i)),
      bedrooms: parseDecimal(await this.textValue('listing-bedrooms', /\d+\s*PN/i)),
      bathrooms: parseDecimal(await this.textValue('listing-bathrooms', /\d+\s*WC/i)),
      poster: /Môi giới/i.test(posterText) ? 'broker' : 'owner',
    });
  }

  public async open(): Promise<void> {
    await this.root.click();
  }

  public async toggleFavorite(): Promise<void> {
    await this.favoriteButton.click();
  }

  public async isFavorited(): Promise<boolean> {
    const pressed = await this.favoriteButton.getAttribute('aria-pressed');
    if (pressed !== null) return pressed === 'true';
    const label = (await this.favoriteButton.getAttribute('aria-label')) ?? '';
    if (/Bỏ yêu thích/i.test(label)) return true;
    return /fill|red|rose/.test((await this.favoriteButton.getAttribute('class')) ?? '');
  }

  private async dataValue(name: string): Promise<string> {
    return (
      (await this.root.getAttribute(
        `data-${name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`,
      )) ?? ''
    );
  }

  private async textValue(
    dataName: string,
    fallbackPattern: RegExp,
    fallbackSelector?: string,
  ): Promise<string> {
    const explicit = this.root.locator(`[data-${dataName}]`).first();
    if ((await explicit.count()) > 0) return (await explicit.innerText()).trim();
    if (fallbackSelector !== undefined) {
      const selected = this.root.locator(fallbackSelector).first();
      if ((await selected.count()) > 0) return (await selected.innerText()).trim();
    }
    return (await this.root.getByText(fallbackPattern).first().innerText()).trim();
  }
}
