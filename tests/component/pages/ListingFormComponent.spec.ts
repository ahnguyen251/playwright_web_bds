import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

import { ListingFormComponent } from '../../../pages/components/ListingFormComponent';

const fixtureRoot = resolve('test-data/files');

test('keeps every selected listing image in one browser file list', async ({ page }) => {
  await mkdir(fixtureRoot, { recursive: true });
  const temporaryDirectory = await mkdtemp(join(fixtureRoot, 'multi-upload-'));

  try {
    const absolutePaths = [
      join(temporaryDirectory, 'front-view.txt'),
      join(temporaryDirectory, 'back-view.txt'),
    ];
    await Promise.all(
      absolutePaths.map(async (absolutePath, index) =>
        writeFile(absolutePath, `fixture-${String(index)}`),
      ),
    );
    const relativePaths = absolutePaths.map((absolutePath) => relative(fixtureRoot, absolutePath));
    await page.setContent('<input type="file" multiple />');
    const listingForm = new ListingFormComponent(page);

    await listingForm.uploadImages(relativePaths);

    const selectedFileNames = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      return Array.from(input?.files ?? []).map((file) => file.name);
    });
    expect(selectedFileNames).toEqual(absolutePaths.map((absolutePath) => basename(absolutePath)));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('leaves the existing browser file list unchanged when no images are supplied', async ({
  page,
}) => {
  await mkdir(fixtureRoot, { recursive: true });
  const temporaryDirectory = await mkdtemp(join(fixtureRoot, 'empty-upload-'));

  try {
    const absolutePath = join(temporaryDirectory, 'existing-image.txt');
    await writeFile(absolutePath, 'fixture');
    const relativePath = relative(fixtureRoot, absolutePath);
    await page.setContent('<input type="file" multiple />');
    const listingForm = new ListingFormComponent(page);
    await listingForm.uploadImages([relativePath]);

    await listingForm.uploadImages([]);

    const selectedFileNames = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      return Array.from(input?.files ?? []).map((file) => file.name);
    });
    expect(selectedFileNames).toEqual([basename(absolutePath)]);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
