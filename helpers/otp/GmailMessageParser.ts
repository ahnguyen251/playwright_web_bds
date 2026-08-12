export interface GmailMessageHeader {
  readonly name: string;
  readonly value: string;
}

export interface GmailMessagePart {
  readonly mimeType?: string;
  readonly headers?: readonly GmailMessageHeader[];
  readonly body?: {
    readonly data?: string;
  };
  readonly parts?: readonly GmailMessagePart[];
}

export interface GmailMessage {
  readonly id: string;
  readonly internalDate?: string;
  readonly payload: GmailMessagePart;
}

export interface ParsedGmailMessage {
  readonly id: string;
  readonly internalDate: number;
  readonly from?: string;
  readonly to?: string;
  readonly subject?: string;
  readonly body: string;
}

const decodeInlineText = (part: GmailMessagePart): string[] => {
  const decoded: string[] = [];

  if (
    (part.mimeType === 'text/plain' || part.mimeType === 'text/html') &&
    part.body?.data !== undefined
  ) {
    decoded.push(Buffer.from(part.body.data, 'base64url').toString('utf8'));
  }

  for (const child of part.parts ?? []) {
    decoded.push(...decodeInlineText(child));
  }

  return decoded;
};

const findHeader = (
  headers: readonly GmailMessageHeader[] | undefined,
  expectedName: string,
): string | undefined =>
  headers?.find((header) => header.name.toLowerCase() === expectedName)?.value;

export class GmailMessageParser {
  public static parse(message: GmailMessage): ParsedGmailMessage {
    const internalDate = Number(message.internalDate);
    if (message.internalDate === undefined || !Number.isFinite(internalDate)) {
      throw new Error('Gmail message has an invalid internalDate.');
    }

    const from = findHeader(message.payload.headers, 'from');
    const to = findHeader(message.payload.headers, 'to');
    const subject = findHeader(message.payload.headers, 'subject');

    return {
      id: message.id,
      internalDate,
      ...(from === undefined ? {} : { from }),
      ...(to === undefined ? {} : { to }),
      ...(subject === undefined ? {} : { subject }),
      body: decodeInlineText(message.payload).join('\n'),
    };
  }

  public static extractOtp(body: string, pattern: string): string | undefined {
    const [prefix = '', suffix = ''] = pattern.split('{otp}');
    const escapeRegularExpression = (value: string): string =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(
      `${escapeRegularExpression(prefix)}(?<![\\p{L}\\p{N}_])(?<otp>\\d{6})(?![\\p{L}\\p{N}_])${escapeRegularExpression(suffix)}`,
      'u',
    );
    const match = expression.exec(body);
    const otp = match?.groups?.otp;
    return otp !== undefined && /^\d{6}$/.test(otp) ? otp : undefined;
  }
}
