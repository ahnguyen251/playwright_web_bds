export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TestCaseDefinition {
  readonly id: string;
  readonly title: string;
  readonly module: string;
  readonly priority: TestPriority;
  readonly tags: readonly string[];
  readonly preconditions: readonly string[];
  readonly expectedResult: string;
}
