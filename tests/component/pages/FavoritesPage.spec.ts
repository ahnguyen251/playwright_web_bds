import { expect, test } from '@playwright/test';

import { FavoritesPage } from '../../../pages/listings/FavoritesPage';

const favoritesFixture = (mode: 'success' | 'failure' | 'unauthenticated' = 'success'): string => `
  <main>
    <a href="/listings/48" data-listing-card data-mode="${mode}">
      <h3>Controlled listing</h3>
      <p data-listing-address>Phường Bến Nghé, Thành phố Hồ Chí Minh</p>
      <span data-listing-price>3 tỷ</span><span data-listing-area>60 m²</span>
      <span data-listing-bedrooms>2 PN</span><span data-listing-bathrooms>2 WC</span>
      <span data-listing-poster>Chủ nhà</span>
      <button type="button" aria-label="Bỏ yêu thích" aria-pressed="true"></button>
    </a>
    <p role="status"></p>
    <div role="dialog" aria-label="Đăng nhập" hidden>Vui lòng đăng nhập để yêu thích tin</div>
  </main>
  <script>
    const card = document.querySelector('[data-listing-card]');
    const favorite = card.querySelector('button');
    const feedback = document.querySelector('[role="status"]');
    favorite.addEventListener('click', (event) => {
      event.preventDefault();
      if (card.dataset.mode === 'failure') {
        feedback.textContent = 'Không thể cập nhật yêu thích, vui lòng thử lại';
        return;
      }
      if (card.dataset.mode === 'unauthenticated') {
        document.querySelector('[role="dialog"]').hidden = false;
        feedback.textContent = 'Vui lòng đăng nhập';
        return;
      }
      card.remove();
      feedback.textContent = 'Đã bỏ yêu thích thành công';
    });
  </script>
`;

test('quan sát trạng thái biểu tượng và danh sách khi bỏ yêu thích', async ({ page }) => {
  await page.setContent(favoritesFixture());
  const favorites = new FavoritesPage(page);

  expect(await favorites.contains('Controlled listing')).toBe(true);
  expect(await favorites.summaryByTitle('Controlled listing')).toMatchObject({ id: '48' });

  await favorites.toggleByTitle('Controlled listing');

  expect(await favorites.contains('Controlled listing')).toBe(false);
  expect(await favorites.feedback()).toContain('thành công');
});

test('giữ danh sách nhất quán khi yêu cầu yêu thích thất bại', async ({ page }) => {
  await page.setContent(favoritesFixture('failure'));
  const favorites = new FavoritesPage(page);

  await favorites.toggleByTitle('Controlled listing');

  expect(await favorites.contains('Controlled listing')).toBe(true);
  expect(await favorites.feedback()).toContain('thử lại');
});

test('không thay đổi yêu thích khi khách chưa đăng nhập', async ({ page }) => {
  await page.setContent(favoritesFixture('unauthenticated'));
  const favorites = new FavoritesPage(page);

  await favorites.toggleByTitle('Controlled listing');

  expect(await favorites.contains('Controlled listing')).toBe(true);
  expect(await favorites.feedback()).toContain('đăng nhập');
});
