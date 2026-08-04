import { expect, test } from '@playwright/test';

import { DateHelper } from '../../../utils/DateHelper';

test('formats a date without locale-dependent output', () => {
  expect(DateHelper.format(new Date('2026-08-05T00:00:00Z'), 'DD/MM/YYYY')).toBe('05/08/2026');
});

test('adds days without mutating the input date', () => {
  const input = new Date('2026-08-05T00:00:00Z');
  const result = DateHelper.addDays(input, 2);

  expect(result.toISOString()).toBe('2026-08-07T00:00:00.000Z');
  expect(input.toISOString()).toBe('2026-08-05T00:00:00.000Z');
});

test('rejects an unsupported date format', () => {
  expect(() => DateHelper.format(new Date(), 'MM-DD-YYYY')).toThrow(
    'Unsupported date format: MM-DD-YYYY',
  );
});
