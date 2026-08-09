import { expect, test, type Locator } from '@playwright/test';
import { resolve } from 'node:path';

import { FileUploadHelper } from '../../../utils/FileUploadHelper';

test('resolves an upload fixture beneath the configured fixture root', () => {
  expect(FileUploadHelper.resolveFixturePath('listing-images/property.jpg')).toBe(
    resolve('test-data/files/listing-images/property.jpg'),
  );
});

test('rejects path traversal outside the fixture root', () => {
  expect(() => FileUploadHelper.resolveFixturePath('../private.env')).toThrow(
    'Upload path must stay inside test-data/files',
  );
});

test('tải nhiều tệp trong một lần để không ghi đè lựa chọn trước', async () => {
  const calls: string[][] = [];
  const locator = {
    setInputFiles: (paths: string[]): Promise<void> => {
      calls.push(paths);
      return Promise.resolve();
    },
  } as unknown as Locator;

  await FileUploadHelper.uploadMany(locator, [
    'listing-images/property.png',
    'listing-files/invalid.txt',
  ]);

  expect(calls).toEqual([
    [
      resolve('test-data/files/listing-images/property.png'),
      resolve('test-data/files/listing-files/invalid.txt'),
    ],
  ]);
});
