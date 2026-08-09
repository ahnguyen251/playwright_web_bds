export type TestEnvironment = 'dev' | 'staging' | 'production';

export interface EnvironmentConfig {
  readonly environment: TestEnvironment;
  readonly baseUrl: string;
  readonly apiBaseUrl?: string;
  readonly defaultUserEmail: string;
  readonly defaultUserPassword: string;
  readonly ci: boolean;
  readonly allowMutatingE2E: boolean;
}
