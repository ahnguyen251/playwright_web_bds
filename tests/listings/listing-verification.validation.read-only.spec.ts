import { expect, test } from '../../fixtures/test.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';

const MOCK_LISTING_ID = '99999';
const mockSaleListing = {
  success: true,
  data: {
    id: 99999,
    title: 'Bán nhà mặt tiền trung tâm',
    description: 'Bán nhà vị trí đẹp, sổ hồng chính chủ',
    demand_type: 'SALE',
    status: 'DRAFT',
    property: {
      type: 'HOUSE',
      province: 'Hồ Chí Minh',
      province_code: '79',
      district_code: '760',
      ward: 'Phường Bến Nghé',
      ward_code: '26734',
      area: 100,
      price: 10000000000,
      is_negotiable: false,
    },
    images: [
      { id: 1, url: 'https://images.unsplash.com/sample.jpg', type: 'LISTING_IMAGE' },
    ],
  },
};

test.describe('Listing Verification Suite', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.route('**/*provinces.open-api.vn/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.route(`**/api/v1/listings/my/${MOCK_LISTING_ID}*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSaleListing),
      }),
    );
    await page.route(`**/api/v1/listings/${MOCK_LISTING_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSaleListing),
      }),
    );
    await page.route('**/api/v1/cloudinary/sign*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            api_key: 'mock-key',
            timestamp: 1234567890,
            signature: 'mock-signature',
            folder: 'listings',
            cloud_name: 'propify',
          },
        }),
      }),
    );
    await page.route('**/*cloudinary.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          secure_url: 'https://images.unsplash.com/sample-verified.jpg',
        }),
      }),
    );
    await page.route('**/api/v1/uploads*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ secure_url: 'https://images.unsplash.com/sample-verified.jpg' }),
      }),
    );
  });

  test(
    listingCaseTitle('TC-LIST-VERIFY-001'),
    async ({ page, editListingPage }) => {
      let verificationPayload: Record<string, unknown> | undefined;

      await page.route(`**/api/v1/listings/${MOCK_LISTING_ID}/verification`, async (route) => {
        verificationPayload = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Cập nhật thông tin xác thực thành công',
          }),
        });
      });

      await editListingPage.openVerification(MOCK_LISTING_ID);

      await editListingPage.uploadVerificationIdentityCardFront({
        name: 'cccd-front.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('front-id-card-content'),
      });
      await expect.poll(() => editListingPage.isIdentityCardFrontUploaded()).toBe(true);

      await editListingPage.uploadVerificationIdentityCardBack({
        name: 'cccd-back.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('back-id-card-content'),
      });
      await expect.poll(() => editListingPage.isIdentityCardBackUploaded()).toBe(true);

      await editListingPage.uploadVerificationLegalDocuments([
        {
          name: 'giay-to-phap-ly.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('legal-document-content'),
        },
      ]);
      await expect.poll(() => editListingPage.legalDocumentsCount()).toBeGreaterThan(0);

      await editListingPage.submitVerification();

      await expect.poll(() => verificationPayload !== undefined).toBe(true);
      expect(verificationPayload?.identity_card_front).toBeDefined();
      expect(verificationPayload?.identity_card_back).toBeDefined();
      expect(Array.isArray(verificationPayload?.legal_documents)).toBe(true);

      await expect(page).toHaveURL(/\/profile\?tab=listings/);
    },
  );

  test(
    listingCaseTitle('TC-LIST-VERIFY-002') + ' - Chặn khi thiếu ảnh bắt buộc',
    async ({ editListingPage }) => {
      await editListingPage.openVerification(MOCK_LISTING_ID);

      // Upload only front CCCD, omitting back and legal documents
      await editListingPage.uploadVerificationIdentityCardFront({
        name: 'cccd-front.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('front-id-card-content'),
      });

      await expect.poll(() => editListingPage.isIdentityCardFrontUploaded()).toBe(true);

      await editListingPage.setPublicInfoAgreed(true);
      await editListingPage.submitVerification();

      await expect
        .poll(() => editListingPage.verificationErrorMessage())
        .toMatch(/Vui lòng tải lên.*CCCD\/CMND mặt sau.*để gửi yêu cầu xác thực/i);
    },
  );

  test(
    listingCaseTitle('TC-LIST-VERIFY-002') + ' - Chặn file sai định dạng hoặc quá dung lượng',
    async ({ editListingPage }) => {
      await editListingPage.openVerification(MOCK_LISTING_ID);

      // 1. Upload invalid file format (.txt)
      await editListingPage.uploadVerificationLegalDocuments([
        {
          name: 'invalid-doc.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('invalid text file'),
        },
      ]);

      await expect
        .poll(() => editListingPage.verificationErrorMessage())
        .toMatch(/Định dạng file không hợp lệ|File không hợp lệ đã bị loại bỏ/i);

      // 2. Upload oversized file (> 10MB)
      await editListingPage.uploadVerificationLegalDocuments([
        {
          name: 'oversized-doc.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.alloc(11 * 1024 * 1024),
        },
      ]);

      await expect
        .poll(() => editListingPage.verificationErrorMessage())
        .toMatch(/Dung lượng file vượt quá giới hạn|File không hợp lệ đã bị loại bỏ/i);
    },
  );
});
