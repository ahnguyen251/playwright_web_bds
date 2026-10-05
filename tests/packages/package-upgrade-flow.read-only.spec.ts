import { expect, test } from '../../fixtures/test.fixture';
import { packageCaseTitle } from '../../test-cases/packages/package.test-cases';

interface MyListingsApiResponse {
  data?: Record<string, unknown>[];
  [key: string]: unknown;
}

test.use({ storageState: '.auth/defaultUser.json' });

test.describe('Package Upgrade Flow - Read-Only / UI Scenarios', () => {
  test(
    packageCaseTitle('TC-PKG-UPGRADE-003'),
    async ({ myListingsPage, packageUpgradeModal, page }) => {
      // Mô phỏng tin đăng sở hữu gói VIP Kim Cương (Cấp 4) để kiểm tra quy tắc chặn hạ cấp
      await page.route('**/api/v1/listings/my*', async (route) => {
        const response = await route.fetch();
        const json = (await response.json()) as MyListingsApiResponse;
        if (Array.isArray(json.data) && json.data.length > 0) {
          json.data[0] = {
            ...json.data[0],
            status: 'ACTIVE',
            package: {
              id: 4,
              name: 'Diamond',
              slug: 'diamond',
              priority: 4,
              badge: 'Diamond',
            },
          };
        }
        await route.fulfill({ json });
      });

      await myListingsPage.open();

      // Mở modal nâng cấp gói từ tin đăng đầu tiên qua Page Object
      await myListingsPage.openPackageUpgradeByIndex(0);

      // Kiểm tra modal nâng cấp đã mở
      await expect.poll(async () => packageUpgradeModal.isVisible()).toBe(true);

      // Verify các gói có Cấp ưu tiên thấp hơn (Ruby - 3, Gold/Vàng - 2) bị chặn hạ cấp
      await expect
        .poll(async () => packageUpgradeModal.isDowngradeBlocked('ruby'), { timeout: 10_000 })
        .toBe(true);

      await expect
        .poll(async () => packageUpgradeModal.isDowngradeBlocked('gold'), { timeout: 10_000 })
        .toBe(true);

      // Verify gói Diamond (gói hiện tại) hiển thị nhãn Gia hạn thay vì Nâng cấp
      const diamondBtnText = await packageUpgradeModal.getUpgradeButtonText('diamond');
      expect(diamondBtnText).toContain('Gia hạn');

      // Đóng modal
      await packageUpgradeModal.close();
      await expect.poll(async () => packageUpgradeModal.isVisible()).toBe(false);
    },
  );

  test(
    packageCaseTitle('TC-PKG-UPGRADE-004'),
    async ({ myListingsPage, packageUpgradeModal }) => {
      await myListingsPage.open();

      // Mở modal nâng cấp gói cho tin đăng đang hoạt động
      await myListingsPage.openPackageUpgradeForStatus('Đang đăng');
      await expect.poll(async () => packageUpgradeModal.isVisible()).toBe(true);

      // 1. Chọn gói Ruby mốc 3 ngày
      await packageUpgradeModal.selectDuration('ruby', '3 ngày');
      expect(await packageUpgradeModal.isDurationActive('ruby', '3 ngày')).toBe(true);
      expect(await packageUpgradeModal.isUpgradeButtonEnabled('ruby')).toBe(true);

      // Chuyển sang bước xác nhận thanh toán
      await packageUpgradeModal.clickUpgrade('ruby');
      await expect.poll(async () => packageUpgradeModal.isConfirmVisible()).toBe(true);
      expect(await packageUpgradeModal.confirmTitleText()).toBe('Xác nhận thanh toán');

      const message3Days = await packageUpgradeModal.confirmMessageText();
      expect(message3Days).toContain('Ruby');
      expect(message3Days).toContain('3 ngày');
      expect(message3Days).toContain('360.000đ');

      // Case 1: Nhấn "Hủy" tại màn xác nhận -> đóng màn xác nhận, quay lại lưới gói mà không thanh toán
      await packageUpgradeModal.cancelConfirmation();
      await expect.poll(async () => packageUpgradeModal.isConfirmVisible()).toBe(false);
      expect(await packageUpgradeModal.isGridVisible()).toBe(true);

      // Case 2: Đổi sang mốc thời hạn khác (5 ngày) -> số tiền cập nhật chính xác (600.000đ)
      await packageUpgradeModal.selectDuration('ruby', '5 ngày');
      expect(await packageUpgradeModal.isDurationActive('ruby', '5 ngày')).toBe(true);

      await packageUpgradeModal.clickUpgrade('ruby');
      await expect.poll(async () => packageUpgradeModal.isConfirmVisible()).toBe(true);

      const message5Days = await packageUpgradeModal.confirmMessageText();
      expect(message5Days).toContain('Ruby');
      expect(message5Days).toContain('5 ngày');
      expect(message5Days).toContain('600.000đ');

      // Đóng modal sau khi kiểm tra xong
      await packageUpgradeModal.cancelConfirmation();
      await packageUpgradeModal.close();
    },
  );

  test(
    packageCaseTitle('TC-PKG-UPGRADE-005'),
    async ({ myListingsPage, vnpayResultPage }) => {
      // Giả lập redirect từ cổng VNPAY Sandbox với kết quả thất bại hoặc hủy (status=failed)
      await vnpayResultPage.open('failed', 'PFY_TEST_FAILED_TXN');

      // Xác minh màn hình kết quả VNPAY hiển thị lỗi
      await expect.poll(async () => vnpayResultPage.isFailed()).toBe(true);
      expect(await vnpayResultPage.headingText()).toBe('Thanh toán chưa thành công');
      expect(await vnpayResultPage.redirectNoticeText()).toContain(
        'Đang chuyển về trang quản lý tin đăng...',
      );

      // Hệ thống tự động chuyển tiếp về trang quản lý tin đăng sau 800ms
      await vnpayResultPage.waitForRedirectToListings();

      // Xác minh Toast thông báo lỗi hiển thị trên trang Quản lý tin đăng
      await expect
        .poll(async () => myListingsPage.feedback(), { timeout: 15_000 })
        .toContain('Thanh toán chưa thành công. Gói tin chưa được nâng cấp.');
    },
  );
});
