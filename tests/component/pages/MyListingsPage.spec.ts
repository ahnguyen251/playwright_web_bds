import { expect, test } from '@playwright/test';

import { MyListingsPage } from '../../../pages/listings/MyListingsPage';
import type { ListingStatus } from '../../../types/listing.types';

const myListingsFixture = ({ status = 'Đang đăng' }: { status?: ListingStatus } = {}): string => `
  <main>
    <input placeholder="Nhập giá trị tìm kiếm..." />
    <label>Loại tin
      <select data-filter-type><option value="all">Loại tin: Tất cả</option><option value="sale">Mua bán</option><option value="rent">Cho thuê</option></select>
    </label>
    <label>Trạng thái
      <select data-filter-status><option value="all">Tất cả trạng thái</option><option value="Đang đăng">Đang đăng</option><option value="Chờ duyệt">Chờ duyệt</option><option value="Đã gỡ">Đã gỡ</option></select>
    </label>
    <table>
      <tbody>
        <tr data-listing-row data-id="91" data-title="Controlled published listing" data-transaction="sale">
          <td data-listing-id>91</td><td data-listing-title>Controlled published listing</td>
          <td data-listing-price>3 tỷ</td><td data-listing-area>60 m²</td>
          <td data-listing-status>${status}</td>
          <td><button type="button" aria-label="Thao tác cho Controlled published listing">Thao tác</button></td>
        </tr>
        <tr data-listing-row data-id="92" data-title="Controlled rental listing" data-transaction="rent">
          <td data-listing-id>92</td><td data-listing-title>Controlled rental listing</td>
          <td data-listing-price>15 triệu</td><td data-listing-area>70 m²</td>
          <td data-listing-status>Chờ duyệt</td>
          <td><button type="button" aria-label="Thao tác cho Controlled rental listing">Thao tác</button></td>
        </tr>
        <tr data-listing-row data-id="93" data-title="Controlled second page" data-transaction="sale">
          <td data-listing-id>93</td><td data-listing-title>Controlled second page</td>
          <td data-listing-price>5 tỷ</td><td data-listing-area>80 m²</td>
          <td data-listing-status>Đang đăng</td>
          <td><button type="button" aria-label="Thao tác cho Controlled second page">Thao tác</button></td>
        </tr>
      </tbody>
    </table>
    <div role="menu" hidden>
      <button type="button">Chỉnh sửa</button><button type="button">Gỡ tin đăng</button>
    </div>
    <div role="dialog" aria-label="Xác nhận gỡ tin" hidden>
      <p>Bạn có chắc chắn muốn gỡ tin?</p>
      <button type="button">Hủy</button><button type="button">Xác nhận</button>
    </div>
    <p data-empty hidden>Không có tin đăng</p>
    <p role="status"></p>
    <button type="button" aria-label="Trang trước">Trước</button>
    <span data-page>1</span>
    <button type="button" aria-label="Trang tiếp theo">Tiếp</button>
  </main>
  <script>
    const rows = [...document.querySelectorAll('[data-listing-row]')];
    const menu = document.querySelector('[role="menu"]');
    const dialog = document.querySelector('[role="dialog"]');
    const feedback = document.querySelector('[role="status"]');
    const keyword = document.querySelector('[placeholder="Nhập giá trị tìm kiếm..."]');
    const typeFilter = document.querySelector('[data-filter-type]');
    const statusFilter = document.querySelector('[data-filter-status]');
    let activeRow;
    let pageNumber = 1;
    const render = () => {
      const matches = rows.filter((row) =>
        row.dataset.title.toLowerCase().includes(keyword.value.toLowerCase()) &&
        (typeFilter.value === 'all' || row.dataset.transaction === typeFilter.value) &&
        (statusFilter.value === 'all' || row.querySelector('[data-listing-status]').textContent === statusFilter.value));
      const visible = matches.slice((pageNumber - 1) * 2, pageNumber * 2);
      rows.forEach((row) => row.hidden = !visible.includes(row));
      document.querySelector('[data-empty]').hidden = matches.length > 0;
      document.querySelector('[data-page]').textContent = String(pageNumber);
    };
    rows.forEach((row) => row.querySelector('[aria-label^="Thao tác"]').addEventListener('click', () => {
      activeRow = row;
      if (row.querySelector('[data-listing-status]').textContent !== 'Đang đăng') {
        feedback.textContent = 'Không cho phép gỡ'; menu.hidden = true; return;
      }
      menu.hidden = false;
    }));
    menu.querySelector('button:nth-child(1)').addEventListener('click', () => history.pushState({}, '', '#/listings/' + activeRow.dataset.id + '/edit'));
    menu.querySelector('button:nth-child(2)').addEventListener('click', () => { menu.hidden = true; dialog.hidden = false; });
    dialog.querySelector('button:nth-of-type(1)').addEventListener('click', () => { dialog.hidden = true; });
    dialog.querySelector('button:nth-of-type(2)').addEventListener('click', () => {
      activeRow.querySelector('[data-listing-status]').textContent = 'Đã gỡ';
      dialog.hidden = true; feedback.textContent = 'Gỡ tin thành công'; render();
    });
    keyword.addEventListener('input', () => { pageNumber = 1; render(); });
    typeFilter.addEventListener('change', () => { pageNumber = 1; render(); });
    statusFilter.addEventListener('change', () => { pageNumber = 1; render(); });
    document.querySelector('[aria-label="Trang tiếp theo"]').addEventListener('click', () => { pageNumber += 1; render(); });
    document.querySelector('[aria-label="Trang trước"]').addEventListener('click', () => { pageNumber = Math.max(1, pageNumber - 1); render(); });
    render();
  </script>
`;

