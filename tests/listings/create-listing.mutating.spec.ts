import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';
import { ListingDataFactory } from '../../test-data/factories/ListingDataFactory';

test.beforeEach(async ({ authenticationWorkflow, defaultUser }) => {
  await authenticationWorkflow.login(defaultUser);
});

test(listingCaseTitle('LIST-UC08-001'), async ({ listingWorkflow }) => {
  // Tạo dữ liệu test hợp lệ: Loại giao dịch Mua bán, vai trò Chủ nhà
  const listingData = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('Tạo tin đăng mua bán chủ nhà'),
    transactionType: 'sale',
    contact: {
      role: 'owner',
    },
  });

  // Thực hiện quy trình đăng tin thông qua Workflow
  const status = await listingWorkflow.create(listingData);

  // Xác nhận tin đăng mới có trạng thái là Chờ duyệt theo yêu cầu
  expect(status).toBe('Chờ duyệt');
});

test(listingCaseTitle('LIST-UC08-002'), async ({ listingWorkflow }) => {
  // Tạo dữ liệu test hợp lệ với video tùy chọn đính kèm
  const listingData = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('Tạo tin đăng có video'),
    media: {
      imagePaths: [
        'listing-images/property.png',
        'listing-images/property.png',
        'listing-images/property.png',
      ],
      videoPath: 'listing-videos/property.mp4',
    },
  });

  // Thực hiện quy trình đăng tin
  const status = await listingWorkflow.create(listingData);

  // Xác nhận tin đăng mới có trạng thái là Chờ duyệt
  expect(status).toBe('Chờ duyệt');
});

test('Tạo tin đăng với loại giao dịch Cho thuê', async ({ listingWorkflow }) => {
  // Ghi đè transactionType thành 'rent' (Cho thuê)
  const listingData = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('Tạo tin đăng cho thuê'),
    transactionType: 'rent',
  });

  const status = await listingWorkflow.create(listingData);
  expect(status).toBe('Chờ duyệt');
});

test('Tạo tin đăng với vai trò Môi giới', async ({ listingWorkflow }) => {
  // Ghi đè vai trò liên hệ thành 'broker' (Môi giới)
  const listingData = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('Tạo tin đăng bởi môi giới'),
    contact: {
      role: 'broker',
    },
  });

  const status = await listingWorkflow.create(listingData);
  expect(status).toBe('Chờ duyệt');
});
