import authentication from '../static/authentication.json';
import type { RegistrationData } from '../../types/user.types';
import { RandomDataGenerator } from '../../utils/RandomDataGenerator';

export interface AuthenticationValidationData {
  readonly validPassword: string;
  readonly belowMinimumPassword: string;
  readonly invalidEmails: readonly string[];
  readonly unicodeFullName: string;
  readonly mismatchedPassword: string;
}

export interface RegistrationDataOverrides {
  readonly uniqueId?: string;
  readonly fullName?: string;
  readonly password?: string;
  readonly passwordConfirmation?: string;
}

const sanitizeUniqueId = (value: string): string => {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!sanitized) {
    throw new Error('Registration unique ID must contain a letter or number');
  }
  return sanitized;
};

const getGmailLocalPart = (mailbox: string): string => {
  const normalizedMailbox = mailbox.trim().toLowerCase();
  const match = /^([^+@]+)@gmail\.com$/.exec(normalizedMailbox);

  const localPart = match?.[1];
  if (!localPart) {
    throw new Error('Gmail mailbox is required for registration aliases');
  }

  return localPart;
};

export class AuthenticationDataFactory {
  public static getValidationData(): AuthenticationValidationData {
    return Object.freeze({
      validPassword: authentication.validPassword,
      belowMinimumPassword: authentication.belowMinimumPassword,
      invalidEmails: Object.freeze([...authentication.invalidEmails]),
      unicodeFullName: authentication.unicodeFullName,
      mismatchedPassword: authentication.mismatchedPassword,
    });
  }

  public static createRegistration(
    baseMailbox: string,
    overrides: RegistrationDataOverrides = {},
  ): RegistrationData {
    const uniqueId = sanitizeUniqueId(
      overrides.uniqueId ?? RandomDataGenerator.string('authentication'),
    );
    const validationData = AuthenticationDataFactory.getValidationData();
    const password = overrides.password ?? validationData.validPassword;

    return Object.freeze({
      fullName: overrides.fullName ?? `Automation User ${uniqueId}`,
      email: `${getGmailLocalPart(baseMailbox)}+auth-${uniqueId}@gmail.com`,
      password,
      passwordConfirmation: overrides.passwordConfirmation ?? password,
    });
  }
}
