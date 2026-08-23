export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export type AutomationStatus =
  | 'NOT_AUTOMATED'
  | 'IN_PROGRESS'
  | 'AUTOMATED'
  | 'BLOCKED';

export interface AutomationMetadata {
  readonly status: AutomationStatus;
  readonly scriptPath?: string;
}

export interface TestCaseDefinition {
  readonly id: string;
  readonly title: string;
  readonly module: string;
  readonly priority: TestPriority;
  readonly tags: readonly string[];
  readonly preconditions: readonly string[];
  readonly testData?: string;
  readonly testSteps?: string;
  readonly expectedResult: string;
  readonly browserVersion?: string;
  readonly actualResult?: string;
  readonly executionDate?: string;
  readonly evidence?: string;
  readonly automation: AutomationMetadata;
}

export type TestClassification = 'read-only' | 'mutating';

export interface ListingTestCaseDefinition extends TestCaseDefinition {
  readonly requirementId?: string;
  readonly scenario?: string;
  readonly classification?: TestClassification;
  readonly requiredUserState?: string;
  readonly requiredListingState?: string;
  readonly playwrightTest?: string;
  readonly language?: 'vi';
}
