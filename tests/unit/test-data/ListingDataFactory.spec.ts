import { expect, test } from '@playwright/test';

import { ListingDataFactory } from '../../../test-data/factories/ListingDataFactory';

test('tạo dữ liệu media và vị trí độc lập giữa các tin đăng', () => {
  const first = ListingDataFactory.create({ title: 'Tin thứ nhất' });
  const second = ListingDataFactory.create({ title: 'Tin thứ hai' });

  expect(first.title).toBe('Tin thứ nhất');
  expect(second.title).toBe('Tin thứ hai');
  expect(first).not.toBe(second);
  expect(first.media).not.toBe(second.media);
  expect(first.media.imagePaths).not.toBe(second.media.imagePaths);
  expect(first.location).not.toBe(second.location);
  expect(first.contact).not.toBe(second.contact);
  expect(Object.isFrozen(first.media.imagePaths)).toBe(true);
  expect(Object.isFrozen(first.location)).toBe(true);
});

test('từ chối giá trị số bắt buộc nhỏ hơn hoặc bằng không', () => {
  expect(() => ListingDataFactory.create({ price: 0 })).toThrow('Listing price must be positive');
  expect(() => ListingDataFactory.create({ area: 0 })).toThrow('Listing area must be positive');
});

test('tạo dữ liệu văn bản đúng biên và vượt biên', () => {
  expect(ListingDataFactory.boundaryText(120)).toHaveLength(120);
  expect(ListingDataFactory.boundaryText(121)).toHaveLength(121);
  expect(() => ListingDataFactory.boundaryText(-1)).toThrow('Boundary length cannot be negative');
});

test('tạo tiêu đề duy nhất không vượt quá giới hạn giao diện', () => {
  const first = ListingDataFactory.uniqueTitle('TIN KIỂM THỬ');
  const second = ListingDataFactory.uniqueTitle('TIN KIỂM THỬ');

  expect(first).not.toBe(second);
  expect(first.length).toBeLessThanOrEqual(120);
});

test('từ chối tiêu đề và mô tả vượt giới hạn giao diện', () => {
  expect(() =>
    ListingDataFactory.create({ title: ListingDataFactory.boundaryText(121) }),
  ).toThrow('Listing title cannot exceed 120 characters');
  expect(() =>
    ListingDataFactory.create({ description: ListingDataFactory.boundaryText(5001) }),
  ).toThrow('Listing description cannot exceed 5000 characters');
});

test('từ chối số lượng media vượt giới hạn giao diện', () => {
  expect(() =>
    ListingDataFactory.create({
      media: {
        imagePaths: Array.from({ length: 11 }, (_, index) => `listing-images/${index}.png`),
      },
    }),
  ).toThrow('Listing cannot contain more than 10 images');
});
