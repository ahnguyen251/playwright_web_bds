import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';
import ts from 'typescript';

import {
  attachExpectedFailureScreenshot,
  evidenceTest,
  type ExpectedFailureScreenshotTestInfo,
} from '../../../fixtures/evidence.fixture';

interface RecordedAttachment {
  readonly name: string;
  readonly body: string;
  readonly contentType: string;
}

const collectTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? collectTypeScriptFiles(entryPath)
      : entry.isFile() && entry.name.endsWith('.ts')
        ? [entryPath]
        : [];
  });

const usesTestFail = (sourceFile: ts.SourceFile): boolean => {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sourceFile) === 'test' &&
      node.expression.name.text === 'fail'
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};

const importsCanonicalFixture = (sourceFile: ts.SourceFile): boolean =>
  sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.replaceAll('\\', '/').endsWith('/fixtures/test.fixture'),
  );

let expectedFailureInfo: TestInfo | undefined;
let noPageFailureInfo: TestInfo | undefined;

evidenceTest.describe.serial('expected-failure evidence fixture integration', () => {
  evidenceTest(
    'captures a PNG when a test.fail browser test actually fails',
    async ({ page }, testInfo) => {
      expectedFailureInfo = testInfo;
      evidenceTest.fail(true, 'Expected failure fixture probe');
      await page.setContent('<main>expected failure fixture probe</main>');

      expect(1).toBe(2);
    },
  );

  evidenceTest('exposes exactly one explicit screenshot and no retained video', () => {
    if (expectedFailureInfo === undefined) {
      throw new Error('Expected-failure browser probe did not execute.');
    }

    expect(expectedFailureInfo.status).toBe('failed');
    expect(expectedFailureInfo.expectedStatus).toBe('failed');
    expect(
      expectedFailureInfo.attachments.filter(
        ({ name, contentType }) =>
          name === 'expected-failure-screenshot' && contentType === 'image/png',
      ),
    ).toHaveLength(1);
    expect(expectedFailureInfo.attachments.some(({ name }) => name === 'video')).toBe(false);
  });

  evidenceTest(
    'does not create a page for an expected failure that requests no page',
    ({ browserName }, testInfo) => {
      void browserName;
      noPageFailureInfo = testInfo;
      evidenceTest.fail(true, 'Expected no-page fixture probe');

      expect(1).toBe(2);
    },
  );

  evidenceTest('does not fabricate screenshot or video attachments for the no-page failure', () => {
    if (noPageFailureInfo === undefined) {
      throw new Error('Expected no-page probe did not execute.');
    }

    expect(noPageFailureInfo.status).toBe('failed');
    expect(noPageFailureInfo.expectedStatus).toBe('failed');
    expect(
      noPageFailureInfo.attachments.some(({ name }) =>
        ['expected-failure-screenshot', 'screenshot', 'video'].includes(name),
      ),
    ).toBe(false);
  });
});

test('does not capture the special screenshot when actual and expected status differ', async () => {
  const attachments: RecordedAttachment[] = [];
  const screenshotCalls: unknown[] = [];
  const testInfo: ExpectedFailureScreenshotTestInfo = {
    status: 'passed',
    expectedStatus: 'failed',
    attach: (name, attachment) => {
      attachments.push({
        name,
        body: attachment.body.toString('utf8'),
        contentType: attachment.contentType,
      });
      return Promise.resolve();
    },
  };

  await attachExpectedFailureScreenshot(
    {
      screenshot: (options) => {
        screenshotCalls.push(options);
        return Promise.resolve(Buffer.from('should-not-be-captured'));
      },
    },
    testInfo,
  );

  expect(screenshotCalls).toEqual([]);
  expect(attachments).toEqual([]);
});

test('capture errors add only a plain-text diagnostic without mutating statuses', async () => {
  const attachments: RecordedAttachment[] = [];
  const testInfo: ExpectedFailureScreenshotTestInfo = {
    status: 'failed',
    expectedStatus: 'failed',
    attach: (name, attachment) => {
      attachments.push({
        name,
        body: attachment.body.toString('utf8'),
        contentType: attachment.contentType,
      });
      return Promise.resolve();
    },
  };

  await attachExpectedFailureScreenshot(
    { screenshot: () => Promise.reject(new Error('browser already closed')) },
    testInfo,
  );

  expect(testInfo).toMatchObject({ status: 'failed', expectedStatus: 'failed' });
  expect(attachments).toEqual([
    {
      name: 'expected-failure-screenshot-error',
      body: 'Unable to capture expected-failure screenshot.',
      contentType: 'text/plain',
    },
  ]);
});

test('every business test using test.fail imports the canonical fixture chain', () => {
  const testsRoot = path.resolve(process.cwd(), 'tests');
  const failFiles = collectTypeScriptFiles(testsRoot).filter((file) => {
    const source = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    return usesTestFail(sourceFile);
  });
  const violations = failFiles.filter((file) => {
    const source = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    return !importsCanonicalFixture(sourceFile);
  });

  expect(failFiles.length).toBeGreaterThan(0);
  expect(violations).toEqual([]);
});
