import { expect, test } from '../../fixtures/test.fixture';
import { homeCaseTitle } from '../../test-cases/home/home.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Home Page - Filter Scenarios', () => {
  test(
    homeCaseTitle('TC-HOME-FILTER-001') + ' - Mua bán với mốc giá có sẵn',
    async ({ homePage, listingListPage }) => {
      await homePage.open();
      await homePage.selectDemand('sale');
      await homePage.viewAll('sale');

      await expect.poll(() => listingListPage.currentUrl()).toContain('/sales');

      await listingListPage.applyFilters({
        price: { kind: 'preset', label: '2 - 5 tỷ' },
      });

      const count = await listingListPage.resultCount();
      if (count > 0) {
        const summaries = await listingListPage.summaries();
        expect(summaries.length).toBeGreaterThan(0);
        expect(
          summaries.every(
            (item) => item.price !== undefined && item.price >= 2 && item.price <= 5,
          ),
        ).toBe(true);
      } else {
        expect(await listingListPage.emptyMessage()).not.toBe('');
      }
    },
  );

  test(
    homeCaseTitle('TC-HOME-FILTER-001') + ' - Cho thuê với mốc giá có sẵn',
    async ({ homePage, listingListPage }) => {
      await homePage.open();
      await homePage.selectDemand('rent');
      await homePage.viewAll('rent');

      await expect.poll(() => listingListPage.currentUrl()).toContain('/rent');

      await listingListPage.applyFilters({
        price: { kind: 'preset', label: '10 - 20 triệu' },
      });

      const count = await listingListPage.resultCount();
      if (count > 0) {
        const summaries = await listingListPage.summaries();
        expect(summaries.length).toBeGreaterThan(0);
        expect(
          summaries.every(
            (item) => item.price !== undefined && item.price >= 0.01 && item.price <= 0.02,
          ),
        ).toBe(true);
      } else {
        expect(await listingListPage.emptyMessage()).not.toBe('');
      }
    },
  );

  test(
    homeCaseTitle('TC-HOME-FILTER-002'),
    async ({ homePage, listingListPage }) => {
      await homePage.open();
      await homePage.viewAll('sale');

      await expect.poll(() => listingListPage.currentUrl()).toContain('/sales');

      await listingListPage.applyFilters({
        price: { kind: 'custom', from: 1, to: 15 },
        area: { kind: 'custom', from: 30, to: 200 },
      });

      const count = await listingListPage.resultCount();
      if (count > 0) {
        await expect
          .poll(async () => {
            const summaries = await listingListPage.summaries();
            return summaries.length;
          })
          .toBeGreaterThan(0);

        const summaries = await listingListPage.summaries();
        expect(
          summaries.every(
            (item) =>
              item.price !== undefined &&
              item.price >= 1 &&
              item.price <= 15 &&
              item.area >= 30 &&
              item.area <= 200,
          ),
        ).toBe(true);
      } else {
        expect(await listingListPage.emptyMessage()).not.toBe('');
      }
    },
  );
});
