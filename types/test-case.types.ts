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
  readonly expectedResult: string;
  readonly automation: AutomationMetadata;
}

export type ListingRequirementId =
  'UC-08' | 'UC-09' | 'UC-10' | 'UC-11-EDIT' | 'UC-11-WITHDRAW' | 'UC-12' | 'UC-16' | 'UC-17';

export type TestClassification = 'read-only' | 'mutating';

export interface ListingTestCaseDefinition extends TestCaseDefinition {
  readonly requirementId: ListingRequirementId;
  readonly scenario: string;
  readonly classification: TestClassification;
  readonly testData: string;
  readonly requiredUserState: string;
  readonly requiredListingState: string;
  readonly playwrightTest: string;
  readonly language: 'vi';
}
