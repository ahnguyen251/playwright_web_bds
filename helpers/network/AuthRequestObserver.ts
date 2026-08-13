import type { Page, Request, Response } from '@playwright/test';

import { AUTH_API_PATHS } from '../../constants/authentication';

export type AuthOperation = 'registration' | 'login' | 'forgotPassword';

export interface AuthResponseSnapshot {
  status: number;
  body: unknown;
}

export class AuthRequestObserver {
  public constructor(private readonly page: Page) {}

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
    let settleResponse: (snapshot: AuthResponseSnapshot) => void = () => undefined;
    let rejectResponse: (reason: unknown) => void = () => undefined;
    let responseHandled = false;
    const responseSnapshot = new Promise<AuthResponseSnapshot>((resolve, reject) => {
      settleResponse = resolve;
      rejectResponse = reject;
    });
    const listener = (response: Response): void => {
      if (responseHandled || !this.isOperationRequest(response.url(), operation)) {
        return;
      }
      responseHandled = true;
      void this.captureResponse(response, settleResponse, rejectResponse);
    };

    this.page.on('response', listener);
    try {
      await action();
      return await responseSnapshot;
    } finally {
      this.page.off('response', listener);
    }
  }

  private isOperationRequest(url: string, operation: AuthOperation): boolean {
    return new URL(url).pathname === AUTH_API_PATHS[operation];
  }

  private async captureResponse(
    response: Response,
    resolve: (snapshot: AuthResponseSnapshot) => void,
    reject: (reason: unknown) => void,
  ): Promise<void> {
    try {
      const body: unknown = await response.json();
      resolve({ status: response.status(), body });
    } catch (error: unknown) {
      reject(error);
    }
  }
}
