import type { TestCaseDefinition } from '../types/test-case.types';

/**
 * Builds a standardized test title from a TestCaseDefinition.
 * Format: "TestCaseId - Title"
 */
export const buildTestTitle = (testCase: Pick<TestCaseDefinition, 'id' | 'title'>): string => {
  return `${testCase.id} - ${testCase.title}`;
};

/**
 * Parses a TestCaseId from a standardized test title.
 * Returns null if the title does not match the expected format.
 */
export const parseTestCaseId = (title: string): string | null => {
  const match = /^(TC-[A-Za-z0-9_-]+|[a-zA-Z0-9-]+)(?:\s+-|\s+\[|\s+)/.exec(title);
  const candidate = match?.[1];
  if (candidate === undefined) return null;
  if (candidate.startsWith('TC-')) return candidate;
  return /^([a-zA-Z0-9-]+)\s+-/.exec(title)?.[1] ?? null;
};
