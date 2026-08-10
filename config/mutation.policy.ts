import type { EnvironmentConfig } from '../types/environment.types';

export const mutationBlockReason = (
  config: Pick<EnvironmentConfig, 'environment' | 'runMutatingTests'>,
): string | undefined => {
  if (config.environment === 'production') {
    return 'Mutating tests never run against production.';
  }
  if (!config.runMutatingTests) {
    return 'Set RUN_MUTATING_TESTS=true to run mutating tests on dev or staging.';
  }
  return undefined;
};
