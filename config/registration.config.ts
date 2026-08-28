import { z } from 'zod';

import type { ProductionRegistrationConfig } from '../types/otp.types';

const registrationSchema = z
  .object({
    REGISTRATION_EMAIL_TEMPLATE: z.string().trim().min(1),
    REGISTRATION_FULL_NAME: z.string().trim().min(1),
    REGISTRATION_PASSWORD: z.string().min(1),
  })
  .superRefine((data, context) => {
    const uniqueTokenCount = data.REGISTRATION_EMAIL_TEMPLATE.match(/\{unique\}/g)?.length ?? 0;
    if (uniqueTokenCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['REGISTRATION_EMAIL_TEMPLATE'],
        message: 'phải chứa đúng một token {unique}',
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

  return Object.freeze({
    fullName: parsed.data.REGISTRATION_FULL_NAME,
    emailTemplate: parsed.data.REGISTRATION_EMAIL_TEMPLATE,
    password: parsed.data.REGISTRATION_PASSWORD,
  });
};
