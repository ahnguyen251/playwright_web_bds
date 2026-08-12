import { google, gmail_v1 } from 'googleapis';

import type { GmailConfig } from '../../types/environment.types';

export interface GmailMessage {
  readonly id: string;
  readonly internalDate: Date;
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
}

export interface GmailMessageClient {
  search(query: string): Promise<readonly GmailMessage[]>;
}

const headerValue = (
  headers: readonly gmail_v1.Schema$MessagePartHeader[] | null | undefined,
  name: string,
): string => headers?.find((header) => header.name?.toLowerCase() === name)?.value ?? '';

const recipientAddress = (
  headers: readonly gmail_v1.Schema$MessagePartHeader[] | null | undefined,
): string => {
  const recipient = headerValue(headers, 'to');
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(recipient)?.[0] ?? recipient;
};

const decodeBody = (data: string): string => Buffer.from(data, 'base64url').toString('utf8');

const messageBodyParts = (
  part: gmail_v1.Schema$MessagePart,
  mimeType: 'text/plain' | 'text/html',
): string[] => {
  const nestedParts =
    part.parts?.flatMap((nestedPart) => messageBodyParts(nestedPart, mimeType)) ?? [];
  const data = part.body?.data;

  return part.mimeType === mimeType && data !== undefined && data !== null
    ? [decodeBody(data), ...nestedParts]
    : nestedParts;
};

const messageBody = (payload: gmail_v1.Schema$MessagePart): string => {
  const plainTextParts = messageBodyParts(payload, 'text/plain');
  const htmlParts = messageBodyParts(payload, 'text/html');

  return (plainTextParts.length > 0 ? plainTextParts : htmlParts).join('\n');
};

export class GmailApiClient implements GmailMessageClient {
  private readonly gmail: gmail_v1.Gmail;

  public constructor(configuration: GmailConfig) {
    const oauth = new google.auth.OAuth2(configuration.clientId, configuration.clientSecret);
    oauth.setCredentials({ refresh_token: configuration.refreshToken });
    this.gmail = new gmail_v1.Gmail({ auth: oauth });
  }

  public async search(query: string): Promise<readonly GmailMessage[]> {
    const listing = await this.gmail.users.messages.list({ userId: 'me', q: query });
    const messages = await Promise.all(
      (listing.data.messages ?? []).flatMap(async (listedMessage) => {
        if (typeof listedMessage.id !== 'string') {
          return [];
        }

        const response = await this.gmail.users.messages.get({
          userId: 'me',
          id: listedMessage.id,
          format: 'full',
        });
        const rawMessage = response.data;
        const internalDateMilliseconds = Number(rawMessage.internalDate);
        const payload = rawMessage.payload;
        const id = rawMessage.id ?? listedMessage.id;

        if (payload === undefined || !Number.isFinite(internalDateMilliseconds)) {
          return [];
        }

        return [
          {
            id,
            internalDate: new Date(internalDateMilliseconds),
            recipient: recipientAddress(payload.headers),
            subject: headerValue(payload.headers, 'subject'),
            body: messageBody(payload),
          },
        ];
      }),
    );

    return messages.flat();
  }
}
