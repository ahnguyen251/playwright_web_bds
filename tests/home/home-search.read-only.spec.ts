import { expect, test } from '../../fixtures/test.fixture';
import { homeCaseTitle } from '../../test-cases/home/home.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Home Page - Search Scenarios', () => {
  test(
    homeCaseTitle('TC-HOME-SEARCH-001') + ' - Nhu cầu Mua bán',
    async ({ homePage, listingListPage }) => {
      await homePage.open();
      await homePage.search('Hà Nội', 'sale');

      expect(listingListPage.currentUrl()).toContain('/sales');
      await expect.poll(async () => listingListPage.resultCount()).toBeGreaterThan(0);

      const summaries = await listingListPage.summaries();
      expect(summaries.length).toBeGreaterThan(0);
      expect(
        summaries.some(
          (item) =>
            item.address.toLowerCase().includes('hà nội') ||
            item.title.toLowerCase().includes('hà nội'),
        ),
      ).toBe(true);
    },
  );

  test(
    homeCaseTitle('TC-HOME-SEARCH-001') + ' - Nhu cầu Cho thuê',
    async ({ homePage, listingListPage }) => {
      await homePage.open();
      await homePage.search('Hồ Chí Minh', 'rent');

      expect(listingListPage.currentUrl()).toContain('/rent');
      await expect.poll(async () => listingListPage.resultCount()).toBeGreaterThan(0);

      const summaries = await listingListPage.summaries();
      expect(summaries.length).toBeGreaterThan(0);
    },
  );
});
