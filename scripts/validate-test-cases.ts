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
          missing.push(`${entry.TestCaseId} has scriptPath '${entry.ScriptPath}' but is NOT_AUTOMATED.`);
        }
      }
      if (entry.AutomationStatus === 'BLOCKED') blocked++;

      if (entry.ScriptPath && entry.AutomationStatus === 'AUTOMATED') {
        mapped.push(`${entry.TestCaseId} -> ${entry.ScriptPath}`);
      }
    }

    console.log(`\nRegistry Summary`);
    console.log(`Total Test Cases: ${entries.length}`);
    console.log(`AUTOMATED: ${automated}`);
    console.log(`IN_PROGRESS: ${inProgress}`);
    console.log(`NOT_AUTOMATED: ${notAutomated}`);
    console.log(`BLOCKED: ${blocked}`);

    console.log(`\nAutomated mapping confirmed:`);
    mapped.forEach((m) => console.log(`- ${m}`));

    if (missing.length > 0) {
      console.log(`\nPotential mapping issues:`);
      missing.forEach((m) => console.log(`- ${m}`));
    }

    process.exit(0);
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  }
};

main();
