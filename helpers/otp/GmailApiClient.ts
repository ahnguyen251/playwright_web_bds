import type { GmailOtpConfig } from '../../types/otp.types';
import type { GmailMessage, GmailMessageHeader, GmailMessagePart } from './GmailMessageParser';

export interface GmailClient {
  listMessageIds(query: string): Promise<readonly string[]>;
  getMessage(id: string): Promise<GmailMessage>;
}

export class GmailApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GmailApiError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isHeader = (value: unknown): value is GmailMessageHeader =>
  isRecord(value) && typeof value.name === 'string' && typeof value.value === 'string';

const isMessageReferenceArray = (value: unknown): value is readonly { readonly id: string }[] =>
  Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === 'string');

const parseMessagePart = (value: unknown): GmailMessagePart | undefined => {
  if (!isRecord(value)) return undefined;
  if (value.mimeType !== undefined && typeof value.mimeType !== 'string') return undefined;

  let headers: readonly GmailMessageHeader[] | undefined;
  if (value.headers !== undefined) {
    if (!Array.isArray(value.headers) || !value.headers.every(isHeader)) return undefined;
    headers = value.headers;
  }

  let body: GmailMessagePart['body'];
  if (value.body !== undefined) {
    if (!isRecord(value.body)) return undefined;
    if (value.body.data !== undefined && typeof value.body.data !== 'string') return undefined;
    body = value.body.data === undefined ? {} : { data: value.body.data };
  }

  let parts: readonly GmailMessagePart[] | undefined;
  if (value.parts !== undefined) {
    if (!Array.isArray(value.parts)) return undefined;
    const parsedParts = value.parts.map(parseMessagePart);
    if (parsedParts.some((part) => part === undefined)) return undefined;
    parts = parsedParts as GmailMessagePart[];
  }

  return {
    ...(value.mimeType === undefined ? {} : { mimeType: value.mimeType }),
    ...(headers === undefined ? {} : { headers }),
    ...(body === undefined ? {} : { body }),
    ...(parts === undefined ? {} : { parts }),
  };
};

export class GmailApiClient implements GmailClient {
  private accessToken?: string;

  public constructor(
    private readonly config: GmailOtpConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  public async listMessageIds(query: string): Promise<readonly string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.set('q', query);
      url.searchParams.set('maxResults', '100');
      if (pageToken !== undefined) url.searchParams.set('pageToken', pageToken);

      const payload = await this.gmailGet(url);
      if (!isRecord(payload)) {
        throw new GmailApiError('Gmail API returned an invalid message list.', 200);
      }

      const messages = payload.messages;
      if (messages !== undefined && !isMessageReferenceArray(messages)) {
        throw new GmailApiError('Gmail API returned an invalid message list.', 200);
      }

      if (messages !== undefined) {
        ids.push(...messages.map((item) => item.id));
      }

      if (payload.nextPageToken !== undefined && typeof payload.nextPageToken !== 'string') {
        throw new GmailApiError('Gmail API returned an invalid message list.', 200);
      }
      pageToken = payload.nextPageToken;
    } while (pageToken !== undefined);

    return ids;
  }

  public async getMessage(id: string): Promise<GmailMessage> {
    const url = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
    );
    url.searchParams.set('format', 'full');

    const payload = await this.gmailGet(url);
    if (
      !isRecord(payload) ||
      typeof payload.id !== 'string' ||
      typeof payload.internalDate !== 'string'
    ) {
      throw new GmailApiError('Gmail API returned an invalid message.', 200);
    }
    const parsedPayload = parseMessagePart(payload.payload);
    if (parsedPayload === undefined) {
      throw new GmailApiError('Gmail API returned an invalid message.', 200);
    }

    return {
      id: payload.id,
      internalDate: payload.internalDate,
      payload: parsedPayload,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken !== undefined) return this.accessToken;

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      grant_type: 'refresh_token',
    });
    const response = await this.fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new GmailApiError('Gmail OAuth authentication failed.', response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GmailApiError('Gmail OAuth authentication failed.', response.status);
    }
    if (!isRecord(payload) || typeof payload.access_token !== 'string') {
      throw new GmailApiError('Gmail OAuth authentication failed.', response.status);
    }

    this.accessToken = payload.access_token;
    return this.accessToken;
  }

  private async gmailGet(url: URL): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      headers: { authorization: `Bearer ${await this.getAccessToken()}` },
    });
    if (response.status === 401) {
      throw new GmailApiError('Gmail API authentication failed with status 401.', 401);
    }
    if (response.status === 403) {
      throw new GmailApiError(
        'Gmail API permission denied with status 403; verify API access and gmail.readonly scope.',
        403,
      );
    }
    if (!response.ok) {
      throw new GmailApiError(
        `Gmail API request failed with status ${String(response.status)}.`,
        response.status,
      );
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw new GmailApiError('Gmail API returned an invalid JSON response.', response.status);
    }
  }
}
