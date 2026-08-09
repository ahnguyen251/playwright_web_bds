import { expect } from '@playwright/test';

import { listingStateTest } from './listing-state.fixture';

export const BaseTest = listingStateTest;
export const test = BaseTest;
export { expect };
