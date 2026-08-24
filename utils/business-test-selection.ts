import type { TestCaseDefinition } from '../types/test-case.types';

export const BUSINESS_PROJECTS = Object.freeze([
  'framework',
  'chromium',
  'mutating-chromium',
  'appointment-mutating-chromium',
  'production-registration-chromium',
]);

export interface BusinessCatalogSelection {
  readonly CatalogTotal: number;
  readonly AutomatedIds: readonly string[];
  readonly NotAutomatedIds: readonly string[];
  readonly GrepSource: string;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createBusinessCatalogSelection = (
  testCases: readonly TestCaseDefinition[],
): BusinessCatalogSelection => {
  const seen = new Set<string>();
  for (const testCase of testCases) {
    if (seen.has(testCase.id)) {
      throw new Error(`Duplicate TestCaseId detected: ${testCase.id}`);
    }
    seen.add(testCase.id);
  }

  const automatedIds = testCases
    .filter(({ automation }) => automation.status === 'AUTOMATED')
    .map(({ id }) => id)
    .sort();
  const notAutomatedIds = testCases
    .filter(({ automation }) => automation.status !== 'AUTOMATED')
    .map(({ id }) => id)
    .sort();

  if (automatedIds.length === 0) {
    throw new Error('No automated business test cases are registered.');
  }

  return {
    CatalogTotal: testCases.length,
    AutomatedIds: Object.freeze(automatedIds),
    NotAutomatedIds: Object.freeze(notAutomatedIds),
    GrepSource: `(?:^|\\s)(?:${automatedIds.map(escapeRegex).join('|')})(?=\\s|$)`,
  };
};

const safeForwardedArgs = new Set(['--list']);

export const validateBusinessRunnerArgs = (args: readonly string[]): void => {
  const forbidden = args.find((arg) => !safeForwardedArgs.has(arg));
  if (forbidden) {
    throw new Error(
      `${forbidden} cannot be forwarded; selection and safety options are controlled by test:business.`,
    );
  }
};

export const buildBusinessPlaywrightArgs = (
  selection: BusinessCatalogSelection,
  forwardedArgs: readonly string[],
): string[] => {
  validateBusinessRunnerArgs(forwardedArgs);
  return [
    'test',
    ...BUSINESS_PROJECTS.map((project) => `--project=${project}`),
    '--grep',
    selection.GrepSource,
    ...forwardedArgs,
  ];
};
