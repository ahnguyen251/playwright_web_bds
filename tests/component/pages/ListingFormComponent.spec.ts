import { expect, test } from '@playwright/test';

import { ListingFormComponent } from '../../../pages/components/ListingFormComponent';
import { CreateListingPage } from '../../../pages/listings/CreateListingPage';
import { EditListingPage } from '../../../pages/listings/EditListingPage';
import { ListingDataFactory } from '../../../test-data/factories/ListingDataFactory';

const listingFormFixture = (submitLabel: 'Đăng tin' | 'Cập nhật'): string => `
  <form>
    <label>Loại giao dịch
      <select><option value="sale">Mua bán</option><option value="rent">Cho thuê</option></select>
    </label>
    <label>Loại bất động sản
      <select><option>Căn hộ chung cư</option><option>Nhà riêng</option></select>
    </label>
    <label>Tên bất động sản <input maxlength="120" /></label>
    <label>Mô tả <textarea maxlength="5000"></textarea></label>
    <label>Giá <input type="number" /></label>
    <label><input type="checkbox" /> Thỏa thuận</label>
    <label>Diện tích <input type="number" /></label>
    <label>Tỉnh/Thành phố
      <select><option>Thành phố Hồ Chí Minh</option><option>Hà Nội</option></select>
    </label>
    <label>Phường/Xã
      <select><option>Phường Bến Nghé</option><option>Phường Bến Thành</option></select>
    </label>
    <label>Đường <input /></label>
    <label>Địa chỉ chi tiết <input /></label>
    <label>Phòng ngủ <input type="number" /></label>
    <label>Phòng tắm <input type="number" /></label>
    <label>Vai trò liên hệ
      <select><option value="owner">Chủ nhà</option><option value="broker">Môi giới</option></select>
    </label>
    <label>Họ và tên <input /></label>
    <label>Số điện thoại <input /></label>
    <label>Email liên hệ <input type="email" /></label>
    <label>Hình ảnh <input type="file" accept="image/*" multiple /></label>
    <label>Video <input type="file" accept="video/*" /></label>
    <section id="media-preview">
      <article data-media-name="property-old.png" data-listing-image-preview>
        <span>property-old.png</span><button type="button" aria-label="Xóa property-old.png">Xóa</button>
      </article>
    </section>
    <button type="submit">${submitLabel}</button>
  </form>
  <div role="status"></div>
  <script>
    const form = document.querySelector('form');
    const preview = document.querySelector('#media-preview');
    const imageInput = document.querySelector('input[accept="image/*"]');
    const videoInput = document.querySelector('input[accept="video/*"]');
    imageInput.addEventListener('change', () => {
      [...imageInput.files].forEach((file) => {
        const item = document.createElement('article');
        item.dataset.mediaName = file.name;
        item.dataset.listingImagePreview = '';
        item.textContent = file.name;
        preview.append(item);
      });
    });
    videoInput.addEventListener('change', () => {
      const item = document.createElement('article');
      item.dataset.mediaName = videoInput.files[0].name;
      item.dataset.listingVideoPreview = '';
      item.textContent = videoInput.files[0].name;
      preview.append(item);
    });
    preview.addEventListener('click', (event) => {
      if (event.target.matches('button')) event.target.closest('article').remove();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      document.querySelector('[role="status"]').textContent =
        '${submitLabel}' === 'Đăng tin' ? 'Đăng tin thành công - Chờ duyệt' : 'Cập nhật thành công - Chờ duyệt';
    });
  </script>
`;

const invalidListingFormFixture = (): string => `
  <form>
    <label>Tên bất động sản <input /><span role="alert" data-field-error="title">Tên bất động sản là bắt buộc</span></label>
    <label>Mô tả <textarea></textarea></label>
    <label>Giá <input /></label>
    <label>Diện tích <input /></label>
    <label>Đường <input /></label>
    <label>Địa chỉ chi tiết <input /></label>
    <label>Họ và tên <input /></label>
    <label>Số điện thoại <input /></label>
    <label>Email liên hệ <input /></label>
    <label>Hình ảnh <input type="file" /></label>
    <label>Video <input type="file" /></label>
    <span role="alert" data-media-error>Định dạng media không hợp lệ</span>
    <button type="submit">Đăng tin</button>
  </form>
`;

test('điền biểu mẫu tin đăng Propify hiện tại và tải media', async ({ page }) => {
  await page.setContent(listingFormFixture('Đăng tin'));
  const form = new ListingFormComponent(page);
  const data = ListingDataFactory.create({
    media: {
      imagePaths: ['listing-images/property.png'],
      videoPath: 'listing-videos/property.mp4',
    },
  });

  await form.fill(data);
  await form.uploadMedia(data.media);

  expect(await form.currentValues()).toMatchObject({
    title: data.title,
    description: data.description,
    price: data.price,
    area: data.area,
    contactName: data.contact.fullName,
    imageCount: 2,
    hasVideo: true,
  });
});

test('trả về thông báo validation của trường và media', async ({ page }) => {
  await page.setContent(invalidListingFormFixture());
  const form = new ListingFormComponent(page);

  expect(await form.fieldError('title')).toBe('Tên bất động sản là bắt buộc');
  expect(await form.mediaError()).toContain('Định dạng');
});

test('cho phép điền trực tiếp giá trị không hợp lệ để kiểm thử validation giao diện', async ({
  page,
}) => {
  await page.setContent(invalidListingFormFixture());
  const form = new ListingFormComponent(page);

  await form.fillField('area', '-1');

  expect((await form.currentValues()).area).toBe(-1);
});

test('xóa đúng media theo tên và giữ nguyên media còn lại', async ({ page }) => {
  await page.setContent(listingFormFixture('Cập nhật'));
  const form = new ListingFormComponent(page);

  await form.removeMedia('property-old.png');

  expect((await form.currentValues()).imageCount).toBe(0);
});

test('trang tạo tin dùng nhãn Đăng tin và trả về trạng thái Chờ duyệt', async ({ page }) => {
  await page.setContent(listingFormFixture('Đăng tin'));
  const createPage = new CreateListingPage(page);

  await createPage.submit(ListingDataFactory.create({ media: { imagePaths: [] } }));

  expect(await createPage.successMessage()).toContain('thành công');
  expect(await createPage.status()).toBe('Chờ duyệt');
});

test('trang chỉnh sửa dùng nhãn Cập nhật và trả về trạng thái Chờ duyệt', async ({ page }) => {
  await page.setContent(listingFormFixture('Cập nhật'));
  const editPage = new EditListingPage(page);

  await editPage.update(ListingDataFactory.create({ media: { imagePaths: [] } }));

  expect(await editPage.successMessage()).toContain('thành công');
  expect(await editPage.status()).toBe('Chờ duyệt');
});
