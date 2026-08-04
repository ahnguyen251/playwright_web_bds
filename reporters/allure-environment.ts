import type { EnvironmentConfig } from '../types/environment.types';

export const createAllureEnvironment = (
  config: EnvironmentConfig,
): Readonly<Record<string, string>> =>
  Object.freeze({
    'Test Environment': config.environment,
    'Base URL': config.baseUrl,
    'Node Version': process.version,
    Platform: process.platform,
  });
