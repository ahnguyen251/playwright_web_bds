import { z } from 'zod';

const absoluteUrl = z
  .string()
  .trim()
  .pipe(z.url())
  .transform((value) => new URL(value).toString());

export const environmentSchema = z
  .object({
    TEST_ENV: z.enum(['dev', 'staging', 'production']).default('production'),
    DEV_BASE_URL: absoluteUrl,
    STAGING_BASE_URL: absoluteUrl,
    PRODUCTION_BASE_URL: absoluteUrl,
    API_BASE_URL: absoluteUrl.optional(),
    DEFAULT_USER_EMAIL: z.string().trim().pipe(z.email()),
    DEFAULT_USER_PASSWORD: z.string().min(1),
    CI: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    RUN_OTP_E2E: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    RUN_MUTATING_E2E: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    GMAIL_CLIENT_ID: z.string().trim().min(1).optional(),
    GMAIL_CLIENT_SECRET: z.string().trim().min(1).optional(),
    GMAIL_REFRESH_TOKEN: z.string().trim().min(1).optional(),
    OTP_MAILBOX_ADDRESS: z.string().trim().pipe(z.email()).optional(),
    MUTATING_USER_EMAIL: z.string().trim().pipe(z.email()).optional(),
    MUTATING_USER_BASELINE_PASSWORD: z.string().min(8).optional(),
    MUTATING_USER_BASELINE_NAME: z.string().trim().min(1).optional(),
    OTP_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(2_000),
    OTP_TIMEOUT_MS: z.coerce.number().int().min(5_000).default(60_000),
  })
  .superRefine((environment, context) => {
    if (environment.RUN_OTP_E2E) {
      const gmailKeys = [
        ['GMAIL_CLIENT_ID', environment.GMAIL_CLIENT_ID],
        ['GMAIL_CLIENT_SECRET', environment.GMAIL_CLIENT_SECRET],
        ['GMAIL_REFRESH_TOKEN', environment.GMAIL_REFRESH_TOKEN],
        ['OTP_MAILBOX_ADDRESS', environment.OTP_MAILBOX_ADDRESS],
      ] as const;

      for (const [key, value] of gmailKeys) {
        if (value === undefined) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when RUN_OTP_E2E is enabled`,
          });
        }
      }
    }

    if (environment.RUN_MUTATING_E2E) {
      if (!environment.RUN_OTP_E2E) {
        context.addIssue({
          code: 'custom',
          path: ['RUN_MUTATING_E2E'],
          message: 'RUN_MUTATING_E2E requires RUN_OTP_E2E',
        });
      }

      const mutatingUserKeys = [
        ['MUTATING_USER_EMAIL', environment.MUTATING_USER_EMAIL],
        ['MUTATING_USER_BASELINE_PASSWORD', environment.MUTATING_USER_BASELINE_PASSWORD],
        ['MUTATING_USER_BASELINE_NAME', environment.MUTATING_USER_BASELINE_NAME],
      ] as const;

      for (const [key, value] of mutatingUserKeys) {
        if (value === undefined) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when RUN_MUTATING_E2E is enabled`,
          });
        }
      }
    }
  });

export type ValidatedEnvironment = z.infer<typeof environmentSchema>;
