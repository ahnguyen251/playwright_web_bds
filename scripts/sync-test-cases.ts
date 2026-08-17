import { getDefaultDatabase } from '../database/sqlite';
import { TestCaseRepository } from '../database/repositories/TestCaseRepository';
import { allTestCases } from '../test-cases/index';

const conn = getDefaultDatabase();
const repo = new TestCaseRepository(conn);

console.log('Syncing Canonical Test Cases to SQLite...');

let inserted = 0;
let updated = 0;

const canonicalIds = new Set(allTestCases.map((tc) => tc.id));

for (const tc of allTestCases) {
  const isNew = repo.upsertTestCase(tc);
  if (isNew) inserted++;
  else updated++;
}

const dbIds = repo.getAllTestCaseIds();
let stale = 0;
for (const dbId of dbIds) {
  if (!canonicalIds.has(dbId)) {
    console.warn(`[STALE_TEST_CASE] ${dbId} exists in DB but is missing from canonical Registry.`);
    stale++;
  }
}

console.log('\n--- Test Case Sync Summary ---');
console.log(`Canonical: ${allTestCases.length}`);
console.log(`Inserted:  ${inserted}`);
console.log(`Updated:   ${updated}`);
console.log(`Stale:     ${stale}`);

conn.close();
