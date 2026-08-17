import { test, expect } from '@playwright/test';
import { TestCaseRegistry } from '../../../utils/TestCaseRegistry';
import { buildTestTitle, parseTestCaseId } from '../../../utils/test-tracking';
import type { TestCaseDefinition } from '../../../types/test-case.types';

const mockBaseTestCase: Omit<TestCaseDefinition, 'id' | 'automation'> = {
  title: 'Mock Title',
  module: 'Mock Module',
  priority: 'low',
  tags: [],
  preconditions: [],
  expectedResult: 'Mock expected',
};

test('Registry accept unique IDs', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    { ...mockBaseTestCase, id: 'TC-1', automation: { status: 'NOT_AUTOMATED' } },
    { ...mockBaseTestCase, id: 'TC-2', automation: { status: 'NOT_AUTOMATED' } },
  ];
  const entries = registry.validate(cases);
  expect(entries).toHaveLength(2);
});

test('Duplicate TestCaseId -> fail', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    { ...mockBaseTestCase, id: 'TC-1', automation: { status: 'NOT_AUTOMATED' } },
    { ...mockBaseTestCase, id: 'TC-1', automation: { status: 'NOT_AUTOMATED' } },
  ];
  expect(() => registry.validate(cases)).toThrow('Duplicate TestCaseId detected: TC-1');
});

test('AUTOMATED without scriptPath -> fail', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    { ...mockBaseTestCase, id: 'TC-1', automation: { status: 'AUTOMATED' } },
  ];
  expect(() => registry.validate(cases)).toThrow(
    'TestCase TC-1 is marked as AUTOMATED but missing scriptPath.',
  );
});

test('AUTOMATED with missing file -> fail', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    {
      ...mockBaseTestCase,
      id: 'TC-1',
      automation: { status: 'AUTOMATED', scriptPath: 'invalid/path.ts' },
    },
  ];
  expect(() => registry.validate(cases)).toThrow('does not exist');
});

test('IN_PROGRESS without scriptPath -> valid', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    { ...mockBaseTestCase, id: 'TC-1', automation: { status: 'IN_PROGRESS' } },
  ];
  const entries = registry.validate(cases);
  expect(entries[0]!.AutomationStatus).toBe('IN_PROGRESS');
});

test('IN_PROGRESS with existing scriptPath -> valid', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    {
      ...mockBaseTestCase,
      id: 'TC-1',
      automation: { status: 'IN_PROGRESS', scriptPath: 'tsconfig.json' },
    },
  ];
  const entries = registry.validate(cases);
  expect(entries[0]!.AutomationStatus).toBe('IN_PROGRESS');
});

test('BLOCKED without scriptPath -> valid', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    { ...mockBaseTestCase, id: 'TC-1', automation: { status: 'BLOCKED' } },
  ];
  const entries = registry.validate(cases);
  expect(entries[0]!.AutomationStatus).toBe('BLOCKED');
});

test('NOT_AUTOMATED without scriptPath -> valid', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    { ...mockBaseTestCase, id: 'TC-1', automation: { status: 'NOT_AUTOMATED' } },
  ];
  const entries = registry.validate(cases);
  expect(entries[0]!.AutomationStatus).toBe('NOT_AUTOMATED');
});

test('Any provided scriptPath that does not exist -> fail', () => {
  const registry = new TestCaseRegistry();
  const cases: TestCaseDefinition[] = [
    {
      ...mockBaseTestCase,
      id: 'TC-1',
      automation: { status: 'NOT_AUTOMATED', scriptPath: 'nope.ts' },
    },
  ];
  expect(() => registry.validate(cases)).toThrow('does not exist');
});

test('buildTestTitle() -> correct standardized format', () => {
  const result = buildTestTitle({ id: 'TC-1', title: 'Example' });
  expect(result).toBe('TC-1 - Example');
});

test('parseTestCaseId(valid title) -> correct ID', () => {
  const result = parseTestCaseId('TC-AUTH-001 - Some title here');
  expect(result).toBe('TC-AUTH-001');
});

test('parseTestCaseId(invalid title) -> null', () => {
  const result = parseTestCaseId('Invalid Title format without ID first');
  expect(result).toBeNull();
});
