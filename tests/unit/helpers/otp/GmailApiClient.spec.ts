import { expect, test } from '@playwright/test';

import { GmailApiClient, GmailApiError } from '../../../../helpers/otp/GmailApiClient';
import type { GmailOtpConfig } from '../../../../types/otp.types';

const config = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  otpPattern: 'Code: {otp}',
  subject: 'Verify registration',
  timeoutMs: 60_000,
  pollIntervalMs: 2_000,
} satisfies GmailOtpConfig;

interface FetchCall {
  readonly url: string;
  readonly init?: RequestInit;
}

const requestUrl = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

const formBody = (body: BodyInit | null | undefined): string =>
  body instanceof URLSearchParams ? body.toString() : '';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

test('refreshes once, paginates Gmail list, and keeps the token out of URLs', async () => {
  const calls: FetchCall[] = [];
  const responses = [
    jsonResponse({ access_token: 'access-token' }),
    jsonResponse({ messages: [{ id: 'message-1' }], nextPageToken: 'page-2' }),
    jsonResponse({ messages: [{ id: 'message-2' }] }),
  ];
  const fetchImpl: typeof fetch = (input, init) => {
    calls.push({ url: requestUrl(input), ...(init === undefined ? {} : { init }) });
    const response = responses.shift();
    return response === undefined
      ? Promise.reject(new Error('Unexpected fetch call.'))
      : Promise.resolve(response);
  };

  const client = new GmailApiClient(config, fetchImpl);
  await expect(client.listMessageIds('after:2026/08/11')).resolves.toEqual([
    'message-1',
    'message-2',
  ]);

  expect(calls).toHaveLength(3);
  expect(calls[0]?.url).toBe('https://oauth2.googleapis.com/token');
  expect(calls[0]?.init?.method).toBe('POST');
  expect(new Headers(calls[0]?.init?.headers).get('content-type')).toBe(
    'application/x-www-form-urlencoded',
  );
  expect(formBody(calls[0]?.init?.body)).toBe(
    'client_id=client-id&client_secret=client-secret&refresh_token=refresh-token&grant_type=refresh_token',
  );

  const firstListUrl = new URL(calls[1]?.url ?? '');
  expect(firstListUrl.origin + firstListUrl.pathname).toBe(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages',
  );
  expect(firstListUrl.searchParams.get('q')).toBe('after:2026/08/11');
  expect(firstListUrl.searchParams.get('maxResults')).toBe('100');
  expect(firstListUrl.searchParams.has('pageToken')).toBe(false);
  expect(new Headers(calls[1]?.init?.headers).get('authorization')).toBe('Bearer access-token');

  const secondListUrl = new URL(calls[2]?.url ?? '');
  expect(secondListUrl.searchParams.get('pageToken')).toBe('page-2');
  expect(calls.slice(1).every((call) => !call.url.includes('access-token'))).toBe(true);
});

test('gets a full Gmail message using an encoded message id', async () => {
  const calls: FetchCall[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    calls.push({ url: requestUrl(input), ...(init === undefined ? {} : { init }) });
    if (calls.length === 1) {
      return Promise.resolve(jsonResponse({ access_token: 'access-token' }));
    }
    return Promise.resolve(
      jsonResponse({
        id: 'message/id',
        internalDate: '1723370400123',
        payload: { mimeType: 'text/plain', headers: [] },
      }),
    );
  };

  const message = await new GmailApiClient(config, fetchImpl).getMessage('message/id');

  expect(message.id).toBe('message/id');
  expect(calls[1]?.url).toBe(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/message%2Fid?format=full',
  );
});

test('sanitizes OAuth failures without exposing response bodies or credentials', async () => {
  const fetchImpl: typeof fetch = () =>
    Promise.resolve(new Response('client-secret refresh-token provider-details', { status: 400 }));

  const error = await new GmailApiClient(config, fetchImpl)
    .listMessageIds('after:2026/08/11')
    .catch((reason: unknown) => reason);

  expect(error).toBeInstanceOf(GmailApiError);
  expect(String(error)).toContain('Gmail OAuth authentication failed.');
  expect(String(error)).not.toContain('client-secret');
  expect(String(error)).not.toContain('refresh-token');
  expect(String(error)).not.toContain('provider-details');
});

for (const scenario of [
  {
    status: 401,
    expected: 'Gmail API authentication failed with status 401.',
  },
  {
    status: 403,
    expected:
      'Gmail API permission denied with status 403; verify API access and gmail.readonly scope.',
  },
] as const) {
  test(`reports a sanitized Gmail ${String(scenario.status)} error`, async () => {
    let callCount = 0;
    const fetchImpl: typeof fetch = () => {
      callCount += 1;
      return Promise.resolve(
        callCount === 1
          ? jsonResponse({ access_token: 'access-token' })
          : new Response('sensitive provider body', { status: scenario.status }),
      );
    };

    const error = await new GmailApiClient(config, fetchImpl)
      .listMessageIds('after:2026/08/11')
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(GmailApiError);
    expect(String(error)).toContain(scenario.expected);
    expect(String(error)).not.toContain('sensitive provider body');
  });
}

test('rejects malformed Gmail response shapes without returning provider data', async () => {
  let callCount = 0;
  const fetchImpl: typeof fetch = () => {
    callCount += 1;
    return Promise.resolve(
      callCount === 1
        ? jsonResponse({ access_token: 'access-token' })
        : jsonResponse({ messages: [{ id: 123 }], private: 'provider-data' }),
    );
  };

  const error = await new GmailApiClient(config, fetchImpl)
    .listMessageIds('after:2026/08/11')
    .catch((reason: unknown) => reason);

  expect(String(error)).toContain('Gmail API returned an invalid message list.');
  expect(String(error)).not.toContain('provider-data');
});
