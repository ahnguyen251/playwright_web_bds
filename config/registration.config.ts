import { z } from 'zod';

import type { ProductionRegistrationConfig } from '../types/otp.types';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const registrationSchema = z
  .object({
    REGISTRATION_EMAIL_TEMPLATE: z.string().trim().min(1),
    REGISTRATION_FULL_NAME: z.string().trim().min(1),
    REGISTRATION_PASSWORD: z.string().min(1),
    GMAIL_CLIENT_ID: z.string().trim().min(1),
    GMAIL_CLIENT_SECRET: z.string().min(1),
    GMAIL_REFRESH_TOKEN: z.string().min(1),
    GMAIL_OTP_PATTERN: z.string().min(1),
    GMAIL_OTP_SENDER: optionalNonEmptyString,
    GMAIL_OTP_SUBJECT: optionalNonEmptyString,
    GMAIL_OTP_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    GMAIL_OTP_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  })
  .superRefine((data, context) => {
    const uniqueTokenCount = data.REGISTRATION_EMAIL_TEMPLATE.match(/\{unique\}/g)?.length ?? 0;
    if (uniqueTokenCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['REGISTRATION_EMAIL_TEMPLATE'],
        message: 'must contain exactly one {unique} token',
      });
    }

    try {
      const pattern = new RegExp(data.GMAIL_OTP_PATTERN);
      if (!pattern.source.includes('(?<otp>')) {
        context.addIssue({
          code: 'custom',
          path: ['GMAIL_OTP_PATTERN'],
          message: 'must contain a named otp capture',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['GMAIL_OTP_PATTERN'],
        message: 'must be a valid JavaScript regular expression source',
      });
    }

    if (data.GMAIL_OTP_TIMEOUT_MS < data.GMAIL_OTP_POLL_INTERVAL_MS) {
      context.addIssue({
        code: 'custom',
        path: ['GMAIL_OTP_TIMEOUT_MS'],
        message: 'must be greater than or equal to the poll interval',
      });
    }
  });

const formatInvalidKeys = (issues: readonly { readonly path: PropertyKey[] }[]): string =>
  [...new Set(issues.map((issue) => String(issue.path[0] ?? 'environment')))].sort().join(', ');

export const isProductionRegistrationEnabled = (source: NodeJS.ProcessEnv = process.env): boolean =>
  source.RUN_PRODUCTION_REGISTRATION_E2E === 'true';

export const loadProductionRegistrationConfig = (
  source: NodeJS.ProcessEnv = process.env,
): ProductionRegistrationConfig => {
  const parsed = registrationSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid production registration configuration: ${formatInvalidKeys(parsed.error.issues)}`,
    );
  }

  const gmail = Object.freeze({
    clientId: parsed.data.GMAIL_CLIENT_ID,
    clientSecret: parsed.data.GMAIL_CLIENT_SECRET,
    refreshToken: parsed.data.GMAIL_REFRESH_TOKEN,
    otpPattern: new RegExp(parsed.data.GMAIL_OTP_PATTERN),
    timeoutMs: parsed.data.GMAIL_OTP_TIMEOUT_MS,
    pollIntervalMs: parsed.data.GMAIL_OTP_POLL_INTERVAL_MS,
    ...(parsed.data.GMAIL_OTP_SENDER === undefined ? {} : { sender: parsed.data.GMAIL_OTP_SENDER }),
    ...(parsed.data.GMAIL_OTP_SUBJECT === undefined
      ? {}
      : { subject: parsed.data.GMAIL_OTP_SUBJECT }),
  });

  return Object.freeze({
    fullName: parsed.data.REGISTRATION_FULL_NAME,
    emailTemplate: parsed.data.REGISTRATION_EMAIL_TEMPLATE,
    password: parsed.data.REGISTRATION_PASSWORD,
    gmail,
  });
};