test('hủy gỡ tin mà không thay đổi trạng thái', async ({ page }) => {
  await page.setContent(myListingsFixture({ status: 'Đang đăng' }));
  const myListings = new MyListingsPage(page);
  const reference = { id: '91', title: 'Controlled published listing' };

  await myListings.requestWithdraw(reference);
  await myListings.cancelWithdraw();

  expect(await myListings.statusOf(reference)).toBe('Đang đăng');
});

test('xác nhận gỡ chỉ đổi trạng thái và không xóa bản ghi', async ({ page }) => {
  await page.setContent(myListingsFixture({ status: 'Đang đăng' }));
  const myListings = new MyListingsPage(page);
  const reference = { id: '91', title: 'Controlled published listing' };

  await myListings.requestWithdraw(reference);
  await myListings.confirmWithdraw();

  expect(await myListings.statusOf(reference)).toBe('Đã gỡ');
  expect(await myListings.feedback()).toContain('thành công');
});

test('hiển thị từ chối khi tin không ở trạng thái Đang đăng', async ({ page }) => {
  await page.setContent(myListingsFixture({ status: 'Chờ duyệt' }));
  const myListings = new MyListingsPage(page);

  await myListings.requestWithdraw({ id: '91', title: 'Controlled published listing' });

  expect(await myListings.feedback()).toBe('Không cho phép gỡ');
});

test('tìm kiếm, lọc và hiển thị trạng thái rỗng', async ({ page }) => {
  await page.setContent(myListingsFixture());
  const myListings = new MyListingsPage(page);

  await myListings.search('Controlled rental');
  await myListings.filter('rent', 'Chờ duyệt');
  expect((await myListings.summaries()).map(({ id }) => id)).toEqual(['92']);

  await myListings.search('không-tồn-tại');
  expect(await myListings.emptyMessage()).toBe('Không có tin đăng');
});

test('chuyển trang tiếp theo và quay lại', async ({ page }) => {
  await page.setContent(myListingsFixture());
  const myListings = new MyListingsPage(page);

  expect((await myListings.summaries()).map(({ id }) => id)).toEqual(['91', '92']);
  await myListings.nextPage();
  expect((await myListings.summaries()).map(({ id }) => id)).toEqual(['93']);
  await myListings.previousPage();
  expect((await myListings.summaries()).map(({ id }) => id)).toEqual(['91', '92']);
});

test('mở đúng trang chỉnh sửa bằng cả mã và tiêu đề tin', async ({ page }) => {
  await page.setContent(myListingsFixture());
  const myListings = new MyListingsPage(page);

  await myListings.openEdit({ id: '91', title: 'Controlled published listing' });

  expect(myListings.currentUrl()).toContain('/listings/91/edit');
});
