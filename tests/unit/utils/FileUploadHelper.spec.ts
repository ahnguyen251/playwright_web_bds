import { expect, test } from '@playwright/test';
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
