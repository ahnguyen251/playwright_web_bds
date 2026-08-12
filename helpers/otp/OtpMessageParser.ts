import type { GmailMessage } from './GmailApiClient';

import type { OtpMailCorrelation, OtpPurpose } from '../../types/otp.types';

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const candidateExpression = (pattern: string): RegExp => {
  const [prefix = '', suffix = ''] = pattern.split('{otp}');
  return new RegExp(
    `${escapeRegularExpression(prefix)}(?<![\\p{L}\\p{N}_])(?<otp>\\d{6})(?![\\p{L}\\p{N}_])${escapeRegularExpression(suffix)}`,
    'gu',
  );
};

export class OtpMessageParser {
  public static extract(
    message: GmailMessage,
    purpose: OtpPurpose,
    correlation: OtpMailCorrelation,
  ): string | undefined {
    void purpose;

    if (
      message.sender.trim().toLowerCase() !== correlation.sender.trim().toLowerCase() ||
      message.subject !== correlation.subject
    ) {
      return undefined;
    }

    const candidates = [...message.body.matchAll(candidateExpression(correlation.pattern))].flatMap(
      (match) => (match.groups?.otp === undefined ? [] : [match.groups.otp]),
    );
    if (candidates.length > 1) {
      throw new Error('Ambiguous OTP message');
    }

    return candidates[0];
  }
}
