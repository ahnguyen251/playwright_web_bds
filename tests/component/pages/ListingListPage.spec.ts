import { expect, test } from '@playwright/test';

import { ListingListPage } from '../../../pages/listings/ListingListPage';
import { listingCaseTitle } from '../../../test-cases/listings/listing.test-cases';

const publicListingFixture = (): string => `
  <main>
    <label class="sr-only">Tìm kiếm</label>
    <input aria-label="Tìm kiếm" placeholder="Tìm kiếm theo tên, địa chỉ, dự án..." />
    <button type="button" data-search>Tìm kiếm</button>
    <button type="button" data-sort-trigger>Thông thường</button>
    <div role="menu" hidden>
      <button type="button" role="menuitem">Giá tăng dần</button>
      <button type="button" role="menuitem">Giá giảm dần</button>
    </div>
    <section aria-label="Người đăng">
      <button type="button" data-poster="all">Tất cả</button>
      <button type="button" data-poster="owner">Chủ nhà</button>
      <button type="button" data-poster="broker">Môi giới</button>
    </section>
    <fieldset data-range="price">
      <legend>Mức giá</legend>
      <label><input type="radio" name="price" value="all" checked /> Tất cả</label>
      <label><input type="radio" name="price" value="2_5" /> Từ 2 đến 5 tỷ</label>
      <div><input type="radio" name="price" value="custom" /><span>Khác</span></div>
      <label>Từ <input type="number" placeholder="Từ" /></label>
      <label>Đến <input type="number" placeholder="Đến" /></label>
    </fieldset>
    <fieldset data-range="area">
      <legend>Diện tích</legend>
      <label><input type="radio" name="area" value="all" checked /> Tất cả</label>
      <label><input type="radio" name="area" value="50_80" /> Từ 50 đến 80 m²</label>
      <div><input type="radio" name="area" value="custom" /><span>Khác</span></div>
      <label>Từ <input type="number" placeholder="Từ" /></label>
      <label>Đến <input type="number" placeholder="Đến" /></label>
    </fieldset>
    <button type="button" data-reset>Đặt lại bộ lọc</button>
    <p role="status" data-result-count></p>
    <p role="alert" data-filter-validation></p>
    <div data-listing-results>
      <a href="/listings/1" data-listing-card data-poster="owner" data-price="3" data-area="60">
        <h3>Căn hộ trung tâm</h3>
        <p data-listing-address>Phường Bến Nghé, Thành phố Hồ Chí Minh</p>
        <span data-listing-price>3 tỷ</span><span data-listing-area>60 m²</span>
        <span data-listing-bedrooms>2 PN</span><span data-listing-bathrooms>2 WC</span>
        <span data-listing-poster>Chủ nhà</span><button type="button" aria-label="Yêu thích" aria-pressed="false"></button>
      </a>
      <a href="/listings/2" data-listing-card data-poster="broker" data-price="7" data-area="90">
        <h3>Nhà phố rộng</h3>
        <p data-listing-address>Phường Hòa Hưng, Thành phố Hồ Chí Minh</p>
        <span data-listing-price>7 tỷ</span><span data-listing-area>90 m²</span>
        <span data-listing-bedrooms>4 PN</span><span data-listing-bathrooms>3 WC</span>
        <span data-listing-poster>Môi giới</span><button type="button" aria-label="Yêu thích" aria-pressed="false"></button>
      </a>
      <a href="/listings/3" data-listing-card data-poster="broker" data-price="4" data-area="70">
        <h3>Biệt thự ven sông</h3>
        <p data-listing-address>Phường Thảo Điền, Thành phố Hồ Chí Minh</p>
        <span data-listing-price>4 tỷ</span><span data-listing-area>70 m²</span>
        <span data-listing-bedrooms>3 PN</span><span data-listing-bathrooms>3 WC</span>
        <span data-listing-poster>Môi giới</span><button type="button" aria-label="Yêu thích" aria-pressed="false"></button>
      </a>
    </div>
    <p data-empty hidden>Không có bất động sản phù hợp</p>
    <button type="button" aria-label="Trang trước">Trước</button>
    <span data-page>1</span>
    <button type="button" aria-label="Trang tiếp theo">Tiếp</button>
  </main>
  <footer>
    <a href="/listings/99"><h3>Tin nổi bật ở chân trang</h3></a>
  </footer>
  <script>
    const cards = [...document.querySelectorAll('[data-listing-card]')];
    const priceGroup = document.querySelector('[data-range="price"]');
    const areaGroup = document.querySelector('[data-range="area"]');
    let poster = 'all';
    let pageNumber = 1;
    const pageSize = 2;
    const numberInput = (group, placeholder) => group.querySelector('input[placeholder="' + placeholder + '"]');
    const selectedRange = (group) => group.querySelector('input[type="radio"]:checked').value;
    const customRange = (group) => ({
      from: Number(numberInput(group, 'Từ').value || 0),
      to: Number(numberInput(group, 'Đến').value || Number.POSITIVE_INFINITY),
    });
    const inRange = (value, selected, custom) => {
      if (selected === 'all') return true;
      if (selected === '2_5') return value >= 2 && value <= 5;
      if (selected === '50_80') return value >= 50 && value <= 80;
      return value >= custom.from && value <= custom.to;
    };
    const render = () => {
      const keyword = document.querySelector('[aria-label="Tìm kiếm"]').value.toLowerCase();
      const price = customRange(priceGroup);
      const area = customRange(areaGroup);
      const invalidPrice = selectedRange(priceGroup) === 'custom' && price.from > price.to;
      const invalidArea = selectedRange(areaGroup) === 'custom' && area.from > area.to;
      document.querySelector('[data-filter-validation]').textContent = invalidPrice
        ? 'Giá Từ phải nhỏ hơn hoặc bằng giá Đến'
        : invalidArea ? 'Diện tích Từ phải nhỏ hơn hoặc bằng diện tích Đến' : '';
      const matching = cards.filter((card) =>
        !invalidPrice && !invalidArea &&
        (poster === 'all' || card.dataset.poster === poster) &&
        card.textContent.toLowerCase().includes(keyword) &&
        inRange(Number(card.dataset.price), selectedRange(priceGroup), price) &&
        inRange(Number(card.dataset.area), selectedRange(areaGroup), area));
      const start = (pageNumber - 1) * pageSize;
      cards.forEach((card) => card.hidden = !matching.slice(start, start + pageSize).includes(card));
      document.querySelector('[data-result-count]').textContent = 'Hiện có ' + matching.length + ' bất động sản.';
      document.querySelector('[data-empty]').hidden = matching.length > 0;
      document.querySelector('[data-page]').textContent = String(pageNumber);
    };
    document.querySelector('[data-search]').addEventListener('click', () => { pageNumber = 1; render(); });
    document.querySelectorAll('[data-poster]').forEach((button) => button.addEventListener('click', () => { poster = button.dataset.poster; pageNumber = 1; render(); }));
    document.querySelectorAll('input[type="radio"]').forEach((input) => input.addEventListener('change', render));
    document.querySelectorAll('input[type="number"]').forEach((input) => input.addEventListener('input', () => { if (Number(input.value) <= 0) input.value = '0'; render(); }));
    document.querySelector('[data-reset]').addEventListener('click', () => {
      poster = 'all'; pageNumber = 1; document.querySelector('[aria-label="Tìm kiếm"]').value = '';
      priceGroup.querySelector('[value="all"]').checked = true; areaGroup.querySelector('[value="all"]').checked = true;
      document.querySelectorAll('input[type="number"]').forEach((input) => input.value = ''); render();
    });
    document.querySelector('[data-sort-trigger]').addEventListener('click', () => document.querySelector('[role="menu"]').hidden = false);
    document.querySelectorAll('[role="menuitem"]').forEach((button) => button.addEventListener('click', () => {
      cards.sort((left, right) => Number(left.dataset.price) - Number(right.dataset.price));
      if (button.textContent.includes('giảm')) cards.reverse();
      cards.forEach((card) => document.querySelector('[data-listing-results]').append(card));
      document.querySelector('[data-sort-trigger]').textContent = button.textContent; render();
    }));
    document.querySelector('[aria-label="Trang tiếp theo"]').addEventListener('click', () => { pageNumber += 1; render(); });
    document.querySelector('[aria-label="Trang trước"]').addEventListener('click', () => { pageNumber = Math.max(1, pageNumber - 1); render(); });
    render();
  </script>
`;

