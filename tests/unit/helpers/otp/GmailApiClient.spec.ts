import { expect, test } from '@playwright/test';

import { GmailApiClient } from '../../../../helpers/otp/GmailApiClient';

test('prefers the text body over a duplicate HTML alternative', async () => {
  const client = new GmailApiClient({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
    mailboxAddress: 'automation@gmail.com',
  });
  const gmail = {
    users: {
      messages: {
        list: () => Promise.resolve({ data: { messages: [{ id: 'message-1' }] } }),
        get: () =>
          Promise.resolve({
            data: {
              id: 'message-1',
              internalDate: '1785888001000',
              payload: {
                headers: [
                  { name: 'To', value: 'automation+auth-1@gmail.com' },
                  { name: 'Subject', value: 'Propify password recovery' },
                ],
                mimeType: 'multipart/alternative',
                parts: [
                  { mimeType: 'text/plain', body: { data: 'VXNlIDMzMzMzMy4=' } },
                  { mimeType: 'text/html', body: { data: 'PHAgPlVzZSAzMzMzMzM8L3A+' } },
                ],
              },
            },
          }),
      },
    },
  };
  Object.defineProperty(client, 'gmail', { value: gmail });

  await expect(client.search('to:automation+auth-1@gmail.com')).resolves.toEqual([
    {
      id: 'message-1',
      internalDate: new Date('2026-08-05T00:00:01Z'),
      recipient: 'automation+auth-1@gmail.com',
      subject: 'Propify password recovery',
      body: 'Use 333333.',
    },
  ]);
});

test('normalizes a display-name recipient for exact alias correlation', async () => {
  const client = new GmailApiClient({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
    mailboxAddress: 'automation@gmail.com',
  });
  const gmail = {
    users: {
      messages: {
        list: () => Promise.resolve({ data: { messages: [{ id: 'message-2' }] } }),
        get: () =>
          Promise.resolve({
            data: {
              id: 'message-2',
              internalDate: '1785888001000',
              payload: {
                headers: [
                  { name: 'To', value: 'Propify Automation <automation+auth-1@gmail.com>' },
                  { name: 'Subject', value: 'Propify password recovery' },
                ],
                mimeType: 'text/plain',
                body: { data: 'VXNlIDMzMzMzMy4=' },
              },
            },
          }),
      },
    },
  };
  Object.defineProperty(client, 'gmail', { value: gmail });

  const messages = await client.search('to:automation+auth-1@gmail.com');

  expect(messages[0]?.recipient).toBe('automation+auth-1@gmail.com');
});
