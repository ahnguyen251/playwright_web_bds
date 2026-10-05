import { expect, test } from '../../fixtures/test.fixture';
import { rankingCaseTitle } from '../../test-cases/ranking/ranking.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

interface MockListingItem {
  readonly id: number;
  readonly title: string;
  readonly price: number;
  readonly area: number;
  readonly package?: string | null;
}

const buildMockApiResponse = (items: readonly MockListingItem[]) => ({
  status: true,
  message: 'Lay danh sach tin dang thanh cong.',
  data: items.map((item) => ({
    id: item.id,
    title: item.title,
    description: 'Mô tả bất động sản chi tiết vị trí đẹp pháp lý rõ ràng',
    demand_type: 'SALE',
    status: 'ACTIVE',
    package: item.package ?? null,
    is_verified: 'VERIFIED',
    views: 10,
    package_expires_at: null,
    is_favorited: false,
    published_at: '2026-09-30T10:00:00+07:00',
    property: {
      id: item.id,
      owner_id: 1,
      type: 'APARTMENT',
      province: 'Hà Nội',
      ward: 'Phường Cống Vị',
      address: '123 Phố Liễu Giai',
      area: item.area,
      price: item.price,
      is_negotiable: false,
      bedrooms: 2,
      bathrooms: 2,
    },
    images: [
      {
        id: item.id * 10,
        url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80',
        type: 'LISTING_IMAGE',
      },
    ],
    user: {
      id: 1,
      name: 'Chủ nhà Test',
      phone: '0912345678',
      role: 'OWNER',
    },
  })),
  pagination: {
    page: 1,
    per_page: 20,
    total: items.length,
    total_pages: 1,
  },
});

