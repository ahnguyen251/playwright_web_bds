import { expect, test } from '@playwright/test';

import { AppointmentDataFactory } from '../../../test-data/factories/AppointmentDataFactory';

test('creates independent valid requests without expiring options', () => {
  const first = AppointmentDataFactory.create(48);
  const second = AppointmentDataFactory.create(48);

  expect(first).not.toBe(second);
  expect(first.phone).toMatch(/^0[235789]\d{8}$/);
  expect(first.email).toMatch(/@gmail\.com$/);
  expect(first.date).toEqual({ strategy: 'earliest-available' });
  expect(first.timeSlot).toEqual({ strategy: 'earliest-available' });
  expect(first.email).not.toBe(second.email);
});

test('accepts typed overrides including invalid contact data for negative scenarios', () => {
  const appointment = AppointmentDataFactory.create(48, {
    phone: '0101234567',
    email: 'automation@example.test',
    date: { strategy: 'exact', label: 'Thứ 5 13 Tháng 8' },
  });

  expect(appointment.phone).toBe('0101234567');
  expect(appointment.email).toBe('automation@example.test');
  expect(appointment.date).toEqual({ strategy: 'exact', label: 'Thứ 5 13 Tháng 8' });
});

test('rejects an invalid listing id', () => {
  expect(() => AppointmentDataFactory.create(0)).toThrow('Appointment listing ID must be positive');
});
