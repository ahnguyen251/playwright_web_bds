import { expect, test } from '@playwright/test';

import { RandomDataGenerator } from '../../../utils/RandomDataGenerator';

test('generates unique prefixed email addresses', () => {
  const first = RandomDataGenerator.email('graduate');
  const second = RandomDataGenerator.email('graduate');

  expect(first).toMatch(/^graduate\.[a-z0-9]+@example\.test$/);
  expect(second).not.toBe(first);
});

test('generates a Vietnamese-style test phone number', () => {
  expect(RandomDataGenerator.phoneNumber()).toMatch(/^09\d{8}$/);
});

test('generates integers inside inclusive boundaries', () => {
  for (let index = 0; index < 20; index += 1) {
    expect(RandomDataGenerator.integer(5, 7)).toBeGreaterThanOrEqual(5);
    expect(RandomDataGenerator.integer(5, 7)).toBeLessThanOrEqual(7);
  }
});
