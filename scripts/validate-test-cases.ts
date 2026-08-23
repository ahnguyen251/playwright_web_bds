import { allTestCases } from '../test-cases/index';
import { TestCaseRegistry } from '../utils/TestCaseRegistry';

const main = () => {
  const registry = new TestCaseRegistry();
  try {
    const entries = registry.validate(allTestCases);

    let automated = 0;
    let inProgress = 0;
    let notAutomated = 0;
    let blocked = 0;

    const mapped: string[] = [];
    const missing: string[] = [];

    for (const entry of entries) {
      if (entry.AutomationStatus === 'AUTOMATED') automated++;
      if (entry.AutomationStatus === 'IN_PROGRESS') inProgress++;
      if (entry.AutomationStatus === 'NOT_AUTOMATED') {
        notAutomated++;
        if (entry.ScriptPath) {
          missing.push(`${entry.TestCaseId} có scriptPath '${entry.ScriptPath}' nhưng lại đang là NOT_AUTOMATED.`);
        }
      }
      if (entry.AutomationStatus === 'BLOCKED') blocked++;

      if (entry.ScriptPath && entry.AutomationStatus === 'AUTOMATED') {
        mapped.push(`${entry.TestCaseId} -> ${entry.ScriptPath}`);
      }
    }

    console.log(`\nTổng Kết Đăng Ký Test Case`);
    console.log(`Tổng số Test Case: ${entries.length}`);
    console.log(`AUTOMATED (Đã tự động hóa): ${automated}`);
    console.log(`IN_PROGRESS (Đang làm): ${inProgress}`);
    console.log(`NOT_AUTOMATED (Chưa tự động hóa): ${notAutomated}`);
    console.log(`BLOCKED (Đang bị chặn): ${blocked}`);

    console.log(`\nĐã xác nhận map tự động hóa:`);
    mapped.forEach((m) => console.log(`- ${m}`));

    if (missing.length > 0) {
      console.log(`\nCác vấn đề map tiềm ẩn:`);
      missing.forEach((m) => console.log(`- ${m}`));
    }

    process.exit(0);
  } catch (err) {
    console.error('Lỗi kiểm tra tính hợp lệ:', err);
    process.exit(1);
  }
};

main();
