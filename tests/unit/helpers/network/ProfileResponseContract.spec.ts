import { expect, test } from '@playwright/test';

import { requireProfileAccountSnapshot } from '../../../../helpers/network/ProfileResponseContract';

test('normalizes the account response fields required by the Profile UI', () => {
  const snapshot = requireProfileAccountSnapshot({
    status: 200,
    body: {
      status: true,
      message: 'success',
      data: {
        full_name: 'Nguyễn Kiểm Thử',
        email: 'automation@example.test',
        phone: '0970000000',
        avatar_url: 'https://example.test/avatar.png',
        status: 'ACTIVE',
      },
    },
  });

  expect(snapshot).toEqual({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'automation@example.test',
    phone: '0970000000',
    hasAvatar: true,
    accountStatus: 'ACTIVE',
  });
});

test('normalizes nullable phone and avatar fields without inventing values', () => {
  const snapshot = requireProfileAccountSnapshot({
    status: 200,
    body: {
      data: {
        full_name: 'Nguyễn Kiểm Thử',
        email: 'automation@example.test',
        phone: null,
        avatar_url: null,
        status: 'ACTIVE',
      },
    },
  });

  expect(snapshot.phone).toBe('');
  expect(snapshot.hasAvatar).toBe(false);
});

test('rejects malformed account data with a sanitized diagnostic', () => {
  expect(() =>
    requireProfileAccountSnapshot({ status: 200, body: { data: { email: 'secret@test' } } }),
  ).toThrow('Profile account response does not match the required contract.');
});
