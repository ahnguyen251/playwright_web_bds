import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentConfig } from './environment.config';
import type { EnvironmentConfig } from '../types/environment.types';

export const loadProcessEnvironmentConfig = (): EnvironmentConfig => {
  loadDotenv({ quiet: true });
  return loadEnvironmentConfig(process.env);
};
