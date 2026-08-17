import fs from 'fs';
import path from 'path';
import type { TestCaseDefinition, AutomationStatus } from '../types/test-case.types';

export interface TestCaseRegistryEntry {
  readonly TestCaseId: string;
  readonly Module: string;
  readonly Title: string;
  readonly AutomationStatus: AutomationStatus;
  readonly ScriptPath?: string;
}

export class TestCaseRegistry {
  private readonly projectRoot = path.resolve(__dirname, '..');

  public validate(testCases: readonly TestCaseDefinition[]): TestCaseRegistryEntry[] {
    const entries: TestCaseRegistryEntry[] = [];
    const seenIds = new Set<string>();

    for (const testCase of testCases) {
      if (seenIds.has(testCase.id)) {
        throw new Error(`Validation Error: Duplicate TestCaseId detected: ${testCase.id}`);
      }
      seenIds.add(testCase.id);

      const status = testCase.automation.status;
      const scriptPath = testCase.automation.scriptPath;

      if (status === 'AUTOMATED' && !scriptPath) {
        throw new Error(
          `Validation Error: TestCase ${testCase.id} is marked as AUTOMATED but missing scriptPath.`,
        );
      }

      if (scriptPath) {
        const absoluteScriptPath = path.resolve(this.projectRoot, scriptPath);
        if (!fs.existsSync(absoluteScriptPath)) {
          throw new Error(
            `Validation Error: TestCase ${testCase.id} references scriptPath '${scriptPath}' which does not exist.`,
          );
        }
      }

      entries.push({
        TestCaseId: testCase.id,
        Module: testCase.module,
        Title: testCase.title,
        AutomationStatus: status,
        ...(scriptPath !== undefined ? { ScriptPath: scriptPath } : {}),
      });
    }

    return entries;
  }
}
