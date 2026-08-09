import { expect, test } from '@playwright/test';

import { ListingReferenceFactory } from '../../../test-data/factories/ListingReferenceFactory';

test('trả về tham chiếu tin khi cặp ID và tiêu đề đầy đủ', () => {
  expect(
    ListingReferenceFactory.get('approved', {
      LISTING_APPROVED_ID: '48',
      LISTING_APPROVED_TITLE: 'Căn hộ đã duyệt',
    }),
  ).toEqual({ id: '48', title: 'Căn hộ đã duyệt' });
});

test('trả về undefined khi tham chiếu tin kiểm soát chưa đầy đủ', () => {
  expect(ListingReferenceFactory.get('approved', {})).toBeUndefined();
  expect(
    ListingReferenceFactory.get('approved', {
      LISTING_APPROVED_ID: '48',
    }),
  ).toBeUndefined();
});

test('chuẩn hóa khoảng trắng trong tham chiếu tin kiểm soát', () => {
  expect(
    ListingReferenceFactory.get('ownedPublishedWithdraw', {
      LISTING_OWNED_PUBLISHED_WITHDRAW_ID: ' 91 ',
      LISTING_OWNED_PUBLISHED_WITHDRAW_TITLE: ' Tin đang đăng ',
    }),
  ).toEqual({ id: '91', title: 'Tin đang đăng' });
});
