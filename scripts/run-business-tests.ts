import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { allTestCases } from '../test-cases';
import { TestCaseRegistry } from '../utils/TestCaseRegistry';
import {
  buildBusinessPlaywrightArgs,
  createBusinessCatalogSelection,
} from '../utils/business-test-selection';

const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const runId = `BUSINESS-RUN-${timestamp}-${crypto.randomBytes(2).toString('hex')}`;

new TestCaseRegistry().validate(allTestCases);
const selection = createBusinessCatalogSelection(allTestCases);
const playwrightArgs = buildBusinessPlaywrightArgs(selection, process.argv.slice(2));
const playwrightCli = require.resolve('@playwright/test/cli');

console.log('\n=== Business Coverage Baseline ===');
console.log(`Catalog IDs: ${String(selection.CatalogTotal)}`);
console.log(`Automated IDs: ${String(selection.AutomatedIds.length)}`);
console.log(`Not automated IDs: ${String(selection.NotAutomatedIds.length)}`);
console.log(`Not automated ID list: ${selection.NotAutomatedIds.join(', ')}`);

const child = spawn(process.execPath, [playwrightCli, ...playwrightArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    BUSINESS_TEST_RUN: 'true',
    BUSINESS_RUN_ID: runId,
  },
  shell: false,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Unable to start Playwright business run: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Playwright business run interrupted by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
