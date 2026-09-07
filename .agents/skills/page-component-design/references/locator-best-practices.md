# Locator & Component Best Practices for Propify

## 1. Page Object Skeleton

Every page class must inherit from `BasePage`:

```typescript
import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { ROUTES } from '../../constants/routes';

export class ListingDetailPage extends BasePage {
  private readonly titleHeading: Locator;
  private readonly contactButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.titleHeading = page.getByRole('heading', { level: 1 });
    this.contactButton = page.getByRole('button', { name: 'Liên hệ người bán', exact: true });
  }

  public async open(listingId: string): Promise<void> {
    await this.navigate(`${ROUTES.listings}/${listingId}`);
  }

  public async contactSeller(): Promise<void> {
    await this.contactButton.waitFor({ state: 'visible' });
    await this.contactButton.click();
  }

  public async getTitle(): Promise<string> {
    return (await this.titleHeading.textContent()) ?? '';
  }
}
```

## 2. Shared UI Components

If an element belongs to a cross-page component (e.g. Header, Sidebar, Filter Bar):
- Create a dedicated component under `pages/components/` (e.g. `HeaderComponent.ts`).
- Accept `Page` or container `Locator` in constructor.
- Instantiate or reuse in relevant Page Objects.

## 3. Strict Mode & Scoping

- Always scope child locators when multiple elements match:
  `this.dialog.getByRole('button', { name: 'Đồng ý' })`
- If handling lists:
  `this.listingCards = page.locator('article.listing-card')`
  `this.getCardAt(index: number) => this.listingCards.nth(index)`
- Avoid styling classes like Tailwind flex/grid in locators whenever role or text is available.
