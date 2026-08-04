import { expect } from '@playwright/test';

import { workflowTest } from './workflow.fixture';

export const BaseTest = workflowTest;
export const test = BaseTest;
export { expect };
