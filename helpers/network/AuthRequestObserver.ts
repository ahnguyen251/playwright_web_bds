import type { Page, Request, Response } from '@playwright/test';

import { AUTH_API_METHODS, AUTH_API_PATHS } from '../../constants/authentication';
import { TIMEOUTS } from '../../constants/timeouts';

export type AuthOperation = keyof typeof AUTH_API_PATHS;

export interface AuthResponseSnapshot {
  status: number;
  body: unknown;
}

export interface AuthStatusSnapshot {
  readonly status: number;
}

type ActionOutcome = { type: 'completed' } | { type: 'failed'; error: unknown };
type ResponseOutcome<TSnapshot> =
  { type: 'snapshot'; snapshot: TSnapshot } | { type: 'invalidResponse' } | { type: 'cancelled' };
interface TimeoutOutcome {
  type: 'timedOut';
}

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
      if (this.isOperationRequest(request.url(), request.method(), operation)) {
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
    return this.waitForObservedResponse(
      operation,
      action,
      (response) => response.json().then((body: unknown) => ({ status: response.status(), body })),
      `Unable to parse authentication response for ${operation}.`,
    );
  }

  public async waitForStatus(
    operation: AuthOperation,
    action: () => Promise<unknown>,
  ): Promise<AuthStatusSnapshot> {
    return this.waitForObservedResponse(
      operation,
      action,
      (response) => Promise.resolve(Object.freeze({ status: response.status() })),
      `Unable to observe authentication response for ${operation}.`,
    );
  }

  private async waitForObservedResponse<TSnapshot>(
    operation: AuthOperation,
    action: () => Promise<unknown>,
    createSnapshot: (response: Response) => Promise<TSnapshot>,
    invalidResponseMessage: string,
  ): Promise<TSnapshot> {
    let settleResponse: (outcome: ResponseOutcome<TSnapshot>) => void = () => undefined;
    let responseHandled = false;
    const responseOutcome = new Promise<ResponseOutcome<TSnapshot>>((resolve) => {
      settleResponse = resolve;
    });
    const listener = (response: Response): void => {
      if (
        responseHandled ||
        !this.isOperationRequest(response.url(), response.request().method(), operation)
      ) {
        return;
      }
      responseHandled = true;
      void Promise.resolve()
        .then(() => createSnapshot(response))
        .then(
          (snapshot) => {
            settleResponse({
              type: 'snapshot',
              snapshot,
            });
          },
          () => {
            settleResponse({ type: 'invalidResponse' });
          },
        );
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
      if (responseResult.type === 'invalidResponse') {
        throw new Error(invalidResponseMessage);
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

  private isOperationRequest(url: string, method: string, operation: AuthOperation): boolean {
    return (
      method === AUTH_API_METHODS[operation] && new URL(url).pathname === AUTH_API_PATHS[operation]
    );
  }

  private createTimeoutError(operation: AuthOperation): Error {
    return new Error(
      `Timed out waiting for ${operation} response at ${AUTH_API_PATHS[operation]}.`,
    );
  }
}