test('trả về bản tóm tắt đã chuẩn hóa từ thẻ tin', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  expect((await listPage.summaries())[0]).toEqual({
    id: '1',
    title: 'Căn hộ trung tâm',
    address: 'Phường Bến Nghé, Thành phố Hồ Chí Minh',
    price: 3,
    priceText: '3 tỷ',
    area: 60,
    bedrooms: 2,
    bathrooms: 2,
    poster: 'owner',
  });
});

test('kết hợp bộ lọc người đăng, giá và diện tích tùy chỉnh', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.applyFilters({
    poster: 'owner',
    price: { kind: 'custom', from: 2, to: 5 },
    area: { kind: 'custom', from: 50, to: 80 },
  });

  expect(await listPage.resultCount()).toBe(1);
  expect((await listPage.summaries()).map(({ poster }) => poster)).toEqual(['owner']);
});

test(listingCaseTitle('TC-LIST-FILTER-001') + ' - Môi giới', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.applyFilters({ poster: 'broker' });

  expect(await listPage.resultCount()).toBe(2);
  expect((await listPage.summaries()).map(({ poster }) => poster)).toEqual(['broker', 'broker']);
});

test(listingCaseTitle('TC-LIST-FILTER-001') + ' - Khoảng giá', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.applyFilters({ price: { kind: 'preset', label: 'Từ 2 đến 5 tỷ' } });

  expect((await listPage.summaries()).map(({ price }) => price)).toEqual([3, 4]);
});

