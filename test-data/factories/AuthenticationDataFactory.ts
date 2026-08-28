import authentication from '../static/authentication.json';
import type { RegistrationData } from '../../types/user.types';
import { RandomDataGenerator } from '../../utils/RandomDataGenerator';

export interface AuthenticationValidationData {
  readonly validPassword: string;
  readonly registrationSuccessCredentials: Readonly<{
    readonly email: string;
    readonly password: string;
    readonly passwordConfirmation: string;
  }>;
  readonly invalidRegistrationEmails: readonly string[];
  readonly invalidRegistrationPasswords: readonly string[];
  readonly passwordRecoveryNewPassword: string;
  readonly nonexistentEmailSource: 'unique-unregistered';
  readonly googleOAuthExecutionMode: 'mock-only';
  readonly googleOAuthExpectedOutcome: Readonly<{
    readonly receivesAccessToken: boolean;
    readonly createsAccountWhenMissing: boolean;
    readonly issuesJwt: boolean;
    readonly redirectsTo: 'home';
  }>;
  readonly unicodeFullName: string;
  readonly mismatchedPassword: string;
  readonly expectedMessages: Readonly<{
    readonly invalidEmail: string;
    readonly duplicateEmail: string;
    readonly invalidPassword: string;
    readonly mismatchedPassword: string;
    readonly invalidCredentials: string;
    readonly lockedAccount: string;
  }>;
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
    throw new Error('ID đăng ký duy nhất phải chứa chữ cái hoặc chữ số');
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

const getNonexistentEmailSource = (): 'unique-unregistered' => {
  if (authentication.nonexistentEmailSource !== 'unique-unregistered') {
    throw new Error('Không hỗ trợ nguồn dữ liệu email không tồn tại');
  }
  return authentication.nonexistentEmailSource;
};

const getGoogleOAuthExecutionMode = (): 'mock-only' => {
  if (authentication.googleOAuthExecutionMode !== 'mock-only') {
    throw new Error('Không hỗ trợ chế độ thực thi Google OAuth');
  }
  return authentication.googleOAuthExecutionMode;
};

const getGoogleOAuthExpectedOutcome =
  (): AuthenticationValidationData['googleOAuthExpectedOutcome'] => {
    if (authentication.googleOAuthExpectedOutcome.redirectsTo !== 'home') {
      throw new Error('Không hỗ trợ đích chuyển hướng Google OAuth');
    }
    return Object.freeze({
      receivesAccessToken: authentication.googleOAuthExpectedOutcome.receivesAccessToken,
      createsAccountWhenMissing:
        authentication.googleOAuthExpectedOutcome.createsAccountWhenMissing,
      issuesJwt: authentication.googleOAuthExpectedOutcome.issuesJwt,
      redirectsTo: 'home',
    });
  };

export class AuthenticationDataFactory {
  public static getValidationData(): AuthenticationValidationData {
    return Object.freeze({
      validPassword: authentication.validPassword,
      registrationSuccessCredentials: Object.freeze({
        ...authentication.registrationSuccessCredentials,
      }),
      invalidRegistrationEmails: Object.freeze([...authentication.invalidRegistrationEmails]),
      invalidRegistrationPasswords: Object.freeze([...authentication.invalidRegistrationPasswords]),
      passwordRecoveryNewPassword: authentication.passwordRecoveryNewPassword,
      nonexistentEmailSource: getNonexistentEmailSource(),
      googleOAuthExecutionMode: getGoogleOAuthExecutionMode(),
      googleOAuthExpectedOutcome: getGoogleOAuthExpectedOutcome(),
      unicodeFullName: authentication.unicodeFullName,
      mismatchedPassword: authentication.mismatchedPassword,
      expectedMessages: Object.freeze({ ...authentication.expectedMessages }),
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

  public static createNonexistentGmailEmail(): string {
    const uniqueId = sanitizeUniqueId(RandomDataGenerator.string('forgotpassword'));
    return `propify.forgot.${uniqueId}@gmail.com`;
  }

  public static createIncorrectOtp(deliveredOtp: string): string {
    if (!/^\d{6}$/.test(deliveredOtp)) {
      throw new Error('OTP provider returned a value outside the six-digit contract.');
    }

    const changedFirstDigit = String((Number(deliveredOtp.charAt(0)) + 1) % 10);
    return `${changedFirstDigit}${deliveredOtp.slice(1)}`;
  }
}
