import { expect, test } from '@playwright/test';
import type { DatabaseConnection } from '../../../database/sqlite';
import { withDatabase, withDatabaseAsync } from '../../../scripts/database-script-runtime';

const fakeConnection = (onClose: () => void): DatabaseConnection =>
  ({
    db: {} as DatabaseConnection['db'],
    close: onClose,
  }) satisfies DatabaseConnection;

test.describe('database script runtime', () => {
  test('closes after success', () => {
    let closeCount = 0;

    const result = withDatabase(
      'ignored.db',
      () => 'done',
      () =>
        fakeConnection(() => {
          closeCount += 1;
        }),
    );

    expect(result).toBe('done');
    expect(closeCount).toBe(1);
  });

  test('closes before rethrowing operation failure', () => {
    let closeCount = 0;

    expect(() =>
      withDatabase(
        'ignored.db',
        () => {
          throw new Error('operation failed');
        },
        () =>
          fakeConnection(() => {
            closeCount += 1;
          }),
      ),
    ).toThrow('operation failed');
    expect(closeCount).toBe(1);
  });

  test('keeps async operations open and closes after success', async () => {
    let closeCount = 0;

    const result = await withDatabaseAsync(
      'ignored.db',
      async () => {
        await Promise.resolve();
        expect(closeCount).toBe(0);
        return 'done';
      },
      () =>
        fakeConnection(() => {
          closeCount += 1;
        }),
    );

    expect(result).toBe('done');
    expect(closeCount).toBe(1);
  });

  test('closes before rethrowing async operation failure', async () => {
    let closeCount = 0;

    await expect(
      withDatabaseAsync(
        'ignored.db',
        async () => {
          await Promise.resolve();
          throw new Error('async operation failed');
        },
        () =>
          fakeConnection(() => {
            closeCount += 1;
          }),
      ),
    ).rejects.toThrow('async operation failed');
    expect(closeCount).toBe(1);
  });
});
