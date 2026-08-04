import { expect, test } from '@playwright/test';

import { ListingDataFactory } from '../../../test-data/factories/ListingDataFactory';

test('creates independent listing objects with typed overrides', () => {
  const first = ListingDataFactory.create({ title: 'First listing' });
  const second = ListingDataFactory.create({ title: 'Second listing' });

  expect(first.title).toBe('First listing');
  expect(second.title).toBe('Second listing');
  expect(first).not.toBe(second);
  expect(first.imagePaths).not.toBe(second.imagePaths);
});

test('rejects an invalid numeric override', () => {
  expect(() => ListingDataFactory.create({ price: 0 })).toThrow('Listing price must be positive');
});
