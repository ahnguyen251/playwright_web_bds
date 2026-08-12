import { expect, test } from '@playwright/test';

import { LoginWorkflow } from '../../../../workflows/authentication/LoginWorkflow';
import type { UserCredentials } from '../../../../types/user.types';

const credentials: UserCredentials = {
  alias: 'defaultUser',
  email: 'automation@example.test',
  password: 'Strong!123',
};

test('logs in through the home page and waits for the authenticated state in exact order', async () => {
  const calls: string[] = [];
  const loginPage = {
    openHome: () => {
      calls.push('open home');
      return Promise.resolve();
    },
    open: () => {
      calls.push('open modal');
      return Promise.resolve();
    },
    submitCredentials: (actualCredentials: UserCredentials) => {
      expect(actualCredentials).toEqual(credentials);
      calls.push('submit credentials');
      return Promise.resolve();
    },
  };
  const header = {
    waitForAuthenticated: () => {
      calls.push('wait authenticated');
      return Promise.resolve();
    },
    logout: () => Promise.resolve(),
    isAuthenticated: () => Promise.resolve(true),
  };

  await new LoginWorkflow(loginPage, header).login(credentials);

  expect(calls).toEqual(['open home', 'open modal', 'submit credentials', 'wait authenticated']);
});

test('delegates logout and authentication checks to the header', async () => {
  const calls: string[] = [];
  const loginPage = {
    openHome: () => Promise.resolve(),
    open: () => Promise.resolve(),
    submitCredentials: () => Promise.resolve(),
  };
  const header = {
    waitForAuthenticated: () => Promise.resolve(),
    logout: () => {
      calls.push('logout');
      return Promise.resolve();
    },
    isAuthenticated: () => {
      calls.push('is authenticated');
      return Promise.resolve(true);
    },
  };
  const workflow = new LoginWorkflow(loginPage, header);

  await workflow.logout();
  const authenticated = await workflow.isAuthenticated();

  expect(authenticated).toBe(true);
  expect(calls).toEqual(['logout', 'is authenticated']);
});