test.describe('Listing Ranking Suite - Read-Only DOM Ordering', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    rankingCaseTitle('TC-RANK-ORDER-001'),
    async ({ page, listingListPage }) => {
      const tinKimCuong: MockListingItem = {
        id: 9101,
        title: 'Tin Kim Cương đăng 168h điểm thấp',
        price: 3_500_000_000,
        area: 80,
        package: 'VIP_DIAMOND',
      };
      const tinVang: MockListingItem = {
        id: 9102,
        title: 'Tin Vàng vừa đăng 0h điểm cao',
        price: 4_200_000_000,
        area: 90,
        package: 'VIP_GOLD',
      };

      await page.route('**/api/v1/listings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildMockApiResponse([tinKimCuong, tinVang])),
        });
      });

      await listingListPage.open('sale');

      const order = await listingListPage.listingOrder(tinKimCuong.title, tinVang.title);
      expect(order).toBe('before');

      const indexA = await listingListPage.indexOfListing(tinKimCuong.title);
      const indexB = await listingListPage.indexOfListing(tinVang.title);
      expect(indexA).toBe(0);
      expect(indexB).toBe(1);
    },
  );

  test(
    rankingCaseTitle('TC-RANK-ORDER-002'),
    async ({ page, listingListPage }) => {
      const tinVang: MockListingItem = {
        id: 9201,
        title: 'Tin Vàng đăng 72h trước',
        price: 5_000_000_000,
        area: 100,
        package: 'VIP_GOLD',
      };
      const tinBac: MockListingItem = {
        id: 9202,
        title: 'Tin Bạc vừa đăng 2h trước',
        price: 2_500_000_000,
        area: 60,
        package: 'VIP_SILVER',
      };

      await page.route('**/api/v1/listings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildMockApiResponse([tinVang, tinBac])),
        });
      });

      await listingListPage.open('sale');

      const order = await listingListPage.listingOrder(tinVang.title, tinBac.title);
      expect(order).toBe('before');

      const indexVang = await listingListPage.indexOfListing(tinVang.title);
      const indexBac = await listingListPage.indexOfListing(tinBac.title);
      expect(indexVang).toBeLessThan(indexBac);
    },
  );

  test(
    rankingCaseTitle('TC-RANK-ORDER-003'),
    async ({ page, listingListPage }) => {
      const tinVangScore10: MockListingItem = {
        id: 9301,
        title: 'Tin Vàng chất lượng 10/10',
        price: 6_000_000_000,
        area: 120,
        package: 'VIP_GOLD',
      };
      const tinVangScore6: MockListingItem = {
        id: 9302,
        title: 'Tin Vàng chất lượng 6/10',
        price: 4_000_000_000,
        area: 85,
        package: 'VIP_GOLD',
      };

      await page.route('**/api/v1/listings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildMockApiResponse([tinVangScore10, tinVangScore6])),
        });
      });

      await listingListPage.open('sale');

      const order = await listingListPage.listingOrder(
        tinVangScore10.title,
        tinVangScore6.title,
      );
      expect(order).toBe('before');

      const indexA = await listingListPage.indexOfListing(tinVangScore10.title);
      const indexB = await listingListPage.indexOfListing(tinVangScore6.title);
      expect(indexA).toBeLessThan(indexB);
    },
  );

  test(
    rankingCaseTitle('TC-RANK-ORDER-004'),
    async ({ page, listingListPage }) => {
      const tinBacMoi: MockListingItem = {
        id: 9401,
        title: 'Tin Bạc mới đăng 1h trước',
        price: 3_200_000_000,
        area: 75,
        package: 'VIP_SILVER',
      };
      const tinBacCu: MockListingItem = {
        id: 9402,
        title: 'Tin Bạc đã đăng 48h trước',
        price: 3_100_000_000,
        area: 70,
        package: 'VIP_SILVER',
      };

      await page.route('**/api/v1/listings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildMockApiResponse([tinBacMoi, tinBacCu])),
        });
      });

      await listingListPage.open('sale');

      const order = await listingListPage.listingOrder(tinBacMoi.title, tinBacCu.title);
      expect(order).toBe('before');

      const indexMoi = await listingListPage.indexOfListing(tinBacMoi.title);
      const indexCu = await listingListPage.indexOfListing(tinBacCu.title);
      expect(indexMoi).toBeLessThan(indexCu);
    },
  );

  test(
    rankingCaseTitle('TC-RANK-ORDER-005'),
    async ({ page, listingListPage }) => {
      const tinKimCuong48h: MockListingItem = {
        id: 9501,
        title: 'Tin Kim Cương 48h tốc độ giảm điểm chậm',
        price: 8_000_000_000,
        area: 150,
        package: 'VIP_DIAMOND',
      };
      const tinThuong48h: MockListingItem = {
        id: 9502,
        title: 'Tin Thường 48h tốc độ giảm điểm nhanh',
        price: 2_000_000_000,
        area: 50,
        package: null,
      };

      await page.route('**/api/v1/listings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildMockApiResponse([tinKimCuong48h, tinThuong48h])),
        });
      });

      await listingListPage.open('sale');

      const order = await listingListPage.listingOrder(
        tinKimCuong48h.title,
        tinThuong48h.title,
      );
      expect(order).toBe('before');

      const indexKimCuong = await listingListPage.indexOfListing(tinKimCuong48h.title);
      const indexThuong = await listingListPage.indexOfListing(tinThuong48h.title);
      expect(indexKimCuong).toBeLessThan(indexThuong);
    },
  );

  test(
    rankingCaseTitle('TC-RANK-QUAL-001'),
    async ({ page, listingListPage }) => {
      const tinA: MockListingItem = {
        id: 9601,
        title: 'Tin A Bạc bổ sung giấy tờ pháp lý',
        price: 3_800_000_000,
        area: 82,
        package: 'VIP_SILVER',
      };
      const tinB: MockListingItem = {
        id: 9602,
        title: 'Tin B Bạc đối chứng đủ giấy tờ ban đầu',
        price: 3_900_000_000,
        area: 85,
        package: 'VIP_SILVER',
      };

      // Giai đoạn 1: Tin A chưa có giấy tờ pháp lý (Score 6 < Score 8 của Tin B)
      // Tin B xếp TRÊN Tin A
      let currentMockData = [tinB, tinA];

      await page.route('**/api/v1/listings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildMockApiResponse(currentMockData)),
        });
      });

      await listingListPage.open('sale');
      expect(await listingListPage.listingOrder(tinB.title, tinA.title)).toBe('before');

      // Giai đoạn 2: Cập nhật tin A bổ sung 2 ảnh sổ đỏ hợp lệ và mô tả
      // Điểm chất lượng Tin A tăng 6 -> 10, vượt Tin B (Score 8), đẩy Tin A lên TRÊN Tin B
      currentMockData = [tinA, tinB];

      await listingListPage.open('sale');
      expect(await listingListPage.listingOrder(tinA.title, tinB.title)).toBe('before');
    },
  );
});
