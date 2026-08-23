import { getDefaultDatabase } from '../database/sqlite';
import { TestCaseRepository } from '../database/repositories/TestCaseRepository';
import { allTestCases } from '../test-cases/index';

const conn = getDefaultDatabase();
const repo = new TestCaseRepository(conn);

console.log('Đang đồng bộ Test Case chuẩn vào SQLite...');

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
let deleted = 0;
for (const dbId of dbIds) {
  if (!canonicalIds.has(dbId)) {
    console.warn(`[TEST_CASE_CU] ${dbId} tồn tại trong DB nhưng không có trong danh sách chuẩn. Đang xóa...`);
    conn.db.prepare('DELETE FROM test_cases WHERE test_case_id = ?').run(dbId);
    deleted++;
    stale++;
  }
}

console.log('\n--- Tổng Kết Đồng Bộ Test Case ---');
console.log(`Bản chuẩn: ${allTestCases.length}`);
console.log(`Đã thêm:   ${inserted}`);
console.log(`Cập nhật:  ${updated}`);
console.log(`Bị cũ:     ${stale}`);
console.log(`Đã xóa:    ${deleted}`);

conn.close();
