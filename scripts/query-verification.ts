import { getDefaultDatabase } from '../database/sqlite';
const conn = getDefaultDatabase();
const db = conn.db;

console.log('\n--- 1. Tổng số Test Case (Canonical) ---');
console.log(db.prepare('SELECT COUNT(*) as count FROM test_cases').get());

console.log('\n--- 2. Có bao nhiêu test case AUTOMATED (đã tự động hóa)? ---');
console.log(db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE automation_status = ?').get('AUTOMATED'));

console.log('\n--- 3. Có bao nhiêu test case NOT_AUTOMATED (chưa tự động hóa)? ---');
console.log(db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE automation_status = ?').get('NOT_AUTOMATED'));

console.log('\n--- 4. Lần chạy test (Run) mới nhất và chỉ số (metrics) ---');
const latestRun = db.prepare('SELECT run_id, total_executions, unique_mapped_test_case_ids_executed FROM test_runs ORDER BY created_at DESC LIMIT 1').get() as any;
console.log(latestRun);

console.log('\n--- 5. Thông tin execution của TC-AUTH-LOGIN-001 ---');
console.log(db.prepare(`
  SELECT run_id, project_name, status, traceability_status, duration_ms
  FROM test_results 
  WHERE parsed_test_case_id = 'TC-AUTH-LOGIN-001'
`).all());

console.log('\n--- 6. Các test UNMAPPED ---');
console.log(db.prepare(`
  SELECT title, status, traceability_status
  FROM test_results
  WHERE traceability_status = 'UNMAPPED'
`).all());

conn.close();
