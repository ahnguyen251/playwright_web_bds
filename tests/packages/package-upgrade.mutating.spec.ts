import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { packageCaseTitle } from '../../test-cases/packages/package.test-cases';

test.use({ storageState: '.auth/defaultUser.json' });

test.describe('Package Upgrade Flow - Mutating E2E Scenarios', () => {
  test(
    packageCaseTitle('TC-PKG-UPGRADE-001'),
    async ({ myListingsPage, packageUpgradeModal, vnpayResultPage, vnpaySandboxPage }) => {
      await myListingsPage.open();

      await myListingsPage.openPackageUpgradeForStatus('Đang đăng');
      await expect.poll(async () => packageUpgradeModal.isVisible()).toBe(true);

      // Chọn gói Ruby 3 ngày
      await packageUpgradeModal.selectDuration('ruby', '3 ngày');
      await packageUpgradeModal.clickUpgrade('ruby');

      await expect.poll(async () => packageUpgradeModal.isConfirmVisible()).toBe(true);

      // Khởi phát thanh toán qua VNPAY Sandbox
      await packageUpgradeModal.confirmPayment();

      // Chờ chuyển hướng sang cổng thanh toán VNPAY Sandbox
      await packageUpgradeModal.waitForGatewayNavigation();
      expect(await vnpaySandboxPage.isAtGateway()).toBe(true);

      // Điền thông tin thẻ test NCB trên cổng Sandbox
      await vnpaySandboxPage.fillCardAndSubmit({
        cardNumber: '9704198888888888888',
        cardHolder: 'NGUYEN VAN A',
        issueDate: '07/15',
        otp: '123456',
      });

      // Chờ chuyển hướng trở lại trang Propify kết quả thanh toán
      await vnpaySandboxPage.waitForReturnToPropify();

      // Nếu đang ở màn kết quả, chờ chuyển tiếp về danh sách tin
      await vnpayResultPage.waitForRedirectToListings();

      // Xác minh Toast thông báo thành công
      await expect
        .poll(async () => myListingsPage.feedback(), { timeout: 15_000 })
        .toContain('Nâng cấp gói tin thành công.');
    },
  );

  test(
    packageCaseTitle('TC-PKG-UPGRADE-002'),
    async ({ myListingsPage, packageUpgradeModal, vnpaySandboxPage }) => {
      await myListingsPage.open();

      await myListingsPage.openPackageUpgradeForStatus('Đang đăng');
      await expect.poll(async () => packageUpgradeModal.isVisible()).toBe(true);

      // Chọn gói Diamond (Cấp 4) nâng cấp từ hạng thấp hơn
      await packageUpgradeModal.selectDuration('diamond', '3 ngày');
      await packageUpgradeModal.clickUpgrade('diamond');

      await expect.poll(async () => packageUpgradeModal.isConfirmVisible()).toBe(true);
      await packageUpgradeModal.confirmPayment();

      await packageUpgradeModal.waitForGatewayNavigation();
      expect(await vnpaySandboxPage.isAtGateway()).toBe(true);
    },
  );
});
