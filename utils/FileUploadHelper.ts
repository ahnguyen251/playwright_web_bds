import { access } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Locator } from '@playwright/test';

const fixtureRoot = resolve(process.cwd(), 'test-data/files');

export class FileUploadHelper {
  public static resolveFixturePath(relativePath: string): string {
    const candidate = resolve(fixtureRoot, relativePath);
    const pathFromRoot = relative(fixtureRoot, candidate);

    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      throw new Error('Upload path must stay inside test-data/files');
    }

    return candidate;
  }

  public static async upload(locator: Locator, relativePath: string): Promise<void> {
    const absolutePath = FileUploadHelper.resolveFixturePath(relativePath);
    await access(absolutePath);
    await locator.setInputFiles(absolutePath);
  }

  public static async uploadMany(locator: Locator, relativePaths: readonly string[]): Promise<void> {
    const absolutePaths = relativePaths.map((relativePath) =>
      FileUploadHelper.resolveFixturePath(relativePath),
    );
    await Promise.all(absolutePaths.map(async (absolutePath) => access(absolutePath)));
    await locator.setInputFiles(absolutePaths);
  }
}
