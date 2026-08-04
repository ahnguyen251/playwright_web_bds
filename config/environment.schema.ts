import { z } from 'zod';

const absoluteUrl = z
  .string()
  .trim()
  .url()
  .transform((value) => new URL(value).toString());

export const environmentSchema = z.object({
  TEST_ENV: z.enum(['dev', 'staging', 'production']).default('production'),
  DEV_BASE_URL: absoluteUrl,
  STAGING_BASE_URL: absoluteUrl,
  PRODUCTION_BASE_URL: absoluteUrl,
  API_BASE_URL: absoluteUrl.optional(),
  DEFAULT_USER_EMAIL: z.string().trim().email().min(1),
  DEFAULT_USER_PASSWORD: z.string().min(1),
  CI: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type ValidatedEnvironment = z.infer<typeof environmentSchema>;
