import { z } from 'zod';

const absoluteUrl = z
  .string()
  .trim()
  .pipe(z.url())
  .transform((value) => new URL(value).toString());

const optionalPositiveInteger = z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const otpPattern = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => value.split('{otp}').length === 2, {
    message: 'GMAIL_OTP_PATTERN phải chứa đúng một placeholder {otp} dạng literal',
  });

export const environmentSchema = z
  .object({
    TEST_ENV: z.literal('production'),
    PRODUCTION_BASE_URL: absoluteUrl,
    API_BASE_URL: absoluteUrl.optional(),
    DEFAULT_USER_EMAIL: z.string().trim().pipe(z.email()),
    DEFAULT_USER_PASSWORD: z.string().min(1),
    LOCKED_USER_EMAIL: z.string().trim().pipe(z.email()).optional(),
    LOCKED_USER_PASSWORD: z.string().min(1).optional(),
    APPOINTMENT_LISTING_ID: optionalPositiveInteger,
    CI: booleanFlag,
    RUN_OTP_E2E: booleanFlag,
    RUN_MUTATING_E2E: booleanFlag,
    RUN_PRODUCTION_REGISTRATION_E2E: booleanFlag,
    RUN_PRODUCTION_MUTATING_E2E: booleanFlag,
    ALLOW_MUTATING_E2E: booleanFlag,
    GMAIL_CLIENT_ID: z.string().trim().min(1).optional(),
    GMAIL_CLIENT_SECRET: z.string().trim().min(1).optional(),
    GMAIL_REFRESH_TOKEN: z.string().trim().min(1).optional(),
    OTP_MAILBOX_ADDRESS: z.string().trim().pipe(z.email()).optional(),
    GMAIL_OTP_SENDER: z.string().trim().pipe(z.email()).optional(),
    GMAIL_OTP_SUBJECT: z.string().trim().min(1).max(200).optional(),
    GMAIL_OTP_PATTERN: otpPattern.optional(),
    MUTATING_USER_EMAIL: z.string().trim().pipe(z.email()).optional(),
    MUTATING_USER_BASELINE_PASSWORD: z.string().min(8).optional(),
    MUTATING_USER_BASELINE_NAME: z.string().trim().min(1).optional(),
    OTP_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(2_000),
    OTP_TIMEOUT_MS: z.coerce.number().int().min(5_000).default(60_000),
  })
  .superRefine((environment, context) => {
    if (environment.LOCKED_USER_EMAIL && !environment.LOCKED_USER_PASSWORD) {
      context.addIssue({
        code: 'custom',
        path: ['LOCKED_USER_PASSWORD'],
        message: 'LOCKED_USER_PASSWORD là bắt buộc khi LOCKED_USER_EMAIL được cấu hình',
      });
    }

    if (environment.LOCKED_USER_PASSWORD && !environment.LOCKED_USER_EMAIL) {
      context.addIssue({
        code: 'custom',
        path: ['LOCKED_USER_EMAIL'],
        message: 'LOCKED_USER_EMAIL là bắt buộc khi LOCKED_USER_PASSWORD được cấu hình',
      });
    }

    if (environment.RUN_OTP_E2E) {
      const gmailKeys = [
        ['GMAIL_CLIENT_ID', environment.GMAIL_CLIENT_ID],
        ['GMAIL_CLIENT_SECRET', environment.GMAIL_CLIENT_SECRET],
        ['GMAIL_REFRESH_TOKEN', environment.GMAIL_REFRESH_TOKEN],
        ['OTP_MAILBOX_ADDRESS', environment.OTP_MAILBOX_ADDRESS],
        ['GMAIL_OTP_SENDER', environment.GMAIL_OTP_SENDER],
        ['GMAIL_OTP_SUBJECT', environment.GMAIL_OTP_SUBJECT],
        ['GMAIL_OTP_PATTERN', environment.GMAIL_OTP_PATTERN],
      ] as const;

      for (const [key, value] of gmailKeys) {
        if (value === undefined) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} là bắt buộc khi RUN_OTP_E2E được bật`,
          });
        }
      }
    }

    if (environment.RUN_MUTATING_E2E) {
      if (!environment.RUN_OTP_E2E) {
        context.addIssue({
          code: 'custom',
          path: ['RUN_MUTATING_E2E'],
          message: 'RUN_MUTATING_E2E yêu cầu RUN_OTP_E2E',
        });
      }

      if (
        !environment.RUN_PRODUCTION_REGISTRATION_E2E &&
        !environment.RUN_PRODUCTION_MUTATING_E2E
      ) {
        context.addIssue({
          code: 'custom',
          path: ['RUN_PRODUCTION_REGISTRATION_E2E'],
          message:
            'Bắt buộc phê duyệt riêng cho đăng ký production hoặc thao tác thay đổi dữ liệu tài khoản hiện có',
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
            message: `${key} là bắt buộc khi RUN_MUTATING_E2E được bật`,
          });
        }
      }
    }

    if (environment.ALLOW_MUTATING_E2E && !environment.RUN_PRODUCTION_MUTATING_E2E) {
      context.addIssue({
        code: 'custom',
        path: ['RUN_PRODUCTION_MUTATING_E2E'],
        message:
          'RUN_PRODUCTION_MUTATING_E2E=true là bắt buộc để thay đổi tin đăng trên môi trường production',
      });
    }
  });

export type ValidatedEnvironment = z.infer<typeof environmentSchema>;
