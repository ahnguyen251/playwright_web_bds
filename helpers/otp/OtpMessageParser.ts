import type { GmailMessage } from './GmailApiClient';

import type { OtpPurpose } from '../../types/otp.types';

const purposeSignals: Readonly<Record<OtpPurpose, RegExp>> = {
  registration:
    /xác\s+thực\s+tài\s+khoản|verify\s+(?:your\s+)?(?:account|email)|account\s+verification|registration/i,
  passwordRecovery:
    /khôi\s+phục\s+mật\s+khẩu|đặt\s+lại\s+mật\s+khẩu|password\s+(?:recovery|reset)|reset\s+(?:your\s+)?password/i,
};

const candidatePattern = /(?<!\d)\d{6}(?!\d)/g;

export class OtpMessageParser {
  public static extract(message: GmailMessage, purpose: OtpPurpose): string | undefined {
    const content = `${message.subject}\n${message.body}`;

    if (!/\bPropify\b/i.test(content) || !purposeSignals[purpose].test(content)) {
      return undefined;
    }

    const candidates = content.match(candidatePattern) ?? [];
    if (candidates.length > 1) {
      throw new Error('Ambiguous OTP message');
    }

    return candidates[0];
  }
}
