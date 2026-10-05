import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { homeCaseTitle } from '../../test-cases/home/home.test-cases';

test.use({ storageState: '.auth/defaultUser.json' });

test.describe('Home Page - Favorite Mutating Scenarios', () => {
  test(
    homeCaseTitle('TC-HOME-FAVORITE-001'),
    async ({ homePage }) => {
      await homePage.open();

      await expect
        .poll(
          async () => {
            const saleCards = await homePage.getSaleCards();
            if (saleCards.length > 0) return true;
            const rentCards = await homePage.getRentCards();
            return rentCards.length > 0;
          },
          { timeout: 15_000 },
        )
        .toBe(true);

      let cards = await homePage.getSaleCards();
      if (cards.length === 0) {
        cards = await homePage.getRentCards();
      }

      expect(cards.length).toBeGreaterThan(0);
      const targetCard = cards[0];
      if (!targetCard) {
        throw new Error('No listing card found on home page');
      }
      const initialFavorited = await targetCard.isFavorited();
      const targetTitle = await targetCard.title();

      try {
        // Lần 1: Toggle favorite (Thêm nếu chưa, hoặc Bỏ nếu đã có)
        await targetCard.toggleFavorite();
        await expect.poll(async () => targetCard.isFavorited()).toBe(!initialFavorited);

        if (!initialFavorited) {
          // Tải lại trang để khối Tin đăng yêu thích cập nhật dữ liệu từ server
          await homePage.open();
          await expect
            .poll(
              async () => {
                const favoriteCards = await homePage.getFavoriteCards();
                const titles = await Promise.all(favoriteCards.map((c) => c.title()));
                return titles.includes(targetTitle);
              },
              { timeout: 15_000 },
            )
            .toBe(true);
        }

        // Lấy lại thẻ tin sau khi tải lại trang để thực hiện lần 2
        let currentCards = await homePage.getSaleCards();
        if (currentCards.length === 0) {
          currentCards = await homePage.getRentCards();
        }
        const activeTarget = currentCards[0] ?? targetCard;

        // Lần 2: Toggle favorite lại để hoàn nguyên
        await activeTarget.toggleFavorite();
        await expect.poll(async () => activeTarget.isFavorited()).toBe(initialFavorited);

        if (!initialFavorited) {
          // Tải lại trang để khối Tin đăng yêu thích cập nhật
          await homePage.open();
          await expect
            .poll(
              async () => {
                const favoriteCards = await homePage.getFavoriteCards();
                const titles = await Promise.all(favoriteCards.map((c) => c.title()));
                return titles.includes(targetTitle);
              },
              { timeout: 15_000 },
            )
            .toBe(false);
        }
      } finally {
        const finalState = await targetCard.isFavorited().catch(() => initialFavorited);
        if (finalState !== initialFavorited) {
          await targetCard.toggleFavorite().catch(() => null);
        }
      }
    },
  );
});
