import type { Page, Request, Response } from '@playwright/test';

import { AUTH_API_PATHS } from '../../constants/authentication';
import { TIMEOUTS } from '../../constants/timeouts';

export type AuthOperation = 'registration' | 'login' | 'forgotPassword';

export interface AuthResponseSnapshot {
  status: number;
  body: unknown;
}

type ActionOutcome = { type: 'completed' } | { type: 'failed'; error: unknown };
type ResponseOutcome =
  | { type: 'snapshot'; snapshot: AuthResponseSnapshot }
  | { type: 'invalidJson' }
  | { type: 'cancelled' };
type TimeoutOutcome = { type: 'timedOut' };

export class AuthRequestObserver {
  public constructor(
    private readonly page: Page,
    private readonly responseTimeoutMs: number = TIMEOUTS.assertion,
  ) {}

  public async countDuring(
    operation: AuthOperation,
    action: () => Promise<unknown>,
  ): Promise<number> {
    let count = 0;
    const listener = (request: Request): void => {
      if (this.isOperationRequest(request.url(), operation)) {
        count += 1;
      }
    };

    this.page.on('request', listener);
    try {
      await action();
      return count;
    } finally {
      this.page.off('request', listener);
    }
  }

  public async waitForResponse(
    operation: AuthOperation,
    action: () => Promise<unknown>,
  ): Promise<AuthResponseSnapshot> {
    let settleResponse: (outcome: ResponseOutcome) => void = () => undefined;
    let responseHandled = false;
    const responseOutcome = new Promise<ResponseOutcome>((resolve) => {
      settleResponse = resolve;
    });
    const listener = (response: Response): void => {
      if (responseHandled || !this.isOperationRequest(response.url(), operation)) {
        return;
      }
      responseHandled = true;
      void response
        .json()
        .then(
          (body: unknown) => {
            settleResponse({
              type: 'snapshot',
              snapshot: { status: response.status(), body },
            });
          },
          () => {
            settleResponse({ type: 'invalidJson' });
          },
        )
        .catch(() => {
          settleResponse({ type: 'invalidJson' });
        });
    };
    const actionOutcome = Promise.resolve()
      .then(action)
      .then(
        (): ActionOutcome => ({ type: 'completed' }),
        (error: unknown): ActionOutcome => ({ type: 'failed', error }),
      );
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutOutcome = new Promise<TimeoutOutcome>((resolve) => {
      timeoutId = setTimeout(() => resolve({ type: 'timedOut' }), this.responseTimeoutMs);
    });

    this.page.on('response', listener);
    try {
      const actionResult = await Promise.race([actionOutcome, timeoutOutcome]);
      if (actionResult.type === 'timedOut') {
        settleResponse({ type: 'cancelled' });
        throw this.createTimeoutError(operation);
      }
      if (actionResult.type === 'failed') {
        settleResponse({ type: 'cancelled' });
        throw actionResult.error;
      }

      const responseResult = await Promise.race([responseOutcome, timeoutOutcome]);
      if (responseResult.type === 'timedOut') {
        settleResponse({ type: 'cancelled' });
        throw this.createTimeoutError(operation);
      }
      if (responseResult.type === 'invalidJson') {
        throw new Error(`Unable to parse authentication response for ${operation}.`);
      }
      if (responseResult.type === 'cancelled') {
        throw this.createTimeoutError(operation);
      }

      return responseResult.snapshot;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      this.page.off('response', listener);
    }
  }

  private isOperationRequest(url: string, operation: AuthOperation): boolean {
    return new URL(url).pathname === AUTH_API_PATHS[operation];
  }

  private createTimeoutError(operation: AuthOperation): Error {
    return new Error(`Timed out waiting for ${operation} response at ${AUTH_API_PATHS[operation]}.`);
  }
}
