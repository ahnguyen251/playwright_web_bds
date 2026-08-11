import { expect } from '@playwright/test';

import { appointmentTest } from './appointment.fixture';

export const BaseTest = appointmentTest;
export const test = BaseTest;
export { expect };