test(listingCaseTitle('TC-LIST-FILTER-001') + ' - Diện tích', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.applyFilters({ area: { kind: 'preset', label: 'Từ 50 đến 80 m²' } });

  expect((await listPage.summaries()).map(({ area }) => area)).toEqual([60, 70]);
});

test(listingCaseTitle('TC-LIST-FILTER-001') + ' - Số lượng', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.applyFilters({ poster: 'broker' });

  const summaries = await listPage.summaries();
  expect(await listPage.resultCount()).toBe(summaries.length);
});

test('chuẩn hóa giá trị khoảng nhỏ hơn hoặc bằng không thành không', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.applyFilters({ price: { kind: 'custom', from: -1, to: 5 } });

  expect(await listPage.normalizedRangeValue('priceFrom')).toBe(0);
});

test('hiển thị validation cho khoảng giá và diện tích bị đảo', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.applyFilters({ price: { kind: 'custom', from: 10, to: 2 } });
  expect(await listPage.validationMessage()).toContain('Giá Từ');

  await listPage.resetFilters();
  await listPage.applyFilters({ area: { kind: 'custom', from: 100, to: 30 } });
  expect(await listPage.validationMessage()).toContain('Diện tích Từ');
});

test('tìm kiếm không có kết quả và đặt lại bộ lọc', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.search({ keyword: 'không-tồn-tại' });
  expect(await listPage.resultCount()).toBe(0);
  expect(await listPage.emptyMessage()).toContain('Không có');

  await listPage.resetFilters();
  expect(await listPage.resultCount()).toBe(3);
});

test('sắp xếp và chuyển trang mà không làm lộ locator ra test', async ({ page }) => {
  await page.setContent(publicListingFixture());
  const listPage = new ListingListPage(page);

  await listPage.sort('Giá tăng dần');
  expect((await listPage.summaries()).map(({ price }) => price)).toEqual([3, 4]);

  await listPage.nextPage();
  expect((await listPage.summaries()).map(({ price }) => price)).toEqual([7]);

  await listPage.previousPage();
  expect((await listPage.summaries()).map(({ price }) => price)).toEqual([3, 4]);
});
