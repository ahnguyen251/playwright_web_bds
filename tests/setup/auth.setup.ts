import { join } from 'node:path';

import { test as setup } from '../../fixtures/test.fixture';
import { BrowserHelper } from '../../utils/BrowserHelper';

setup('authenticate the default user', async ({ page, authenticationWorkflow, defaultUser }) => {
  await authenticationWorkflow.login(defaultUser);
  await BrowserHelper.saveStorageState(page.context(), join('.auth', 'defaultUser.json'));
});
