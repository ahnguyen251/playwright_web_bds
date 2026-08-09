import { expect, test } from '@playwright/test';

import { ListingDetailPage } from '../../../pages/listings/ListingDetailPage';

const approvedListingDetailFixture = (): string => `
  <main data-listing-detail>
    <h1>Controlled approved listing</h1>
    <span data-view-count>12 lượt xem</span>
    <button type="button" aria-label="Yêu thích" aria-pressed="false">Yêu thích</button>
    <section data-listing-media><img alt="Listing image" src="property.png" /></section>
    <section data-listing-description><h2>Mô tả tin đăng</h2><p>Controlled description</p></section>
    <section data-listing-amenities><h2>Tiện ích</h2><span data-amenity>Bể bơi</span></section>
    <section data-listing-contact>
      <p>Thông tin của bất động sản</p>
      <div><p data-listing-contact-name>Controlled owner</p><p>Chủ nhà</p></div>
    </section>
    <section data-related-listings>
      <h2>Tin đăng liên quan</h2>
      <a href="/listings/2"><h3>Related listing</h3></a>
    </section>
  </main>
  <script>
    const favorite = document.querySelector('[aria-label="Yêu thích"]');
    favorite.addEventListener('click', () => {
      const selected = favorite.getAttribute('aria-pressed') !== 'true';
      favorite.setAttribute('aria-pressed', String(selected));
      favorite.setAttribute('aria-label', selected ? 'Bỏ yêu thích' : 'Yêu thích');
    });
  </script>
`;

const nonApprovedNoMediaFixture = (): string => `
  <main data-listing-detail hidden><h1>Tin chưa duyệt</h1></main>
  <img data-default-listing-image alt="Ảnh mặc định" src="default-listing.svg" />
  <p role="alert">Tin đăng chưa được duyệt</p>
`;

test('trả về đầy đủ các phần bắt buộc của tin đã duyệt', async ({ page }) => {
  await page.setContent(approvedListingDetailFixture());
  const detail = new ListingDetailPage(page);

  expect(await detail.snapshot()).toMatchObject({
    title: 'Controlled approved listing',
    description: 'Controlled description',
    contactName: 'Controlled owner',
    amenities: ['Bể bơi'],
    mediaCount: 1,
    usesDefaultImage: false,
    relatedTitles: ['Related listing'],
    viewCountText: '12 lượt xem',
  });
});

test('nhận biết media mặc định và nội dung chưa duyệt bị ẩn', async ({ page }) => {
  await page.setContent(nonApprovedNoMediaFixture());
  const detail = new ListingDetailPage(page);

  expect(await detail.isContentVisible()).toBe(false);
  expect(await detail.hasDefaultImage()).toBe(true);
});

test('trả về thông báo khi tin không tồn tại', async ({ page }) => {
  await page.setContent('<main><p role="alert">Không tìm thấy tin đăng</p></main>');
  const detail = new ListingDetailPage(page);

  expect(await detail.notFoundMessage()).toBe('Không tìm thấy tin đăng');
});

test('quan sát và thay đổi trạng thái yêu thích trong fixture xác định', async ({ page }) => {
  await page.setContent(approvedListingDetailFixture());
  const detail = new ListingDetailPage(page);

  expect(await detail.favoriteState()).toBe(false);
  await detail.toggleFavorite();
  expect(await detail.favoriteState()).toBe(true);
});
